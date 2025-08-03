import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client with error handling
const initializeOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  });
};

// Language mapping for better translation prompts
const getLanguageName = (code: string): string => {
  const languageMap: Record<string, string> = {
    'en': 'English',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'fr': 'French',
    'de': 'German',
    'es': 'Spanish',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ar': 'Arabic',
  };
  return languageMap[code] || code;
};

export async function POST(request: NextRequest) {
  try {
    // Initialize OpenAI client
    const openai = initializeOpenAI();

    // Parse request body
    const { text, sourceLang, targetLang, model } = await request.json();

    // Validate inputs
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    if (!targetLang || typeof targetLang !== 'string') {
      return NextResponse.json(
        { error: 'Target language is required' },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text too long (max 5000 characters)' },
        { status: 400 }
      );
    }

    // Prepare the translation prompt
    const targetLanguageName = getLanguageName(targetLang);
    let prompt: string;

    if (sourceLang === 'auto' || !sourceLang) {
      prompt = `Please translate the following text to ${targetLanguageName}. Only return the translation without any explanation or additional text:\n\n${text}`;
    } else {
      const sourceLanguageName = getLanguageName(sourceLang);
      prompt = `Please translate the following ${sourceLanguageName} text to ${targetLanguageName}. Only return the translation without any explanation or additional text:\n\n${text}`;
    }

    // Get the model to use
    const selectedModel = model || process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

    // Call OpenAI API with streaming
    const completion = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Provide accurate translations while preserving the original meaning, tone, and formatting. Only return the translated text without any explanations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent translations
      max_tokens: Math.min(text.length * 3, 2000), // Estimate based on input length
      stream: true, // Enable streaming
    });

    // Create a ReadableStream for streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let translatedText = '';
          
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              translatedText += content;
              
              // Send chunk data with complete text so far
              const data = JSON.stringify({
                type: 'chunk',
                content,
                translatedText, // This contains the complete text so far
              });
              
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          
          // Send completion data
          const completionData = JSON.stringify({
            type: 'complete',
            translatedText,
            sourceLang: sourceLang === 'auto' ? 'auto' : sourceLang,
            targetLang,
            model: selectedModel,
          });
          
          controller.enqueue(encoder.encode(`data: ${completionData}\n\n`));
          controller.close();
          
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = JSON.stringify({
            type: 'error',
            error: 'Translation failed during streaming',
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
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
    console.error('Translation error:', error);

    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'API configuration error' },
          { status: 500 }
        );
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded, please try again later' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Translation service temporarily unavailable' },
      { status: 500 }
    );
  }
}
