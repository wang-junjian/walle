'use client';

import { Message } from '@/types/chat';
import { User, Bot, Image as ImageIcon } from 'lucide-react';
import { formatTime } from '@/utils/time';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

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
