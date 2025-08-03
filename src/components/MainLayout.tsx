'use client';

import { useState, useRef, useCallback } from 'react';
import { ChatInterface, ChatInterfaceHandle } from './ChatInterface';
import { Translator } from './Translator';
import { Settings } from './Settings';
import { Sidebar } from './Sidebar';
import { useConversations } from '@/hooks/useConversations';
import { Message } from '@/types/chat';

interface MainLayoutProps {
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

export function MainLayout({ selectedModel, onModelChange }: MainLayoutProps) {
  const [selectedTab, setSelectedTab] = useState('chat');
  const chatRef = useRef<ChatInterfaceHandle>(null);
  
  // 对话管理
  const {
    createNewConversation,
    updateCurrentConversation,
    switchToConversation,
    deleteConversation,
    getConversationSummaries,
    getCurrentConversation,
    currentConversationId,
    resetCurrentConversation,
  } = useConversations();

  // 当前对话的消息
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);

  const handleTabChange = (tab: string) => {
    if (tab === 'chat' && selectedTab === 'chat') {
      // 如果已经在聊天页面，点击新对话则创建新对话
      handleNewChat();
    } else {
      setSelectedTab(tab);
    }
  };

  const handleNewChat = () => {
    // 不立即创建对话，只是重置到初始状态
    // 重置当前对话ID，这样下次发送消息时会创建新对话
    resetCurrentConversation();
    setCurrentMessages([]);
    chatRef.current?.newChat();
  };

  const handleSelectConversation = (conversationId: string) => {
    const conversation = switchToConversation(conversationId);
    if (conversation) {
      console.log('加载对话:', conversationId, '消息数量:', conversation.messages.length);
      console.log('对话消息:', conversation.messages);
      setCurrentMessages(conversation.messages);
      setSelectedTab('chat');
      chatRef.current?.loadConversation(conversation.messages);
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    deleteConversation(conversationId);
    
    // 如果删除的是当前对话，创建新对话
    if (conversationId === currentConversationId) {
      handleNewChat();
    }
  };

  const handleMessagesUpdate = useCallback((messages: Message[]) => {
    console.log('更新对话消息:', messages.length, messages);
    // 使用setTimeout来避免在渲染过程中更新状态
    setTimeout(() => {
      setCurrentMessages(messages);
      updateCurrentConversation(messages);
    }, 0);
  }, [updateCurrentConversation]);

  // 当开始新对话时（发送第一条消息）
  const handleStartConversation = (firstMessage: Message) => {
    if (!currentConversationId) {
      createNewConversation(firstMessage);
    }
  };

  const renderContent = () => {
    switch (selectedTab) {
      case 'chat':
        return (
          <ChatInterface 
            ref={chatRef}
            selectedModel={selectedModel} 
            onModelChange={onModelChange}
            onUpdateConversation={handleMessagesUpdate}
            onStartConversation={handleStartConversation}
          />
        );
      case 'translator':
        return <Translator />;
      case 'settings':
        return (
          <Settings 
            selectedModel={selectedModel} 
            onModelChange={onModelChange}
          />
        );
      default:
        return (
          <ChatInterface 
            ref={chatRef}
            selectedModel={selectedModel} 
            onModelChange={onModelChange}
            onUpdateConversation={handleMessagesUpdate}
            onStartConversation={handleStartConversation}
          />
        );
    }
  };

  return (
    <div className="w-screen h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        selectedTab={selectedTab} 
        onTabChange={handleTabChange}
        conversations={getConversationSummaries()}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <main className="flex-1 min-h-0">
          <div className="w-full h-full">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
