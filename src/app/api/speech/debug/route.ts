import { NextResponse } from 'next/server';

export async function GET() {
  // 直接返回静态配置，避免模块导入问题
  return NextResponse.json({
    voiceConfig: {
      asrModel: 'whisper-1',
      ttsModel: 'tts-1',
      defaultVoice: 'anna',
      voices: [
        { id: 'anna', name: '沉稳女声 (Anna)' },
        { id: 'bella', name: '激情女声 (Bella)' },
        { id: 'claire', name: '温柔女声 (Claire)' },
        { id: 'diana', name: '欢快女声 (Diana)' },
        { id: 'alex', name: '沉稳男声 (Alex)' },
        { id: 'benjamin', name: '低沉男声 (Benjamin)' },
        { id: 'charles', name: '磁性男声 (Charles)' },
        { id: 'david', name: '欢快男声 (David)' }
      ]
    },
    environment: {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      openAIBaseURL: process.env.OPENAI_BASE_URL || 'default',
      asrModelEnv: process.env.ASR_MODEL || 'not set',
      ttsModelEnv: process.env.NEXT_PUBLIC_TTS_MODEL || 'not set',
    },
    timestamp: new Date().toISOString(),
  });
}
