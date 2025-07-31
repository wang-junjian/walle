'use client';

import { useState } from 'react';
import { Message } from '@/types/chat';
import { User, Bot, Image as ImageIcon, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { formatTime } from '@/utils/time';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [showStats, setShowStats] = useState(false);

  return (
    <div className={`flex items-start space-x-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <Bot className="h-5 w-5 text-white" />
        </div>
      )}
      
      <div className={`max-w-xs lg:max-w-md ${isUser ? 'order-1' : 'order-2'}`}>
        <div
          className={`rounded-lg p-3 ${
            isUser
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
          }`}
        >
          {message.attachments?.map((attachment, index) => (
            <div key={index} className="mb-2">
              {attachment.type === 'image' && (
                <div className="flex items-center space-x-2 text-sm opacity-75">
                  <ImageIcon className="h-4 w-4" />
                  <span>Image attached</span>
                </div>
              )}
            </div>
          ))}
          
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          
          {/* Display statistics for assistant messages */}
          {!isUser && message.stats && (
            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setShowStats(!showStats)}
                className="flex items-center justify-between w-full text-xs opacity-75 hover:opacity-100 transition-opacity"
              >
                <div className="flex items-center space-x-1">
                  <BarChart3 className="h-3 w-3" />
                  <span className="font-medium">Token 统计</span>
                  <span className="text-gray-500">
                    ({message.stats.totalTokens} tokens, {message.stats.tokensPerSecond} t/s)
                  </span>
                </div>
                {showStats ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
              
              {showStats && (
                <div className="mt-2 space-y-1 text-xs opacity-75">
                  <div className="flex justify-between">
                    <span>输入:</span>
                    <span>{message.stats.inputTokens} tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span>输出:</span>
                    <span>{message.stats.outputTokens} tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span>总计:</span>
                    <span>{message.stats.totalTokens} tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span>耗时:</span>
                    <span>{message.stats.duration}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>速度:</span>
                    <span>{message.stats.tokensPerSecond} tokens/s</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <p className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
          <User className="h-5 w-5 text-white" />
        </div>
      )}
    </div>
  );
}
