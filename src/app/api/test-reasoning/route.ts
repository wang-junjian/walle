import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Create a mock stream that simulates DeepSeek-R1 reasoning + content
    const encoder = new TextEncoder();
    
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Simulate reasoning chunks
          const reasoningChunks = [
            "这是一个关于递归的问题。",
            "让我思考一下递归的本质。",
            "递归是一种编程技术，",
            "其中函数调用自身来解决问题。",
            "我需要解释清楚递归的概念和提供一个例子。"
          ];
          
          // Send reasoning chunks
          for (const chunk of reasoningChunks) {
            const data = JSON.stringify({
              type: 'reasoning',
              reasoning: chunk,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay
          }
          
          // Send content chunks
          const contentChunks = [
            "递归",
            "是一种",
            "编程技术，",
            "其中函数",
            "调用自身",
            "来解决问题。",
            "\n\n",
            "例如，",
            "计算阶乘：",
            "\n```python\n",
            "def factorial(n):\n",
            "    if n <= 1:\n",
            "        return 1\n",
            "    return n * factorial(n-1)\n",
            "```"
          ];
          
          for (const chunk of contentChunks) {
            const data = JSON.stringify({
              type: 'content',
              content: chunk,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
          }
          
          // Send stats
          const statsData = JSON.stringify({
            type: 'stats',
            inputTokens: 25,
            outputTokens: 85,
            totalTokens: 110,
            duration: '2.5',
            tokensPerSecond: '34.0',
            finishReason: 'stop'
          });
          controller.enqueue(encoder.encode(`data: ${statsData}\n\n`));
          
          // Send end signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Mock streaming error:', error);
          const errorData = JSON.stringify({
            type: 'error',
            error: 'Mock streaming failed',
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
    console.error('Mock chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
