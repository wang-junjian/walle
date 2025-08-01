import { NextResponse } from 'next/server';
import { voiceConfig } from '@/config/voice';

export async function GET() {
  return NextResponse.json({
    voiceConfig: {
      asrModel: voiceConfig.asrModel,
      ttsModel: voiceConfig.ttsModel,
      defaultVoice: voiceConfig.defaultVoice,
      voices: voiceConfig.voices,
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
