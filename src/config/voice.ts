// 语音配置
export const voiceConfig = {
  // 语音识别模型 - 服务器端使用
  asrModel: process.env.ASR_MODEL || 'whisper-1',
  
  // 语音合成模型 - 服务器端使用
  ttsModel: process.env.NEXT_PUBLIC_TTS_MODEL || 'tts-1',
  
  // 支持的语音选项（根据您的模型调整）
  voices: [
    // CosyVoice2-0.5B 语音选项
    ...(process.env.NEXT_PUBLIC_TTS_MODEL?.includes('CosyVoice2') ? [
      { id: 'FunAudioLLM/CosyVoice2-0.5B:alex', name: 'Alex' },
      { id: 'FunAudioLLM/CosyVoice2-0.5B:anna', name: 'Anna' },
      { id: 'FunAudioLLM/CosyVoice2-0.5B:bella', name: 'Bella' },
      { id: 'FunAudioLLM/CosyVoice2-0.5B:benjamin', name: 'Benjamin' },
      { id: 'FunAudioLLM/CosyVoice2-0.5B:charles', name: 'Charles' },
      { id: 'FunAudioLLM/CosyVoice2-0.5B:claire', name: 'Claire' },
      { id: 'FunAudioLLM/CosyVoice2-0.5B:david', name: 'David' },
      { id: 'FunAudioLLM/CosyVoice2-0.5B:diana', name: 'Diana' },
    ] : [
      // 标准 OpenAI 语音 - 只保留英文人名
      { id: 'alloy', name: 'Alloy' },
      { id: 'echo', name: 'Echo' },
      { id: 'fable', name: 'Fable' },
      { id: 'onyx', name: 'Onyx' },
      { id: 'nova', name: 'Nova' },
      { id: 'shimmer', name: 'Shimmer' },
    ]),
  ],
  
  // 默认语音
  defaultVoice: process.env.NEXT_PUBLIC_TTS_MODEL?.includes('CosyVoice2') ? 'FunAudioLLM/CosyVoice2-0.5B:anna' : 'Anna',
  
  // 语音识别语言配置
  languages: {
    zh: 'zh',
    en: 'en',
  },
  
  // 录音配置
  recording: {
    maxDuration: 60000, // 最大录音时长（毫秒）
    mimeType: 'audio/webm;codecs=opus', // 录音格式
  },
};

// 根据用户语言获取语音识别语言设置
export function getRecognitionLanguage(userLang: string): string {
  const langMap = voiceConfig.languages[userLang as keyof typeof voiceConfig.languages];
  
  // 如果使用自定义模型，可能不需要语言参数，返回空字符串或'auto'
  if (voiceConfig.asrModel.includes('SenseVoice') || voiceConfig.asrModel.includes('FunAudioLLM')) {
    return 'auto'; // 或者根据模型文档返回适当的值
  }
  
  return langMap || 'auto';
}

// 获取可用的语音选项
export function getAvailableVoices() {
  return voiceConfig.voices;
}
