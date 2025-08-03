'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';

export default function Home() {
  const [selectedModel, setSelectedModel] = useState<string>('');

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    // You can add additional logic here if needed
    console.log('Model changed to:', model);
  };

  return (
    <MainLayout 
      selectedModel={selectedModel} 
      onModelChange={handleModelChange}
    />
  );
}
