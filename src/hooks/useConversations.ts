'use client';

import { useState, useEffect, useCallback } from 'react';
import { Conversation, ConversationSummary } from '@/types/conversation';
import { Message } from '@/types/chat';

const STORAGE_KEY = 'walle_conversations';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // 从本地存储加载对话历史
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsedConversations = JSON.parse(stored).map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setConversations(parsedConversations);
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    }
  }, []);

  // 保存对话到本地存储
  const saveConversations = useCallback((convs: Conversation[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
    } catch (error) {
      console.error('Failed to save conversations:', error);
    }
  }, []);

  // 创建新对话
  const createNewConversation = useCallback((firstMessage?: Message): string => {
    const id = Date.now().toString();
    const now = new Date();
    
    // 生成对话标题
    const conversationNumber = conversations.length + 1;
    const title = firstMessage?.content 
      ? firstMessage.content.slice(0, 30) + (firstMessage.content.length > 30 ? '...' : '')
      : `新对话 ${conversationNumber}`;

    const newConversation: Conversation = {
      id,
      title,
      messages: firstMessage ? [firstMessage] : [],
      createdAt: now,
      updatedAt: now,
    };

    const updatedConversations = [newConversation, ...conversations];
    setConversations(updatedConversations);
    setCurrentConversationId(id);
    saveConversations(updatedConversations);
    
    return id;
  }, [conversations, saveConversations]);

  // 更新当前对话
  const updateCurrentConversation = useCallback((messages: Message[]) => {
    if (!currentConversationId) return;

    const updatedConversations = conversations.map(conv => {
      if (conv.id === currentConversationId) {
        // 如果有新消息且还没有标题，根据第一条用户消息生成标题
        let title = conv.title;
        if (conv.title.startsWith('新对话') && messages.length > 0) {
          const firstUserMessage = messages.find(msg => msg.role === 'user');
          if (firstUserMessage) {
            title = firstUserMessage.content.slice(0, 30) + 
              (firstUserMessage.content.length > 30 ? '...' : '');
          }
        }

        return {
          ...conv,
          title,
          messages,
          updatedAt: new Date(),
        };
      }
      return conv;
    });

    setConversations(updatedConversations);
    saveConversations(updatedConversations);
  }, [currentConversationId, conversations, saveConversations]);

  // 切换对话
  const switchToConversation = useCallback((conversationId: string): Conversation | null => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      setCurrentConversationId(conversationId);
      return conversation;
    }
    return null;
  }, [conversations]);

  // 删除对话
  const deleteConversation = useCallback((conversationId: string) => {
    const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
    setConversations(updatedConversations);
    saveConversations(updatedConversations);
    
    // 如果删除的是当前对话，清空当前对话ID
    if (currentConversationId === conversationId) {
      setCurrentConversationId(null);
    }
  }, [conversations, currentConversationId, saveConversations]);

  // 获取对话摘要列表
  const getConversationSummaries = useCallback((): ConversationSummary[] => {
    return conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      lastMessage: conv.messages.length > 0 
        ? conv.messages[conv.messages.length - 1].content.slice(0, 50) + 
          (conv.messages[conv.messages.length - 1].content.length > 50 ? '...' : '')
        : undefined,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messageCount: conv.messages.length,
    }));
  }, [conversations]);

  // 获取当前对话
  const getCurrentConversation = useCallback((): Conversation | null => {
    if (!currentConversationId) return null;
    return conversations.find(conv => conv.id === currentConversationId) || null;
  }, [currentConversationId, conversations]);

  // 重置当前对话（准备开始新对话）
  const resetCurrentConversation = useCallback(() => {
    setCurrentConversationId(null);
  }, []);

  return {
    conversations,
    currentConversationId,
    createNewConversation,
    updateCurrentConversation,
    switchToConversation,
    deleteConversation,
    getConversationSummaries,
    getCurrentConversation,
    resetCurrentConversation,
  };
}
