'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Message } from '@/types/chat';
import { MessageBubble } from './MessageBubble';
import { Loader2 } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  selectedVoice?: string;
  onRegenerate?: (messageId: string) => void;
  onToggleReasoning?: (messageId: string) => void;
  onToggleAgentThoughts?: (messageId: string) => void;
}

export function MessageList({ messages, isLoading, selectedVoice, onRegenerate, onToggleReasoning, onToggleAgentThoughts }: MessageListProps) {
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTop = useRef(0);
  const isScrollingDown = useRef(false);

  // 滚动到底部
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'instant' 
    });
  }, []);

  // 检查是否接近底部
  const isNearBottom = useCallback(() => {
    const container = containerRef.current?.parentElement;
    if (!container) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100;
    return scrollHeight - scrollTop - clientHeight <= threshold;
  }, []);

  // 处理滚动事件
  const handleScroll = useCallback(() => {
    const container = containerRef.current?.parentElement;
    if (!container) return;

    const currentScrollTop = container.scrollTop;
    const isScrollingDownNow = currentScrollTop > lastScrollTop.current;
    lastScrollTop.current = currentScrollTop;
    isScrollingDown.current = isScrollingDownNow;

    // 检查是否接近底部
    const nearBottom = isNearBottom();
    setShowScrollButton(!nearBottom);

    // 如果用户主动向上滚动，暂停自动跟随
    if (!isScrollingDownNow && !nearBottom) {
      setIsUserScrolling(true);
    }

    // 清除之前的定时器
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // 如果用户停止滚动一段时间，检查是否恢复自动跟随
    scrollTimeoutRef.current = setTimeout(() => {
      // 如果用户滚动到底部附近，恢复自动跟随
      if (nearBottom) {
        setIsUserScrolling(false);
      }
    }, 1000); // 1秒后检查

  }, [isNearBottom]);

  // 绑定滚动事件
  useEffect(() => {
    const container = containerRef.current?.parentElement;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // 消息变化时的自动滚动逻辑
  useEffect(() => {
    // 如果用户正在向上查看历史内容，不要自动滚动
    if (isUserScrolling && !isLoading) {
      return;
    }

    // 如果是流式输出期间，用户没有主动向上滚动，则自动跟随
    // 如果不是流式输出，只有在底部附近才自动滚动
    const shouldAutoScroll = isLoading ? !isUserScrolling : !isUserScrolling && isNearBottom();

    if (shouldAutoScroll) {
      // 流式输出期间使用即时滚动，其他时候使用平滑滚动
      const useSmooth = !isLoading;
      
      // 使用 requestAnimationFrame 确保 DOM 更新后再滚动
      requestAnimationFrame(() => {
        scrollToBottom(!useSmooth);
      });
    }
  }, [messages, isLoading, isUserScrolling, scrollToBottom, isNearBottom]);

  // 流式输出开始时，如果用户在底部，自动启用跟随
  useEffect(() => {
    if (isLoading && isNearBottom()) {
      setIsUserScrolling(false);
    }
  }, [isLoading, isNearBottom]);

  // 手动滚动到底部
  const handleScrollToBottom = useCallback(() => {
    setIsUserScrolling(false);
    scrollToBottom(true);
  }, [scrollToBottom]);

  return (
    <div ref={containerRef} className="space-y-4">
      {messages.map((message) => (
        <MessageBubble 
          key={message.id} 
          message={message} 
          selectedVoice={selectedVoice}
          onRegenerate={message.role === 'assistant' ? () => onRegenerate?.(message.id) : undefined}
          onToggleReasoning={onToggleReasoning}
          onToggleAgentThoughts={onToggleAgentThoughts}
        />
      ))}
      
      {isLoading && (
        <div className="flex items-center justify-start">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 max-w-xs">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {t('chat.loading')}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* 滚动到底部按钮 - 只在用户离开底部时显示 */}
      {showScrollButton && (
        <div className="fixed bottom-24 right-8 z-50">
          <button
            onClick={handleScrollToBottom}
            className="px-4 py-2 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-all duration-200 flex items-center space-x-2 animate-fade-in"
          >
            <span className="text-sm">{t('chat.scrollToBottom', '回到底部')}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            {/* 如果正在流式输出，显示小红点提示有新内容 */}
            {isLoading && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            )}
          </button>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}
