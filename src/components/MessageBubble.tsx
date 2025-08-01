'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@/types/chat';
import { User, Bot } from 'lucide-react';
import { formatTime } from '@/utils/time';
import { ChatToolbar } from './ChatToolbar';

interface MessageBubbleProps {
  message: Message;
  selectedVoice?: string;
  onRegenerate?: () => void;
}

export function MessageBubble({ message, selectedVoice, onRegenerate }: MessageBubbleProps) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Create object URLs for image attachments
  useEffect(() => {
    const urls: string[] = [];
    const urlsToCleanup: string[] = [];

    if (message.attachments) {
      const imageAttachments = message.attachments.filter(attachment => attachment.type === 'image');
      
      imageAttachments.forEach(attachment => {
        if (attachment.url) {
          // Use existing URL
          urls.push(attachment.url);
        } else if (attachment.file) {
          // Create blob URL for file
          try {
            const objectUrl = URL.createObjectURL(attachment.file);
            urls.push(objectUrl);
            urlsToCleanup.push(objectUrl);
            console.log('Created blob URL:', objectUrl, 'for file:', attachment.file.name);
          } catch (error) {
            console.error('Failed to create object URL:', error);
          }
        }
      });
    }
    
    setImageUrls(urls);

    // Cleanup function
    return () => {
      urlsToCleanup.forEach(url => {
        try {
          URL.revokeObjectURL(url);
          console.log('Revoked blob URL:', url);
        } catch (error) {
          console.error('Failed to revoke object URL:', error);
        }
      });
    };
  }, [message.attachments, message.id]); // Add message.id to dependencies

  return (
    <div className={`flex items-start space-x-5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
          <Bot className="h-7 w-7 text-white" />
        </div>
      )}
      
      <div className={`max-w-[80%] lg:max-w-[75%] xl:max-w-[70%] ${isUser ? 'order-1' : 'order-2'}`}>
        <div
          className={`rounded-xl p-5 ${
            isUser
              ? 'bg-green-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
          }`}
        >
          {/* Display image attachments */}
          {message.attachments?.filter(attachment => attachment.type === 'image').map((attachment, index) => (
            <div key={index} className="mb-3">
              <div className="space-y-2">
                {imageUrls[index] ? (
                  <div className="relative max-w-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrls[index]}
                      alt={`Uploaded image ${index + 1}`}
                      className="w-full h-auto rounded-lg shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ maxHeight: '200px', objectFit: 'contain' }}
                      onClick={() => {
                        // Open image in new tab for full view
                        window.open(imageUrls[index], '_blank');
                      }}
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        console.error('Image failed to load:', {
                          url: imageUrls[index],
                          attachment: attachment,
                          messageId: message.id
                        });
                        // Show error placeholder
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzM3NDE1MSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkZhaWxlZCB0byBsb2FkIGltYWdlPC90ZXh0Pjwvc3ZnPg==';
                        e.currentTarget.alt = 'Failed to load image';
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully:', imageUrls[index]);
                      }}
                    />
                  </div>
                ) : (
                  // Fallback for when URL is not ready
                  <div className="relative max-w-xs h-24 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500 text-sm">Loading image...</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {message.content && (
            <div className="space-y-2">
              {isUser ? (
                <p className="text-base whitespace-pre-wrap leading-relaxed">{message.content}</p>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert 
                              prose-headings:text-gray-900 dark:prose-headings:text-white
                              prose-p:text-gray-900 dark:prose-p:text-white prose-p:text-base prose-p:leading-relaxed
                              prose-strong:text-gray-900 dark:prose-strong:text-white
                              prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-code:bg-gray-100 dark:prose-code:bg-gray-800
                              prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800
                              prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600
                              prose-li:text-gray-900 dark:prose-li:text-white
                              prose-a:text-blue-600 dark:prose-a:text-blue-400">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        if (match) {
                          return (
                            <pre className="overflow-x-auto p-3 rounded-md bg-gray-100 dark:bg-gray-800">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          );
                        }
                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}
          
          {/* 对于助手消息，添加工具栏（但排除欢迎消息） */}
          {!isUser && message.id !== '1' && (
            <ChatToolbar 
              message={message} 
              selectedVoice={selectedVoice}
              onRegenerate={onRegenerate}
            />
          )}
        </div>
        
        <p className={`text-xs text-gray-500 dark:text-gray-400 mt-2 ${isUser ? 'text-right' : 'text-left'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center order-2">
          <User className="h-7 w-7 text-white" />
        </div>
      )}
    </div>
  );
}
