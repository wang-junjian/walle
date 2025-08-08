import { getConfigManager, isReasoningModel, getReasoningConfig, getActualContextLimit } from '@/config/config-manager';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { debugLogger } from '@/utils/debug-logger';

// Constants for validation
const MAX_MESSAGE_LENGTH = 10000;
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Initialize OpenAI client with config
const initializeOpenAI = (modelConfig?: { apiKey?: string; apiBase?: string } | null) => {
  const configManager = getConfigManager();
  
  // If specific model config is provided, use it
  if (modelConfig && modelConfig.apiKey && modelConfig.apiBase) {
    return new OpenAI({
      apiKey: modelConfig.apiKey,
      baseURL: modelConfig.apiBase,
    });
  }
  
  // Otherwise, use the first available model's config
  const models = configManager.getAllModels();
  if (models.length > 0) {
    const firstModel = models[0];
    if (firstModel.apiKey && firstModel.apiBase) {
      return new OpenAI({
        apiKey: firstModel.apiKey,
        baseURL: firstModel.apiBase,
      });
    }
  }
  
  throw new Error('No valid API configuration found');
};

// Input validation helpers
const validateMessage = (message: string | null): string | null => {
  if (!message) return null;
  if (typeof message !== 'string') return 'Message must be a string';
  if (message.length > MAX_MESSAGE_LENGTH) return `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`;
  return null;
};

const validateImage = (imageFile: File | null): string | null => {
  if (!imageFile) return null;
  if (imageFile.size > MAX_IMAGE_SIZE) return `Image too large (max ${MAX_IMAGE_SIZE / 1024 / 1024}MB)`;
  if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) return `Unsupported image type (allowed: ${ALLOWED_IMAGE_TYPES.join(', ')})`;
  return null;
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // Declare variables that need to be accessible in error handling
  let modelToUse = 'GLM-4.5-Flash'; // Default model
  let modelConfig: {
    model: string;
    name?: string;
    provider: string;
    apiBase?: string;
    apiKey?: string;
    contextLength?: number;
    maxTokens?: number;
    temperature?: number;
    roles?: string[];
    isReasoningModel?: boolean;
    reasoningConfig?: {
      enableThinking?: boolean;
      thinkingBudget?: number;
    };
    contextLimitOverride?: number;
  } | null = null;
  
  try {
    debugLogger.info('CHAT_API', 'Chat API request started');
    
    // Parse form data with error handling
    const formData = await request.formData();
    const message = formData.get('message') as string;
    const imageFile = formData.get('image') as File | null;
    const conversationHistory = formData.get('history') as string;
    const selectedModel = formData.get('model') as string;

    debugLogger.logApiRequest('/api/chat', 'POST', {
      hasMessage: !!message,
      messageLength: message?.length || 0,
      hasImage: !!imageFile,
      imageSize: imageFile?.size || 0,
      selectedModel: selectedModel || 'default',
      hasHistory: !!conversationHistory
    });

    // Validate inputs
    const messageError = validateMessage(message);
    if (messageError) {
      debugLogger.warn('CHAT_API', 'Message validation failed', { error: messageError });
      return NextResponse.json({ error: messageError }, { status: 400 });
    }

    const imageError = validateImage(imageFile);
    if (imageError) {
      debugLogger.warn('CHAT_API', 'Image validation failed', { error: imageError });
      return NextResponse.json({ error: imageError }, { status: 400 });
    }

    if (!message && !imageFile) {
      debugLogger.warn('CHAT_API', 'No message or image provided');
      return NextResponse.json(
        { error: 'Either message or image is required' },
        { status: 400 }
      );
    }

    const configManager = getConfigManager();
    const allModels = configManager.getAllModels();
    
    // Determine which model to use
    modelToUse = 'GLM-4.5-Flash'; // Default model
    modelConfig = null;
    
    // If a specific model is selected and it exists in config, use it
    if (selectedModel) {
      const selectedModelConfig = allModels.find(m => m.model === selectedModel);
      if (selectedModelConfig) {
        modelToUse = selectedModel;
        modelConfig = selectedModelConfig;
      }
    } else {
      // Use first available model
      if (allModels.length > 0) {
        modelToUse = allModels[0].model;
        modelConfig = allModels[0];
      }
    }

    // Initialize OpenAI client with the selected model's config
    const openai = initializeOpenAI(modelConfig);
    
    debugLogger.info('CHAT_API', 'Model configuration', {
      selectedModel: modelToUse,
      apiBase: modelConfig?.apiBase,
      hasApiKey: !!modelConfig?.apiKey,
      provider: modelConfig?.provider
    });

    // Parse conversation history
    const baseMessages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are Walle, a helpful AI assistant. You can process text and images. 
        Be friendly, helpful, and provide clear, concise responses. 
        If you receive an image, describe what you see and provide relevant insights.`
      }
    ];

    // Add conversation history if provided
    if (conversationHistory) {
      try {
        const history = JSON.parse(conversationHistory);
        // Add previous messages (excluding system message and current user message)
        const previousMessages = history
          .filter((msg: { role: string }) => msg.role !== 'system')
          .map((msg: { role: string; content: string }) => ({
            role: msg.role,
            content: msg.content
          }));
        baseMessages.push(...previousMessages);
        debugLogger.debug('CHAT_API', 'Added conversation history', { 
          historyLength: previousMessages.length 
        });
      } catch (error) {
        debugLogger.error('CHAT_API', 'Error parsing conversation history', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    // Handle text + optional image
    if (imageFile) {
      // Convert image to base64
      const imageBuffer = await imageFile.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const imageUrl = `data:${imageFile.type};base64,${base64Image}`;

      baseMessages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: message || 'What do you see in this image?'
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high'
            }
          }
        ]
      });
    } else {
      baseMessages.push({
        role: 'user',
        content: message
      });
    }

    // Calculate safe max_tokens based on model's context length and input
    const calculateSafeMaxTokens = (modelConfig: { contextLength?: number; maxTokens?: number } | null, inputTokensEstimate: number = 100) => {
      const contextLength = modelConfig?.contextLength || 4096;
      const configuredMaxTokens = modelConfig?.maxTokens || 1000;
      
      // 从配置中获取实际的上下文限制
      const actualContextLimit = getActualContextLimit(modelToUse);
      
      // Reserve tokens for input, safety margin, and ensure we don't exceed actual limits
      const maxOutputTokens = Math.max(
        Math.min(
          configuredMaxTokens, 
          actualContextLimit - inputTokensEstimate - 200, // More conservative margin
          8192 // Conservative max for most models
        ),
        100 // Minimum output tokens
      );
      
      debugLogger.debug('CHAT_API', 'Token calculation', {
        model: modelToUse,
        contextLength,
        actualContextLimit,
        configuredMaxTokens,
        inputTokensEstimate,
        calculatedMaxTokens: maxOutputTokens
      });
      
      return maxOutputTokens;
    };

    // Estimate input tokens (rough approximation: 1 token ≈ 4 characters)
    const inputText = baseMessages.map(msg => 
      typeof msg.content === 'string' ? msg.content : 
      Array.isArray(msg.content) ? msg.content.map(c => c.type === 'text' ? c.text || '' : '').join('') : ''
    ).join(' ');
    const estimatedInputTokens = Math.ceil(inputText.length / 4);

    const safeMaxTokens = calculateSafeMaxTokens(modelConfig, estimatedInputTokens);

    // Call OpenAI API with streaming
    const requestOptions: Record<string, unknown> = {
      model: modelToUse, // Use the selected or configured model
      messages: baseMessages,
      max_tokens: safeMaxTokens,
      temperature: modelConfig?.temperature || 0.7,
      stream: true,
    };

    // 检查是否是推理模型，从配置中获取
    const isReasoning = isReasoningModel(modelToUse);
    
    if (isReasoning) {
      const reasoningConfig = getReasoningConfig(modelToUse);
      
      // 根据配置决定是否启用 thinking 功能
      if (reasoningConfig.enableThinking) {
        requestOptions.enable_thinking = true;
      }
      
      // 设置 thinking budget
      if (reasoningConfig.thinkingBudget) {
        requestOptions.thinking_budget = reasoningConfig.thinkingBudget;
      }
      
      debugLogger.info('CHAT_API', 'Enabled reasoning mode', { 
        model: modelToUse,
        enable_thinking: requestOptions.enable_thinking,
        thinking_budget: requestOptions.thinking_budget
      });
    }

    // 参数验证
    if (safeMaxTokens <= 0) {
      throw new Error(`Invalid max_tokens: ${safeMaxTokens}`);
    }
    
    if (!modelConfig?.apiKey) {
      throw new Error(`No API key found for model: ${modelToUse}`);
    }
    
    if (!modelConfig?.apiBase) {
      throw new Error(`No API base URL found for model: ${modelToUse}`);
    }

    // Log model call input
    debugLogger.logModelCall(modelToUse, {
      messages: baseMessages,
      ...requestOptions
    });

    debugLogger.info('CHAT_API', 'Making API request', {
      model: modelToUse,
      apiBase: modelConfig?.apiBase,
      requestOptionsKeys: Object.keys(requestOptions),
      messagesCount: baseMessages.length
    });

    const stream = await openai.chat.completions.create(requestOptions as unknown as OpenAI.ChatCompletionCreateParams);

    // Track timing and tokens for statistics
    let inputTokens = 0;
    let outputTokens = 0;
    let fullResponse = '';  // Track full response for logging

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // 确保是流式响应
          if (Symbol.asyncIterator in stream) {
            for await (const chunk of stream) {
              const delta = chunk.choices[0]?.delta;
              
              // Handle usage information if available
              if (chunk.usage) {
                inputTokens = chunk.usage.prompt_tokens || 0;
                outputTokens = chunk.usage.completion_tokens || 0;
              }
              
              // Handle reasoning content for thinking models
              // 在流式响应中，reasoning_content 应该在 delta 中
              const reasoningContent = (delta as Record<string, unknown>)?.reasoning_content as string;
              
              if (reasoningContent) {
                const reasoningData = JSON.stringify({
                  type: 'reasoning',
                  reasoning_content: reasoningContent,
                });
                controller.enqueue(encoder.encode(`data: ${reasoningData}\n\n`));
                debugLogger.logStreamEvent('reasoning_content', { 
                  contentLength: reasoningContent.length 
                });
              }
              
              if (delta?.content) {
                fullResponse += delta.content;  // Accumulate response
                // Send the content chunk
                const data = JSON.stringify({
                  type: 'content',
                  content: delta.content,
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                debugLogger.logStreamEvent('content_chunk', { 
                  chunkLength: delta.content.length 
                });
              }
              
              // Check if this is the last chunk
              if (chunk.choices[0]?.finish_reason) {
                const endTime = Date.now();
                const duration = (endTime - startTime) / 1000; // Convert to seconds
                const tokensPerSecond = outputTokens > 0 ? (outputTokens / duration).toFixed(2) : '0';
                
                // Log model call completion
                debugLogger.logModelCall(modelToUse, {
                  messages: baseMessages,
                  ...requestOptions
                }, {
                  content: fullResponse,
                  inputTokens,
                  outputTokens,
                  totalTokens: inputTokens + outputTokens,
                  duration: duration.toFixed(2),
                  tokensPerSecond,
                  finishReason: chunk.choices[0].finish_reason
                });
                
                debugLogger.logPerformance('chat_completion', endTime - startTime, {
                  model: modelToUse,
                  inputTokens,
                  outputTokens,
                  tokensPerSecond
                });
                
                // Send final statistics
                const statsData = JSON.stringify({
                  type: 'stats',
                  inputTokens,
                  outputTokens,
                  totalTokens: inputTokens + outputTokens,
                  duration: duration.toFixed(2),
                  tokensPerSecond,
                  finishReason: chunk.choices[0].finish_reason
                });
                controller.enqueue(encoder.encode(`data: ${statsData}\n\n`));
                
                // Send end signal
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
              }
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          debugLogger.error('CHAT_API', 'Streaming error', { 
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          });
          const errorData = JSON.stringify({
            type: 'error',
            error: 'Streaming failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    const endTime = Date.now();
    debugLogger.logPerformance('chat_api_total', endTime - startTime);
    debugLogger.error('CHAT_API', 'Chat API error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      debugLogger.error('CHAT_API', 'OpenAI API error', {
        status: error.status,
        message: error.message,
        type: error.type,
        code: (error as unknown as { code?: string })?.code,
        param: (error as unknown as { param?: string })?.param,
        model: modelToUse,
        apiBase: modelConfig?.apiBase
      });
      
      // Provide more specific error messages based on status code
      let errorMessage = 'AI service error';
      let statusCode = 500;
      
      if (error.status === 400) {
        errorMessage = 'Invalid request format or parameters';
        statusCode = 400;
      } else if (error.status === 401) {
        errorMessage = 'Invalid API key or authentication failed';
        statusCode = 401;
      } else if (error.status === 403) {
        errorMessage = 'Access forbidden - check your API permissions';
        statusCode = 403;
      } else if (error.status === 404) {
        errorMessage = 'Model or endpoint not found';
        statusCode = 404;
      } else if (error.status === 429) {
        errorMessage = 'Rate limit exceeded - please try again later';
        statusCode = 429;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: error.message,
          model: modelToUse,
          status: error.status
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
