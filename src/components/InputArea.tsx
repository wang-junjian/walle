'use client';

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Mic, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { VoiceRecorder, transcribeAudio, getWebSpeechLanguage, isSpeechRecognitionSupported } from '@/utils/voice';

interface InputAreaProps {
  input: string;
  setInput: (value: string) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  currentLanguage?: string;
  isRecording: boolean;
  setIsRecording: (value: boolean) => void;
}

export function InputArea({
  input,
  setInput,
  selectedFile,
  setSelectedFile,
  onSendMessage,
  onKeyPress,
  isLoading,
  currentLanguage,
  isRecording,
  setIsRecording
}: InputAreaProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [voiceRecorder] = useState(() => new VoiceRecorder());
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState(''); // 只保留这一个临时状态
  const [useRealtimeTranscription, setUseRealtimeTranscription] = useState(true);
  
  // 使用 ref 来获取最新的 input 值
  const inputRef = useRef(input);
  inputRef.current = input;

  // 简化：只有用户输入 + 临时转录文本
  const displayText = input + (interimTranscript ? (input ? ' ' : '') + interimTranscript : '');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    }
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      // 停止录音
      try {
        if (useRealtimeTranscription && isSpeechRecognitionSupported()) {
          // 停止实时转录
          voiceRecorder.stopRealtimeRecording();
          
          // 将临时转录结果加入到用户输入中
          if (interimTranscript) {
            const currentInput = inputRef.current;
            setInput(currentInput + (currentInput ? ' ' : '') + interimTranscript);
          }
          
          // 清空临时转录
          setInterimTranscript('');
        } else {
          // 使用传统的录音+API转录方式
          setIsTranscribing(true);
          const audioBlob = await voiceRecorder.stopRecording();
          const transcribedText = await transcribeAudio(audioBlob, currentLanguage);
          const currentInput = inputRef.current;
          setInput(currentInput + (currentInput ? ' ' : '') + transcribedText);
        }
      } catch (error) {
        console.error('Voice recording error:', error);
        alert(error instanceof Error ? error.message : t('voice.transcriptionFailed'));
      } finally {
        setIsRecording(false);
        setIsTranscribing(false);
      }
    } else {
      // 开始录音
      try {
        // 清空临时转录
        setInterimTranscript('');
        
        if (useRealtimeTranscription && isSpeechRecognitionSupported()) {
          // 使用实时转录
          const webSpeechLang = getWebSpeechLanguage(currentLanguage || 'zh');
          
          await voiceRecorder.startRealtimeRecording(
            webSpeechLang,
            // 中间结果回调 - 只显示临时结果
            (transcript: string) => {
              setInterimTranscript(transcript);
            },
            // 最终结果回调 - 加入到用户输入中
            (transcript: string) => {
              const currentInput = inputRef.current;
              setInput(currentInput + (currentInput ? ' ' : '') + transcript);
              setInterimTranscript(''); // 清空临时结果
            }
          );
        } else {
          // 使用传统录音方式
          await voiceRecorder.startRecording();
        }
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
        if (error instanceof Error && error.message.includes('浏览器不支持')) {
          // 如果不支持实时转录，自动切换到传统方式
          setUseRealtimeTranscription(false);
          try {
            await voiceRecorder.startRecording();
            setIsRecording(true);
          } catch (fallbackError) {
            alert(fallbackError instanceof Error ? fallbackError.message : t('voice.permissionDenied'));
          }
        } else {
          alert(error instanceof Error ? error.message : t('voice.permissionDenied'));
        }
      }
    }
  };

  return (
    <div className="space-y-3">
      {selectedFile && (
        <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
          <ImageIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
            {selectedFile.name}
          </span>
          <button
            onClick={handleRemoveFile}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <div className="flex-1">
          <div className="relative">
            <textarea
              value={displayText}
              onChange={(e) => {
                const newValue = e.target.value;
                
                // 如果正在录音，不允许编辑
                if (isRecording) {
                  return;
                }
                
                // 正常处理所有输入，不区分来源
                setInput(newValue);
                
                // 如果用户开始编辑，清空临时的转录状态
                if (newValue !== displayText) {
                  setInterimTranscript('');
                }
              }}
              onKeyPress={onKeyPress}
              placeholder={isRecording ? t('voice.recording') + '...' : t('chat.typeMessage')}
              className={`w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:border-gray-500 dark:focus:ring-gray-500 ${
                isRecording ? 'ring-2 ring-red-200 dark:ring-red-800 border-red-300' : ''
              }`}
              rows={2}
              style={{ minHeight: '80px', maxHeight: '240px' }}
              disabled={isLoading}
              readOnly={isRecording}
            />
            
            {/* 实时转录状态指示器 */}
            {isRecording && useRealtimeTranscription && (
              <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm z-10">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span>{t('voice.recording')}</span>
              </div>
            )}
            
            {/* 转录文本标识 */}
            {interimTranscript && !isLoading && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs z-10">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs animate-pulse">
                  识别中 {interimTranscript.length}字
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex space-x-1">
          <button
            onClick={handleImageUpload}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
            disabled={isLoading}
            title={t('chat.uploadImage')}
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          
          <button
            onClick={handleVoiceToggle}
            className={`p-2 rounded-lg transition-colors relative ${
              isRecording
                ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
            disabled={isLoading || isTranscribing}
            title={isRecording ? t('voice.stopRecording') : t('voice.startRecording')}
          >
            {isTranscribing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Mic className={`h-5 w-5 ${isRecording ? 'animate-pulse' : ''}`} />
            )}
          </button>
          
          <button
            onClick={onSendMessage}
            disabled={!displayText.trim() && !selectedFile || isLoading}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={t('chat.sendMessage')}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
