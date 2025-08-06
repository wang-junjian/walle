import { getConfigManager } from '@/config/config-manager';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client for speech operations
const initializeSpeechOpenAI = (speechConfig?: { apiKey?: string; apiBase?: string }) => {
  const configManager = getConfigManager();
  
  // If specific speech config is provided, use it
  if (speechConfig && speechConfig.apiKey && speechConfig.apiBase) {
    return new OpenAI({
      apiKey: speechConfig.apiKey,
      baseURL: speechConfig.apiBase,
    });
  }
  
  // Otherwise, use the first available model's config as fallback
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
  
  throw new Error('No valid speech API configuration found');
};

export async function POST(request: NextRequest) {
  try {
    const configManager = getConfigManager();
    const speechConfig = configManager.getSpeechConfig();
    
    console.log('Speech API Debug Info:', {
      hasSTT: !!speechConfig.speechToText,
      hasTTS: !!speechConfig.textToSpeech,
      sttModel: speechConfig.speechToText?.model,
      ttsModel: speechConfig.textToSpeech?.model,
    });

    const formData = await request.formData();
    const action = formData.get('action') as string;

    if (action === 'transcribe') {
      const audio = formData.get('audio') as File;
      if (!audio) {
        return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
      }

      try {
        if (!speechConfig.speechToText) {
          return NextResponse.json({ error: 'Speech-to-text not configured' }, { status: 500 });
        }

        // Initialize OpenAI client for STT
        const openai = initializeSpeechOpenAI(speechConfig.speechToText);

        // Speech to text using configured ASR model
        const language = formData.get('language') as string || 'zh';
        
        console.log('ASR Request:', { 
          model: speechConfig.speechToText.model, 
          language: language || 'auto' 
        });

        const transcriptionParams = {
          file: audio,
          model: speechConfig.speechToText.model,
        };

        // 只有支持语言参数的模型才添加language
        const recognitionLang = language || 'auto';
        if (recognitionLang && recognitionLang !== 'auto') {
          Object.assign(transcriptionParams, { language: recognitionLang });
        }

        const transcription = await openai.audio.transcriptions.create(transcriptionParams);

        return NextResponse.json({ text: transcription.text });
      } catch (asrError) {
        console.error('ASR Error:', asrError);
        return NextResponse.json({ error: `ASR failed: ${asrError instanceof Error ? asrError.message : 'Unknown error'}` }, { status: 500 });
      }
    } else if (action === 'synthesize') {
      // Text to speech using configured TTS model
      const text = formData.get('text') as string;
      const voice = ((formData.get('voice') as string) || 'anna').toLowerCase(); // 确保语音名称是小写
      
      if (!text) {
        return NextResponse.json({ error: 'No text provided' }, { status: 400 });
      }

      if (!speechConfig.textToSpeech) {
        return NextResponse.json({ error: 'Text-to-speech not configured' }, { status: 500 });
      }

      console.log('TTS Request:', { 
        text, 
        voice, 
        model: speechConfig.textToSpeech.model,
        apiBase: speechConfig.textToSpeech.apiBase 
      });

      try {
        let audioBuffer;
        
        // 检查是否使用 SiliconFlow API (CosyVoice2 或 MOSS-TTSD)
        if (speechConfig.textToSpeech.model.includes('CosyVoice2') || speechConfig.textToSpeech.model.includes('MOSS-TTSD')) {
          // 使用 SiliconFlow API
          console.log('Using SiliconFlow TTS API');
          
          const requestBody = {
            model: speechConfig.textToSpeech.model,
            input: text,
            voice: `${speechConfig.textToSpeech.model}:${voice}`,
            response_format: 'mp3',
            speed: 1.0,
          };
          
          console.log('SiliconFlow TTS Request:', requestBody);
          
          const response = await fetch(`${speechConfig.textToSpeech.apiBase}/audio/speech`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${speechConfig.textToSpeech.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('SiliconFlow TTS Error:', response.status, errorText);
            throw new Error(`SiliconFlow TTS failed: ${response.status} ${errorText}`);
          }
          
          audioBuffer = Buffer.from(await response.arrayBuffer());
        } else if (speechConfig.textToSpeech.model.includes('tts-') || speechConfig.textToSpeech.model === 'tts-1' || speechConfig.textToSpeech.model === 'tts-1-hd') {
          // 使用标准OpenAI TTS模型
          const openai = initializeSpeechOpenAI(speechConfig.textToSpeech);
          const mp3 = await openai.audio.speech.create({
            model: speechConfig.textToSpeech.model,
            voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
            input: text,
          });
          audioBuffer = Buffer.from(await mp3.arrayBuffer());
        } else {
          // 使用其他兼容的模型
          const openai = initializeSpeechOpenAI(speechConfig.textToSpeech);
          const mp3 = await openai.audio.speech.create({
            model: speechConfig.textToSpeech.model,
            voice: 'alloy',
            input: text,
          });
          audioBuffer = Buffer.from(await mp3.arrayBuffer());
        }
        
        return new NextResponse(audioBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length.toString(),
          },
        });
      } catch (ttsError) {
        console.error('TTS Error:', ttsError);
        return NextResponse.json({ error: `TTS failed: ${ttsError instanceof Error ? ttsError.message : 'Unknown error'}` }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Speech API error:', error);
    
    // 提供更详细的错误信息
    let errorMessage = 'Failed to process speech request';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
