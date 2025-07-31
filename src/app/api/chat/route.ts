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

    if (!message && !imageFile) {
      return NextResponse.json(
        { error: 'Message or image is required' },
        { status: 400 }
      );
    }

    // Parse conversation history
    let messages: OpenAI.ChatCompletionMessageParam[] = [
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
          .filter((msg: any) => msg.role !== 'system')
          .map((msg: any) => ({
            role: msg.role,
            content: msg.content
          }));
        messages.push(...previousMessages);
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

      messages.push({
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
      messages.push({
        role: 'user',
        content: message
      });
    }

    // Call OpenAI API with streaming
    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini', // Use configured model from env
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7,
      stream: true,
    });

    // Track timing and tokens for statistics
    const startTime = Date.now();
    let inputTokens = 0;
    let outputTokens = 0;

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            
            // Handle usage information if available
            if (chunk.usage) {
              inputTokens = chunk.usage.prompt_tokens || 0;
              outputTokens = chunk.usage.completion_tokens || 0;
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
