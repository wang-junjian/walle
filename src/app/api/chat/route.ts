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
    const enableSearch = formData.get('enableSearch') === 'true';
    const enableCodeExecution = formData.get('enableCodeExecution') === 'true';

    // Track enabled tools for logging
    const enabledTools: string[] = [];
    if (enableSearch) enabledTools.push('web_search');
    if (enableCodeExecution) enabledTools.push('code_execution');

    debugLogger.logApiRequest('/api/chat', 'POST', {
      hasMessage: !!message,
      messageLength: message?.length || 0,
      hasImage: !!imageFile,
      imageSize: imageFile?.size || 0,
      selectedModel: selectedModel || 'default',
      hasHistory: !!conversationHistory,
      enableSearch,
      enableCodeExecution,
      enabledTools: enabledTools.join(', ') || 'none'
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
    let systemContent = `You are Walle, a helpful AI assistant. You can process text and images. 
        Be friendly, helpful, and provide clear, concise responses. 
        If you receive an image, describe what you see and provide relevant insights.`;
    
    // Add tool capabilities to system message if enabled
    if (enableSearch) {
      systemContent += `\n\n🔍 SEARCH CAPABILITY ENABLED:
You have access to web search functionality. When users ask questions that would benefit from current information, recent data, or specific facts, you should:
1. Use web search to find relevant, up-to-date information
2. Provide accurate answers based on search results
3. Cite sources when possible`;
    }
    
    if (enableCodeExecution) {
      systemContent += `\n\n⚡ CODE EXECUTION CAPABILITY ENABLED:
You have access to secure code execution in multiple languages (JavaScript, Python, SQL, Shell). When users need:
1. Code examples or demonstrations
2. Mathematical calculations or data processing
3. Algorithm implementations
4. Data analysis or transformations
You should write and execute appropriate code to solve their problems. Always explain what the code does and show the results.`;
    }

    const baseMessages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemContent
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

    // 新的智能决策流程：先判断是否需要代码执行
    let needsCodeExecution = false;
    
    if (enableCodeExecution && message) {
      try {
        // 使用智能决策引擎判断是否需要代码执行
        const { getDecisionEngine } = await import('@/utils/intelligent-decision-engine');
        const decisionEngine = getDecisionEngine();
        const decision = await decisionEngine.analyzeUserRequest(message);
        needsCodeExecution = decision.toolsRequired.includes('code_execution');
        
        debugLogger.info('CHAT_API', 'Code execution decision', {
          message: message.substring(0, 100),
          needsCodeExecution,
          reasoning: decision.reasoning,
          confidence: decision.confidence
        });
        
        if (needsCodeExecution) {
          // 如果需要代码执行，直接开始流式响应，包含代码生成过程
          return await handleCodeExecutionWithStreaming(
            request,
            openai,
            modelToUse,
            modelConfig,
            baseMessages,
            message,
            conversationHistory,
            enableSearch,
            enableCodeExecution
          );
        }
      } catch (error) {
        debugLogger.error('CHAT_API', 'Code execution decision/generation failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // 继续正常流程，不中断用户体验
      }
    }

    // 构建最终的用户消息
    const finalUserMessage = message;

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
            text: finalUserMessage || 'What do you see in this image?'
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
        content: finalUserMessage
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
                  finishReason: chunk.choices[0].finish_reason,
                  codeExecuted: needsCodeExecution
                });
                
                debugLogger.logPerformance('chat_completion', endTime - startTime, {
                  model: modelToUse,
                  inputTokens,
                  outputTokens,
                  tokensPerSecond,
                  codeExecuted: needsCodeExecution
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

// 处理代码执行的流式响应 - 简化用户体验版本
async function handleCodeExecutionWithStreaming(
  _request: NextRequest,
  openai: OpenAI,
  modelToUse: string,
  modelConfig: { maxTokens?: number; temperature?: number } | null,
  baseMessages: OpenAI.ChatCompletionMessageParam[],
  message: string,
  _conversationHistory: string,
  _enableSearch: boolean,
  _enableCodeExecution: boolean
) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 动态导入代码执行工具
        const { codeExecutionTool } = await import('@/utils/real-tools');
        
        // 1. 后台生成代码（不展示给用户）
        const codeGenerationPrompt = `
你是一个代码生成专家。用户提出了以下问题，需要编写代码来解决：

用户问题：「${message}」

请分析问题并生成适当的JavaScript代码来解决。要求：
1. 如果是字符串处理问题（如统计字符数量），请直接处理字符串
2. 如果是数学计算问题，请准确计算
3. 使用const/let定义变量，包含console.log输出结果
4. 代码简洁可读
5. 重要：不要包含任何markdown格式，不要使用\`\`\`javascript标记
6. 只返回纯JavaScript代码，不要任何格式化标记

示例：
const str = "test string";
const count = str.length;
console.log(count);

请只返回可执行的JavaScript代码：`;

        const codeGenerationMessages: OpenAI.ChatCompletionMessageParam[] = [
          { role: 'user', content: codeGenerationPrompt }
        ];

        // 后台生成代码（不流式显示）
        const codeResponse = await openai.chat.completions.create({
          model: modelToUse,
          messages: codeGenerationMessages,
          max_tokens: 1000,
          temperature: 0.3,
          stream: false
        });

        let generatedCode = codeResponse.choices[0]?.message?.content?.trim() || '';
        
        // 清理代码：移除可能的markdown格式
        generatedCode = generatedCode.replace(/^```javascript\s*/i, '');
        generatedCode = generatedCode.replace(/^```js\s*/i, '');
        generatedCode = generatedCode.replace(/^```\s*/i, '');
        generatedCode = generatedCode.replace(/\s*```\s*$/i, '');
        generatedCode = generatedCode.replace(/\n\s*\n\s*\n/g, '\n\n');
        generatedCode = generatedCode.trim();
        
        console.log('清理后的代码:', generatedCode);

        // 2. 后台执行代码
        let executionResult: { success?: boolean; result?: string; output?: string[]; error?: string } | null = null;
        let executionSuccess = false;
        
        if (generatedCode) {
          try {
            executionResult = await codeExecutionTool.execute({
              code: generatedCode,
              language: 'javascript',
              enableDebug: true
            });
            executionSuccess = executionResult?.success === true;
          } catch (error) {
            console.error('代码执行失败:', error);
            executionSuccess = false;
          }
        }

        // 3. 基于执行结果生成最终回答（流式显示）
        let finalPrompt = '';
        
        if (executionSuccess && executionResult) {
          const result = executionResult.result || '';
          const output = (executionResult as { output?: string[] }).output || [];
          
          finalPrompt = `用户问题：${message}

我已经编写并执行了代码来解决这个问题。

代码：
${generatedCode}

执行结果：${result}
控制台输出：${output.join('\n')}

请基于代码执行的结果，给出简洁明确的最终答案。如果用户想要查看代码实现过程，可以展开查看详细信息。

格式要求：
- 先给出直接答案
- 然后可以选择性地添加一个可展开的详细过程部分`;
        } else {
          finalPrompt = `用户问题：${message}

代码执行遇到了问题，请直接分析并回答用户的问题。`;
        }

        // 构建最终消息
        const finalMessages: OpenAI.ChatCompletionMessageParam[] = [
          ...baseMessages.slice(0, -1), // 保留历史对话
          { role: 'user', content: finalPrompt }
        ];

        // 流式生成最终回答
        const finalStream = await openai.chat.completions.create({
          model: modelToUse,
          messages: finalMessages,
          max_tokens: modelConfig?.maxTokens || 1000,
          temperature: modelConfig?.temperature || 0.7,
          stream: true
        });

        // 直接流式输出最终回答，不显示技术过程
        for await (const chunk of finalStream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'content',
              content: content
            })}\n\n`));
          }
        }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();

      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          content: `处理过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}`
        })}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
