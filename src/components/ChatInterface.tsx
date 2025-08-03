'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Message, StreamChunk, MessageStats } from '@/types/chat';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { ModelSelector } from './ModelSelector';
import { LanguageSelector } from './LanguageSelector';
import VoiceSelector from './VoiceSelector';
import { AnimatedRobot } from './AnimatedRobot';
import { voiceConfig } from '@/config/voice';

interface ChatInterfaceProps {
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

export function ChatInterface({ selectedModel, onModelChange }: ChatInterfaceProps) {
  const { t, i18n } = useTranslation();
  
  const getWelcomeMessage = (): Message => ({
    id: '1',
    content: t('chat.welcome'),
    role: 'assistant',
    timestamp: new Date(),
  });

  const [messages, setMessages] = useState<Message[]>([getWelcomeMessage()]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedVoice, setSelectedVoice] = useState(voiceConfig.defaultVoice);
  
  // 简化：只需要录音状态
  const [isRecording, setIsRecording] = useState(false);

  // Update welcome message when language changes
  useEffect(() => {
    setMessages(prevMessages => {
      if (prevMessages.length > 0 && prevMessages[0].id === '1') {
        // Update the welcome message
        const updatedMessages = [...prevMessages];
        updatedMessages[0] = {
          ...updatedMessages[0],
          content: t('chat.welcome'),
        };
        return updatedMessages;
      }
      return prevMessages;
    });
  }, [i18n.language, t]);

  const handleNewChat = () => {
    setMessages([getWelcomeMessage()]);
    setInput('');
    setSelectedFile(null);
    setIsLoading(false);
    setIsRecording(false);
  };

  // 根据当前状态确定机器人状态
  const getRobotStatus = (): 'idle' | 'listening' | 'thinking' | 'speaking' | 'typing' | 'error' => {
    if (isLoading) return 'thinking';
    if (isRecording) return 'listening';
    // 可以根据其他状态扩展
    return 'idle';
  };

  const handleToggleReasoning = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, reasoning_expanded: !msg.reasoning_expanded }
        : msg
    ));
  };

  const handleRegenerate = async (messageId: string) => {
    // 找到要重新生成的消息
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1 || messageIndex === 0) return;

    // 获取该消息之前的对话历史
    const historyUpToMessage = messages.slice(0, messageIndex);
    const lastUserMessage = historyUpToMessage[historyUpToMessage.length - 1];
    
    if (!lastUserMessage || lastUserMessage.role !== 'user') return;

    // 移除当前要重新生成的消息及其之后的所有消息
    setMessages(historyUpToMessage);
    setIsLoading(true);

    // 创建新的助手消息用于流式响应
    const newAssistantMessageId = Date.now().toString();
    const newAssistantMessage: Message = {
      id: newAssistantMessageId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newAssistantMessage]);

    try {
      // 准备请求数据
      const formData = new FormData();
      formData.append('message', lastUserMessage.content);
      
      // 如果用户消息有图片附件，也要包含
      if (lastUserMessage.attachments) {
        const imageAttachment = lastUserMessage.attachments.find(att => att.type === 'image');
        if (imageAttachment?.file) {
          formData.append('image', imageAttachment.file);
        }
      }
      
      // 添加选中的模型
      if (selectedModel) {
        formData.append('model', selectedModel);
      }

      // 添加对话历史（不包括当前用户消息）
      const conversationHistory = historyUpToMessage.slice(0, -1).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      formData.append('history', JSON.stringify(conversationHistory));

      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // 处理流式响应（与原有逻辑相同）
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let accumulatedReasoning = '';
      let messageStats: MessageStats | undefined;

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  continue;
                }

                try {
                  const parsed: StreamChunk = JSON.parse(data);
                  
                  if (parsed.type === 'content' && parsed.content) {
                    accumulatedContent += parsed.content;
                    
                    setMessages(prev => prev.map(msg => 
                      msg.id === newAssistantMessageId 
                        ? { ...msg, content: accumulatedContent }
                        : msg
                    ));
                  } else if (parsed.type === 'reasoning' && parsed.reasoning_content) {
                    accumulatedReasoning += parsed.reasoning_content;
                    console.log('重新生成-收到推理内容:', parsed.reasoning_content.substring(0, 100) + '...');
                    
                    // 当开始接收思维链内容时，将其展开，但不在收到回复内容时自动折叠
                    setMessages(prev => prev.map(msg => 
                      msg.id === newAssistantMessageId 
                        ? { 
                            ...msg, 
                            reasoning_content: accumulatedReasoning,
                            reasoning_expanded: true // 自动展开思维链
                          }
                        : msg
                    ));
                  } else if (parsed.type === 'stats') {
                    messageStats = {
                      inputTokens: parsed.inputTokens || 0,
                      outputTokens: parsed.outputTokens || 0,
                      totalTokens: parsed.totalTokens || 0,
                      duration: parsed.duration || '0',
                      tokensPerSecond: parsed.tokensPerSecond || '0',
                      finishReason: parsed.finishReason,
                    };
                    
                    setMessages(prev => prev.map(msg => 
                      msg.id === newAssistantMessageId 
                        ? { ...msg, stats: messageStats }
                        : msg
                    ));
                  } else if (parsed.type === 'error') {
                    throw new Error(parsed.error || 'Streaming error');
                  }
                } catch (parseError) {
                  console.error('Error parsing streaming data:', parseError);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (error) {
      console.error('Error regenerating message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: t('chat.error'),
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev.slice(0, -1), errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    // 简化：只使用 input 状态
    const fullMessage = input.trim();
    
    if (!fullMessage && !selectedFile) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: fullMessage,
      role: 'user',
      timestamp: new Date(),
      attachments: selectedFile ? [{ 
        type: 'image', 
        file: selectedFile
        // Don't create URL here, let MessageBubble handle it
      }] : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedFile(null);
    setIsLoading(true);

    // Create a placeholder message for streaming response
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Prepare the request data
      const formData = new FormData();
      formData.append('message', fullMessage);
      if (selectedFile) {
        formData.append('image', selectedFile);
      }
      
      // Add selected model if available
      if (selectedModel) {
        formData.append('model', selectedModel);
      }

      // Add conversation history (excluding the current user message that was just added)
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        // Don't include attachments in history to keep it clean
      }));
      formData.append('history', JSON.stringify(conversationHistory));

      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let accumulatedReasoning = '';
      let messageStats: MessageStats | undefined;

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  continue;
                }

                try {
                  const parsed: StreamChunk = JSON.parse(data);
                  
                  if (parsed.type === 'content' && parsed.content) {
                    accumulatedContent += parsed.content;
                    
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, content: accumulatedContent }
                        : msg
                    ));
                  } else if (parsed.type === 'reasoning' && parsed.reasoning_content) {
                    accumulatedReasoning += parsed.reasoning_content;
                    console.log('收到推理内容:', parsed.reasoning_content.substring(0, 100) + '...');
                    
                    // 当开始接收思维链内容时，将其展开，但不在收到回复内容时自动折叠
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { 
                            ...msg, 
                            reasoning_content: accumulatedReasoning,
                            reasoning_expanded: true // 自动展开思维链
                          }
                        : msg
                    ));
                  } else if (parsed.type === 'stats') {
                    messageStats = {
                      inputTokens: parsed.inputTokens || 0,
                      outputTokens: parsed.outputTokens || 0,
                      totalTokens: parsed.totalTokens || 0,
                      duration: parsed.duration || '0',
                      tokensPerSecond: parsed.tokensPerSecond || '0',
                      finishReason: parsed.finishReason,
                    };
                    
                    // Update the message with final stats
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, stats: messageStats }
                        : msg
                    ));
                  } else if (parsed.type === 'error') {
                    throw new Error(parsed.error || 'Streaming error');
                  }
                } catch (parseError) {
                  console.error('Error parsing streaming data:', parseError);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: t('chat.error'),
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev.slice(0, -1), errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex justify-center">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden h-full flex flex-col w-full max-w-5xl">
        <div className="flex-1 min-h-0 overflow-hidden">
          <MessageList 
            messages={messages} 
            isLoading={isLoading} 
            selectedVoice={selectedVoice}
            onRegenerate={handleRegenerate}
            onToggleReasoning={handleToggleReasoning}
          />
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
          <InputArea
            input={input}
            setInput={setInput}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            onSendMessage={handleSendMessage}
            onKeyPress={handleKeyPress}
            isLoading={isLoading}
            currentLanguage={i18n.language}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
          />
          <div className="text-center mt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('chat.aiDisclaimer')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
