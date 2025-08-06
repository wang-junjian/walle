// 语音配置 - 静态配置避免构建时文件系统依赖
const voiceConfig = {
  asrModel: 'whisper-1',
  ttsModel: 'tts-1',
  
  get voices() {
    // 基于 SiliconFlow 支持的预置语音
    return [
      { id: 'anna', name: '沉稳女声 (Anna)' },
      { id: 'bella', name: '激情女声 (Bella)' },
      { id: 'claire', name: '温柔女声 (Claire)' },
      { id: 'diana', name: '欢快女声 (Diana)' },
      { id: 'alex', name: '沉稳男声 (Alex)' },
      { id: 'benjamin', name: '低沉男声 (Benjamin)' },
      { id: 'charles', name: '磁性男声 (Charles)' },
      { id: 'david', name: '欢快男声 (David)' }
    ];
  },
  
  defaultVoice: 'anna',
  
  get languages() {
    return {
      zh: 'zh',
      en: 'en',
    };
  },
  
  get recording() {
    // 返回默认录音配置
    return {
      maxDuration: 60000,
      sampleRate: 16000,
      format: 'webm'
    };
  },
};

// 兼容性函数 - 实现在新配置系统中
export function getRecognitionLanguage(language?: string) {
  return language || 'auto';
}

export function getAvailableVoices() {
  return voiceConfig.voices;
}

export { voiceConfig };
