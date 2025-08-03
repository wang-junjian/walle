'use client';

import { useState } from 'react';
import { ChatInterface } from './ChatInterface';
import { Dictionary } from './Dictionary';
import { Translator } from './Translator';
import { Settings } from './Settings';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

export function MainLayout({ selectedModel, onModelChange }: MainLayoutProps) {
  const [selectedTab, setSelectedTab] = useState('chat');

  const renderContent = () => {
    switch (selectedTab) {
      case 'chat':
        return (
          <ChatInterface 
            selectedModel={selectedModel} 
            onModelChange={onModelChange}
          />
        );
      case 'dictionary':
        return <Dictionary />;
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
        onTabChange={setSelectedTab} 
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
