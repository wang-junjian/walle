'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Message } from '@/types/chat';
import { User, Bot, Image as ImageIcon, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { formatTime } from '@/utils/time';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  const [showStats, setShowStats] = useState(false);
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
          {/* Display image attachments */}
          {message.attachments?.filter(attachment => attachment.type === 'image').map((attachment, index) => (
            <div key={index} className="mb-3">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm opacity-75">
                  <ImageIcon className="h-4 w-4" />
                  <span>{t('chat.imageAttached')}</span>
                </div>
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
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
          
          {/* Display statistics for assistant messages */}
          {!isUser && message.stats && (
            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setShowStats(!showStats)}
                className="flex items-center justify-between w-full text-xs opacity-75 hover:opacity-100 transition-opacity"
              >
                <div className="flex items-center space-x-1">
                  <BarChart3 className="h-3 w-3" />
                  <span className="font-medium">{t('stats.totalTokens')}</span>
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
                    <span>{t('stats.inputTokens')}:</span>
                    <span>{message.stats.inputTokens} tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('stats.outputTokens')}:</span>
                    <span>{message.stats.outputTokens} tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('stats.totalTokens')}:</span>
                    <span>{message.stats.totalTokens} tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('stats.duration')}:</span>
                    <span>{message.stats.duration}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('stats.tokensPerSecond')}:</span>
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
