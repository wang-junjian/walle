'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Message, StreamChunk, MessageStats } from '@/types/chat';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { ModelSelector } from './ModelSelector';
import { LanguageSelector } from './LanguageSelector';
import VoiceSelector from './VoiceSelector';
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
  };

  const handleSendMessage = async () => {
    if (!input.trim() && !selectedFile) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
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
      formData.append('message', input);
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
                    
                    // Update the message with accumulated content
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, content: accumulatedContent }
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden h-full flex flex-col">
      {/* Chat Header with New Chat Button */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-750 flex-shrink-0">
        <div className="flex justify-between items-center">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 font-medium"
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 4v16m8-8H4" 
              />
            </svg>
            {t('chat.newChat')}
          </button>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <VoiceSelector 
              value={selectedVoice} 
              onChange={setSelectedVoice} 
            />
            {onModelChange && (
              <ModelSelector onModelChange={onModelChange} />
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} isLoading={isLoading} selectedVoice={selectedVoice} />
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
        />
      </div>
    </div>
  );
}
