'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '@/types/chat';
import { User, Bot, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { formatTime } from '@/utils/time';
import { ChatToolbar } from './ChatToolbar';

interface MessageBubbleProps {
  message: Message;
  selectedVoice?: string;
  onRegenerate?: () => void;
  onToggleReasoning?: (messageId: string) => void;
}

export function MessageBubble({ message, selectedVoice, onRegenerate, onToggleReasoning }: MessageBubbleProps) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isDark, setIsDark] = useState(false);
  
  // 检测暗色主题
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    
    // 监听主题变化
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);
  
  // 使用消息中的展开状态，而不是本地状态
  const showReasoning = message.reasoning_expanded ?? false;

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
          
          {/* 显示思维链（仅对助手消息） */}
          {!isUser && message.reasoning_content && (
            <div className="mb-4 border-l-4 border-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg">
              <button
                onClick={() => onToggleReasoning?.(message.id)}
                className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {t('chat.thinking', '思考')}
                  </span>
                </div>
                {showReasoning ? (
                  <ChevronUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                )}
              </button>
              
              {showReasoning && (
                <div className="px-4 pb-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed space-y-2">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => (
                          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
                            {children}
                          </p>
                        ),
                        h1: ({ children }) => (
                          <h1 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                            {children}
                          </h3>
                        ),
                        strong: ({ children }) => (
                          <strong className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                            {children}
                          </strong>
                        ),
                        code: ({ children }) => (
                          <code className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
                            {children}
                          </code>
                        ),
                        pre: ({ children }) => (
                          <pre className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                            {children}
                          </pre>
                        ),
                        li: ({ children }) => (
                          <li className="text-xs text-gray-500 dark:text-gray-400">
                            {children}
                          </li>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="text-xs text-gray-500 dark:text-gray-400 border-l-2 border-gray-300 dark:border-gray-600 pl-3 my-2">
                            {children}
                          </blockquote>
                        ),
                      }}
                    >
                      {message.reasoning_content}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}
          
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
                      code({ className, children }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';
                        const isCodeBlock = className?.includes('language-');
                        
                        if (isCodeBlock && language) {
                          // 代码块 - 使用语法高亮
                          return (
                            <SyntaxHighlighter
                              style={isDark ? oneDark as any : oneLight as any}
                              language={language}
                              PreTag="div"
                              customStyle={{
                                margin: '1rem 0',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                lineHeight: '1.5',
                              }}
                              codeTagProps={{
                                style: {
                                  fontSize: '0.875rem',
                                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Inconsolata, "Roboto Mono", monospace',
                                }
                              }}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          );
                        } else if (isCodeBlock) {
                          // 无语言的代码块
                          return (
                            <pre className="overflow-x-auto p-3 rounded-md bg-gray-100 dark:bg-gray-800 border">
                              <code className="text-sm font-mono">
                                {children}
                              </code>
                            </pre>
                          );
                        } else {
                          // 行内代码
                          return (
                            <code className="px-1.5 py-0.5 rounded text-sm bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-mono">
                              {children}
                            </code>
                          );
                        }
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
