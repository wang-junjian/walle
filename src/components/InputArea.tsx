'use client';

import React, { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Mic, Image as ImageIcon, X, Loader2, MessageSquare, Zap, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { VoiceRecorder, transcribeAudio, getWebSpeechLanguage, isSpeechRecognitionSupported } from '@/utils/voice';
import { AgentMode } from '@/types/chat';

// 定义模型接口
interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  roles: string[];
}

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
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  agentMode?: AgentMode;
  onAgentModeChange?: (mode: AgentMode) => void;
  onStopGeneration?: () => void;
}

export interface InputAreaRef {
  focus: () => void;
}

export const InputArea = forwardRef<InputAreaRef, InputAreaProps>(({
  input,
  setInput,
  selectedFile,
  setSelectedFile,
  onSendMessage,
  onKeyPress,
  isLoading,
  currentLanguage,
  isRecording,
  setIsRecording,
  selectedModel,
  onModelChange,
  agentMode,
  onAgentModeChange,
  onStopGeneration
}, ref) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [voiceRecorder] = useState(() => new VoiceRecorder());
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState(''); // 只保留这一个临时状态
  const [useRealtimeTranscription, setUseRealtimeTranscription] = useState(true);
  
  // 模型选择相关状态
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isModelsLoading, setIsModelsLoading] = useState(true);
  const [dropdownWidth, setDropdownWidth] = useState<number>(256); // 默认宽度 w-64
  
  // 暴露 focus 方法给父组件
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    }
  }), []);
  
  // 处理发送按钮点击，确保发送后重新聚焦
  const handleSendClick = useCallback(() => {
    if (isLoading && onStopGeneration) {
      // 如果正在加载，停止生成
      onStopGeneration();
    } else {
      // 否则发送消息
      onSendMessage();
      // 使用较长的延迟确保消息发送流程完成后再聚焦
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 200);
    }
  }, [isLoading, onStopGeneration, onSendMessage]);
  
  // 处理按键事件，确保发送后重新聚焦
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick(); // 使用统一的发送逻辑
    } else {
      // 对于其他按键，调用原来的处理器
      onKeyPress(e);
    }
  }, [handleSendClick, onKeyPress]);
  
  // 使用 ref 来获取最新的 input 值
  const inputRef = useRef(input);
  inputRef.current = input;

  // 简化：只有用户输入 + 临时转录文本
  const displayText = input + (interimTranscript ? (input ? ' ' : '') + interimTranscript : '');

  // 获取模型列表
  const formatModelName = useCallback((model?: string | ModelInfo) => {
    if (typeof model === 'string') {
      return model?.split('/').pop()?.replace(/-/g, ' ') || model || 'Select Model';
    }
    if (model && typeof model === 'object') {
      return model.name || model.id?.split('/').pop()?.replace(/-/g, ' ') || 'Select Model';
    }
    return 'Select Model';
  }, []);

  // 计算下拉菜单的最佳宽度
  const calculateDropdownWidth = useCallback((modelList: ModelInfo[]) => {
    if (modelList.length === 0) return 256; // 默认宽度
    
    // 检查是否在浏览器环境中
    if (typeof window === 'undefined') return 256;
    
    // 创建一个临时的测量元素
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return 256;
    
    // 设置与下拉菜单相同的字体样式
    context.font = '14px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';
    
    // 计算所有模型名称的最大宽度
    let maxWidth = 0;
    modelList.forEach(model => {
      const formattedName = formatModelName(model);
      const textWidth = context.measureText(formattedName).width;
      maxWidth = Math.max(maxWidth, textWidth);
    });
    
    // 添加padding和边距 (px-3 py-2 = 24px horizontal padding + 一些额外空间)
    const finalWidth = Math.max(256, Math.min(400, maxWidth + 48)); // 最小256px，最大400px
    return finalWidth;
  }, [formatModelName]);

  const fetchModels = useCallback(async () => {
    try {
      const response = await fetch('/api/models');
      if (response.ok) {
        const data = await response.json();
        const modelList = data.models || [];
        setModels(modelList);
        
        // 计算并设置下拉菜单宽度
        const width = calculateDropdownWidth(modelList);
        setDropdownWidth(width);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setIsModelsLoading(false);
    }
  }, [calculateDropdownWidth]);

  const handleModelChange = useCallback((model: ModelInfo) => {
    onModelChange?.(model.id);
    setIsModelDropdownOpen(false);
  }, [onModelChange]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // 当模型列表加载完成且没有选中模型时，设置默认模型
  useEffect(() => {
    if (!isModelsLoading && models.length > 0 && !selectedModel) {
      // 首先检查localStorage中是否有保存的模型
      const savedModel = localStorage.getItem('selectedModel');
      if (savedModel && models.find(model => model.id === savedModel)) {
        // 如果localStorage中有保存的模型且在模型列表中，使用保存的模型
        onModelChange?.(savedModel);
      } else {
        // 否则使用第一个模型作为默认模型
        onModelChange?.(models[0].id);
      }
    }
  }, [isModelsLoading, models, selectedModel, onModelChange]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = () => setIsModelDropdownOpen(false);
    if (isModelDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isModelDropdownOpen]);

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
      {/* 已选择文件预览 */}
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
      
      {/* 整合式输入框 */}
      <div className="relative">
        <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          {/* 文本输入区域 */}
          <div className="relative p-2 pb-0">
            <textarea
              ref={textareaRef}
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
              onKeyPress={handleKeyPress}
              placeholder={isRecording ? t('voice.recording') + '...' : t('chat.typeMessage')}
              className={`w-full resize-none bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border-none outline-none text-base leading-relaxed ${
                isRecording ? 'text-red-600' : ''
              }`}
              rows={3}
              style={{ 
                minHeight: '60px',
                maxHeight: '200px',
                lineHeight: '1.5'
              }}
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
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-xs animate-pulse">
                  识别中 {interimTranscript.length}字
                </span>
              </div>
            )}
          </div>
          
          {/* 底部功能按钮区域 */}
          <div className="flex items-center justify-between px-2 pb-1 pt-0 border-gray-100 dark:border-gray-600">
            {/* 左侧功能按钮组 */}
            <div className="flex items-center space-x-1">
              {/* 模式切换按钮 */}
              {agentMode && onAgentModeChange && (
                <div className="flex items-center bg-gray-100 dark:bg-gray-600 rounded-full p-0.5">
                  <button
                    onClick={() => onAgentModeChange({ type: 'chat', label: t('mode.chat') })}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-all ${
                      agentMode.type === 'chat'
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                    }`}
                    title={t('mode.chat')}
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span>{t('mode.chat')}</span>
                  </button>
                  <button
                    onClick={() => onAgentModeChange({ type: 'agent', label: t('mode.agent') })}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-all ${
                      agentMode.type === 'agent'
                        ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                    }`}
                    title={t('mode.agent')}
                  >
                    <Zap className="h-3 w-3" />
                    <span>{t('mode.agent')}</span>
                  </button>
                </div>
              )}
            </div>
            
            {/* 右侧操作按钮 */}
            <div className="flex items-center space-x-2">
              {/* 模型选择器 */}
              <div className="relative">
                {isModelsLoading ? (
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs">
                    <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                    <div className="w-16 h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsModelDropdownOpen(!isModelDropdownOpen);
                      }}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors"
                      disabled={isLoading}
                      title="选择模型"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="truncate" style={{ maxWidth: `${Math.min(200, dropdownWidth - 60)}px` }}>
                        {formatModelName(selectedModel)}
                      </span>
                      <svg className={`w-3 h-3 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isModelDropdownOpen && (
                      <div 
                        className="absolute bottom-full left-0 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
                        style={{ width: `${dropdownWidth}px` }}
                      >
                        {models.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => handleModelChange(model)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                              selectedModel === model.id 
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {formatModelName(model)}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 图片上传按钮 */}
              <button
                onClick={handleImageUpload}
                className="p-2 rounded-full transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                disabled={isLoading}
                title={t('chat.uploadImage')}
              >
                <ImageIcon className="h-5 w-5" />
              </button>

              {/* 语音按钮 */}
              <button
                onClick={handleVoiceToggle}
                className={`p-2 rounded-full transition-colors relative ${
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
              
              {/* 发送按钮 */}
              <button
                onClick={handleSendClick}
                disabled={!isLoading && !displayText.trim() && !selectedFile}
                className={`p-2 rounded-full transition-colors ${
                  isLoading
                    ? 'text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'
                    : (!displayText.trim() && !selectedFile)
                    ? 'text-gray-400 bg-gray-100 dark:bg-gray-600 cursor-not-allowed'
                    : 'text-white bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                }`}
                title={isLoading ? t('chat.stopGeneration') : t('chat.sendMessage')}
              >
                {isLoading ? (
                  <Square className="h-5 w-5" />
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
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
});

InputArea.displayName = 'InputArea';
