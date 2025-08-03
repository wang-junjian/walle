'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';

export default function Home() {
  const [selectedModel, setSelectedModel] = useState<string>('');

  // Load selected model from localStorage on mount
  useEffect(() => {
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    // Save to localStorage when model changes
    if (model) {
      localStorage.setItem('selectedModel', model);
    }
    console.log('Model changed to:', model);
  };

  return (
    <MainLayout 
      selectedModel={selectedModel} 
      onModelChange={handleModelChange}
    />
  );
}
