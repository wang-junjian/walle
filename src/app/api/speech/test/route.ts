import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { voiceConfig } from '@/config/voice';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export async function GET() {
  try {
    // 测试简单的文字转语音
    const testText = "你好，这是一个语音测试。";
    
    console.log('Testing TTS with:', {
      model: voiceConfig.ttsModel,
      text: testText,
      defaultVoice: voiceConfig.defaultVoice
    });

    let audioBuffer;
    
    // 检查是否使用 SiliconFlow API
    if (voiceConfig.ttsModel.includes('CosyVoice2') || voiceConfig.ttsModel.includes('MOSS-TTSD')) {
      // 使用 SiliconFlow API
      const requestBody = {
        model: voiceConfig.ttsModel,
        input: testText,
        voice: voiceConfig.defaultVoice.startsWith('FunAudioLLM/') ? 
               voiceConfig.defaultVoice : 
               `FunAudioLLM/CosyVoice2-0.5B:anna`,
        response_format: 'mp3',
        speed: 1.0,
      };
      
      console.log('SiliconFlow TTS Test Request:', requestBody);
      
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
        throw new Error(`SiliconFlow TTS failed: ${response.status} ${errorText}`);
      }
      
      audioBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      // 使用标准 OpenAI API
      let mp3;
      if (voiceConfig.ttsModel.includes('tts-') || voiceConfig.ttsModel === 'tts-1' || voiceConfig.ttsModel === 'tts-1-hd') {
        mp3 = await openai.audio.speech.create({
          model: voiceConfig.ttsModel,
          voice: 'alloy',
          input: testText,
        });
      } else {
        mp3 = await openai.audio.speech.create({
          model: voiceConfig.ttsModel,
          voice: 'alloy',
          input: testText,
        });
      }
      audioBuffer = Buffer.from(await mp3.arrayBuffer());
    }
    
    const isStandardModel = voiceConfig.ttsModel.includes('tts-') || voiceConfig.ttsModel === 'tts-1' || voiceConfig.ttsModel === 'tts-1-hd';
    const isSiliconFlowModel = voiceConfig.ttsModel.includes('CosyVoice2') || voiceConfig.ttsModel.includes('MOSS-TTSD');
    
    return NextResponse.json({
      success: true,
      message: 'TTS test successful',
      audioSize: audioBuffer.length,
      config: {
        model: voiceConfig.ttsModel,
        apiType: isSiliconFlowModel ? 'SiliconFlow' : (isStandardModel ? 'OpenAI' : 'Unknown'),
        voice: voiceConfig.defaultVoice,
        baseUrl: process.env.OPENAI_BASE_URL || 'default'
      }
    });
  } catch (error) {
    console.error('TTS Test Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        model: voiceConfig.ttsModel,
        hasApiKey: !!process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL || 'default'
      }
    }, { status: 500 });
  }
}
