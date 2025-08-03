'use client';

import { useState, useRef } from 'react';
import { ChatInterface, ChatInterfaceHandle } from './ChatInterface';
import { Translator } from './Translator';
import { Settings } from './Settings';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

export function MainLayout({ selectedModel, onModelChange }: MainLayoutProps) {
  const [selectedTab, setSelectedTab] = useState('chat');
  const chatRef = useRef<ChatInterfaceHandle>(null);

  const handleTabChange = (tab: string) => {
    if (tab === 'chat' && selectedTab === 'chat') {
      // 如果已经在聊天页面，点击新对话则清空当前聊天
      chatRef.current?.newChat();
    } else {
      setSelectedTab(tab);
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
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <main className="flex-1 flex justify-center min-h-0 p-4">
          <div className="w-full max-w-none h-full">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
