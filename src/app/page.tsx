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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
            🤖 {t('chat.title')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {t('chat.subtitle')}
          </p>
        </header>
        
        <main className="max-w-4xl mx-auto">
          <ChatInterface 
            selectedModel={selectedModel} 
            onModelChange={handleModelChange}
          />
        </main>
      </div>
    </div>
  );
}
