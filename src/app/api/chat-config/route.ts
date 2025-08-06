import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { getConfigManager } from '@/config/config-manager';

// Constants for validation
const MAX_MESSAGE_LENGTH = 10000;
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Initialize OpenAI client with error handling using config
const initializeOpenAI = (modelName?: string) => {
  try {
    const configManager = getConfigManager();
    
    // 如果指定了模型，获取该模型的配置
    if (modelName) {
      const modelConfig = configManager.getModelConfig(modelName);
      if (modelConfig) {
        return new OpenAI({
          apiKey: modelConfig.apiKey,
          baseURL: modelConfig.apiBase,
        });
      }
    }
    
    // 使用默认聊天模型的配置
    const defaultChatModel = configManager.getDefaultModel('chat');
    if (defaultChatModel) {
      const modelConfig = configManager.getModelConfig(defaultChatModel);
      if (modelConfig) {
        return new OpenAI({
          apiKey: modelConfig.apiKey,
          baseURL: modelConfig.apiBase,
        });
      }
    }
    
    // 回退到环境变量
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('No API key found in config or environment variables');
    }
    
    return new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });
  } catch (configError) {
    console.warn('Failed to load config, falling back to environment variables:', configError);
    
    // 回退到环境变量
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    
    return new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });
  }
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

// Helper function to convert File to base64
const fileToBase64 = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
};

export async function POST(request: NextRequest) {
  try {
    // Parse form data with error handling
    const formData = await request.formData();
    const message = formData.get('message') as string;
    const imageFile = formData.get('image') as File | null;
    const requestedModel = formData.get('model') as string | null;

    // Validate inputs
    const messageError = validateMessage(message);
    if (messageError) {
      return NextResponse.json({ error: messageError }, { status: 400 });
    }

    const imageError = validateImage(imageFile);
    if (imageError) {
      return NextResponse.json({ error: imageError }, { status: 400 });
    }

    if (!message && !imageFile) {
      return NextResponse.json(
        { error: 'Either message or image is required' },
        { status: 400 }
      );
    }

    // Determine model to use
    let modelToUse: string;
    try {
      const configManager = getConfigManager();
      
      if (requestedModel) {
        // 验证请求的模型是否存在
        const modelConfig = configManager.getModelConfig(requestedModel);
        if (modelConfig && modelConfig.roles && modelConfig.roles.includes('chat')) {
          modelToUse = requestedModel;
        } else {
          return NextResponse.json(
            { error: `Invalid or unsupported model: ${requestedModel}` },
            { status: 400 }
          );
        }
      } else {
        // 使用默认聊天模型
        modelToUse = configManager.getDefaultModel('chat') || 'gpt-4o-mini';
      }
    } catch (configError) {
      console.warn('Config error, falling back to environment variables:', configError);
      // 回退到环境变量逻辑
      modelToUse = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      
      if (requestedModel) {
        const modelListEnv = process.env.MODEL_LIST;
        if (modelListEnv) {
          const allowedModels = modelListEnv.split(',').map(m => m.trim());
          if (allowedModels.includes(requestedModel)) {
            modelToUse = requestedModel;
          } else {
            return NextResponse.json(
              { error: `Model ${requestedModel} not in allowed list` },
              { status: 400 }
            );
          }
        }
      }
    }

    // Initialize OpenAI client
    const openai = initializeOpenAI(modelToUse);

    // Prepare messages array
    const messages: ChatCompletionMessageParam[] = [];

    if (message && imageFile) {
      // Both text and image
      const base64Image = await fileToBase64(imageFile);
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: message,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${imageFile.type};base64,${base64Image}`,
            },
          },
        ],
      });
    } else if (imageFile) {
      // Image only
      const base64Image = await fileToBase64(imageFile);
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Please analyze this image.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${imageFile.type};base64,${base64Image}`,
            },
          },
        ],
      });
    } else {
      // Text only
      messages.push({
        role: 'user',
        content: message,
      });
    }

    // Get model configuration for parameters
    let modelParams = {};
    try {
      const configManager = getConfigManager();
      const modelConfig = configManager.getModelConfig(modelToUse);
      if (modelConfig) {
        modelParams = {
          temperature: modelConfig.temperature,
          max_tokens: modelConfig.maxTokens,
        };
      }
    } catch (configError) {
      console.warn('Could not load model config for parameters:', configError);
    }

    // Call OpenAI API with streaming
    const stream = await openai.chat.completions.create({
      model: modelToUse,
      messages,
      stream: true,
      ...modelParams,
    });

    // Create a ReadableStream to handle the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              const data = `data: ${JSON.stringify({ content, model: modelToUse })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Enhanced error handling
    let errorMessage = 'Failed to process chat request';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific error types
      if (error.message.includes('API key')) {
        statusCode = 401;
      } else if (error.message.includes('model')) {
        statusCode = 400;
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        statusCode = 429;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        model: 'unknown',
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  }
}
