import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { voiceConfig, getRecognitionLanguage } from '@/config/voice';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const action = formData.get('action') as string;

    if (action === 'transcribe') {
      const audio = formData.get('audio') as File;
      if (!audio) {
        return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
      }

      try {
        // Speech to text using custom ASR model
        const language = formData.get('language') as string || 'zh';
        
        console.log('ASR Request:', { model: voiceConfig.asrModel, language: getRecognitionLanguage(language) });

        const transcriptionParams = {
          file: audio,
          model: voiceConfig.asrModel,
        };

        // 只有支持语言参数的模型才添加language
        const recognitionLang = getRecognitionLanguage(language);
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
      // Text to speech using custom TTS model
      const text = formData.get('text') as string;
      const voice = (formData.get('voice') as string) || voiceConfig.defaultVoice;
      
      if (!text) {
        return NextResponse.json({ error: 'No text provided' }, { status: 400 });
      }

      console.log('TTS Request:', { text, voice, model: voiceConfig.ttsModel });

      try {
        let audioBuffer;
        
        // 检查是否使用 SiliconFlow API (CosyVoice2 或 MOSS-TTSD)
        if (voiceConfig.ttsModel.includes('CosyVoice2') || voiceConfig.ttsModel.includes('MOSS-TTSD')) {
          // 使用 SiliconFlow API
          console.log('Using SiliconFlow TTS API');
          
          const requestBody = {
            model: voiceConfig.ttsModel,
            input: text,
            voice: voice.startsWith('FunAudioLLM/') ? voice : `FunAudioLLM/CosyVoice2-0.5B:${voice}`,
            response_format: 'mp3',
            speed: 1.0,
          };
          
          console.log('SiliconFlow TTS Request:', requestBody);
          
          const response = await fetch(`${process.env.OPENAI_BASE_URL}/audio/speech`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
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
        } else if (voiceConfig.ttsModel.includes('tts-') || voiceConfig.ttsModel === 'tts-1' || voiceConfig.ttsModel === 'tts-1-hd') {
          // 使用标准OpenAI TTS模型
          const mp3 = await openai.audio.speech.create({
            model: voiceConfig.ttsModel,
            voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
            input: text,
          });
          audioBuffer = Buffer.from(await mp3.arrayBuffer());
        } else {
          // 使用其他兼容的模型
          const mp3 = await openai.audio.speech.create({
            model: voiceConfig.ttsModel,
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
