import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const message = formData.get('message') as string;
    const imageFile = formData.get('image') as File | null;
    const conversationHistory = formData.get('history') as string;
    const selectedModel = formData.get('model') as string;

    if (!message && !imageFile) {
      return NextResponse.json(
        { error: 'Message or image is required' },
        { status: 400 }
      );
    }

    // Determine which model to use
    let modelToUse = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    
    // If a specific model is selected and it's in the allowed list, use it
    if (selectedModel) {
      const modelListEnv = process.env.MODEL_LIST;
      if (modelListEnv) {
        const allowedModels = modelListEnv.split(',').map(m => m.trim());
        if (allowedModels.includes(selectedModel)) {
          modelToUse = selectedModel;
        }
      }
    }

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
      } catch (error) {
        console.error('Error parsing conversation history:', error);
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

    // Call OpenAI API with streaming
    const requestOptions: Record<string, unknown> = {
      model: modelToUse, // Use the selected or configured model
      messages: baseMessages,
      max_tokens: 1000,
      temperature: 0.7,
      stream: true,
    };

    // 检查是否是推理模型，根据 SiliconFlow 官方文档
    // 只包含实际支持的推理模型
    const reasoningModels = [
      'Qwen/QwQ-32B', 
      'Qwen/Qwen3-235B-A22B-Thinking-2507',
      'THUDM/GLM-4.1V-9B-Thinking',
    ];
    const isReasoningModel = reasoningModels.includes(modelToUse);
    
    if (isReasoningModel) {
      // enable_thinking 仅适用于 Qwen3 和 Hunyuan 模型
      if (modelToUse.includes('Qwen3') || modelToUse.includes('Hunyuan')) {
        requestOptions.enable_thinking = true;
      }
      // thinking_budget 适用于所有推理模型
      requestOptions.thinking_budget = 4096;
      console.log(`启用推理模式，模型: ${modelToUse}`);
    }

    const stream = await openai.chat.completions.create(requestOptions as unknown as OpenAI.ChatCompletionCreateParams);

    // Track timing and tokens for statistics
    const startTime = Date.now();
    let inputTokens = 0;
    let outputTokens = 0;

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
                // console.log('发送推理内容:', reasoningContent.substring(0, 100) + '...');
              }
              
              if (delta?.content) {
                // Send the content chunk
                const data = JSON.stringify({
                  type: 'content',
                  content: delta.content,
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
              
              // Check if this is the last chunk
              if (chunk.choices[0]?.finish_reason) {
                const endTime = Date.now();
                const duration = (endTime - startTime) / 1000; // Convert to seconds
                const tokensPerSecond = outputTokens > 0 ? (outputTokens / duration).toFixed(2) : '0';
                
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
    console.error('Chat API error:', error);
    
    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { 
          error: 'AI service error', 
          details: error.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
