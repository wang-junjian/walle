'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatInterface } from '@/components/ChatInterface';

export default function Home() {
  const { t } = useTranslation();
  const [selectedModel, setSelectedModel] = useState<string>('');

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    // You can add additional logic here if needed
    console.log('Model changed to:', model);
  };

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col p-4 max-w-none min-h-0">
        <header className="text-center mb-6 flex-shrink-0">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
            🤖 {t('chat.title')}
          </h1>
        </header>
        
        <main className="flex-1 flex justify-center min-h-0">
          <div className="w-full max-w-4xl chat-container">
            <ChatInterface 
              selectedModel={selectedModel} 
              onModelChange={handleModelChange}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
