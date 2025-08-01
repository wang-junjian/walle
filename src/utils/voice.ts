export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Cannot access microphone. Please check microphone permissions.');
    }
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}

export async function transcribeAudio(audioBlob: Blob, language?: string): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('action', 'transcribe');
    if (language) {
      formData.append('language', language);
    }

    const response = await fetch('/api/speech', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      // 尝试解析错误信息
      let errorMessage = 'Speech-to-text failed';
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // 如果无法解析JSON，使用默认错误信息
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Speech-to-text error:', error);
    throw error; // 重新抛出错误以便调用者处理
  }
}

export async function synthesizeSpeech(text: string, voice: string = 'anna'): Promise<Blob> {
  try {
    console.log('Synthesizing speech:', { text: text.substring(0, 50) + '...', voice });
    
    const formData = new FormData();
    formData.append('text', text);
    formData.append('voice', voice);
    formData.append('action', 'synthesize');

    const response = await fetch('/api/speech', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      // 尝试解析错误信息
      let errorMessage = 'Text-to-speech failed';
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // 如果无法解析JSON，使用默认错误信息
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      console.error('TTS API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorMessage,
        text: text.substring(0, 100),
        voice
      });
      
      throw new Error(errorMessage);
    }

    const blob = await response.blob();
    console.log('TTS Success:', { blobSize: blob.size, blobType: blob.type });
    return blob;
  } catch (error) {
    console.error('Text-to-speech error:', error);
    throw error; // 重新抛出错误以便调用者处理
  }
}

// 音频播放管理器
class AudioManager {
  private currentAudio: HTMLAudioElement | null = null;
  private currentAudioUrl: string | null = null;
  private currentResolve: (() => void) | null = null;
  private currentReject: ((error: Error) => void) | null = null;

  play(audioBlob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 停止当前播放的音频
        this.stop();

        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        this.currentAudio = audio;
        this.currentAudioUrl = audioUrl;
        this.currentResolve = resolve;
        this.currentReject = reject;
        
        audio.onended = () => {
          this.cleanup();
          resolve();
        };
        
        audio.onerror = (error) => {
          this.cleanup();
          console.error('Failed to play audio:', error);
          reject(new Error('音频播放失败'));
        };
        
        audio.play().catch(error => {
          this.cleanup();
          console.error('Failed to play audio:', error);
          reject(new Error('音频播放失败，可能需要用户交互才能播放'));
        });
      } catch (error) {
        console.error('Failed to create audio URL:', error);
        reject(new Error('创建音频对象失败'));
      }
    });
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }
    
    // 如果有pending的Promise，resolve它
    if (this.currentResolve) {
      this.currentResolve();
    }
    
    this.cleanup();
  }

  isPlaying(): boolean {
    return Boolean(this.currentAudio && !this.currentAudio.paused && !this.currentAudio.ended);
  }

  private cleanup(): void {
    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
      this.currentAudioUrl = null;
    }
    this.currentAudio = null;
    this.currentResolve = null;
    this.currentReject = null;
  }
}

// 全局音频管理器实例
const audioManager = new AudioManager();

export function playAudio(audioBlob: Blob): Promise<void> {
  return audioManager.play(audioBlob);
}

export function stopAudio(): void {
  audioManager.stop();
}

export function isAudioPlaying(): boolean {
  return audioManager.isPlaying();
}
