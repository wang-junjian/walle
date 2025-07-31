'use client';

import { useState, useEffect } from 'react';

interface ModelSelectorProps {
  onModelChange: (model: string) => void;
}

export function ModelSelector({ onModelChange }: ModelSelectorProps) {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch available models from the API
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/models');
      if (response.ok) {
        const data = await response.json();
        setModels(data.models || []);
        setSelectedModel(data.currentModel || '');
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelChange = async (model: string) => {
    setSelectedModel(model);
    onModelChange(model);
    
    // Optionally, you can also notify the backend about the model change
    try {
      await fetch('/api/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model }),
      });
    } catch (error) {
      console.error('Error updating model on backend:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
          <div className="w-24 h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-2">
        <label htmlFor="model-select" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
          模型:
        </label>
        <select
          id="model-select"
          value={selectedModel}
          onChange={(e) => handleModelChange(e.target.value)}
          className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     hover:border-gray-400 dark:hover:border-gray-500 transition-colors
                     min-w-[120px]"
        >
          {models.map((model) => (
            <option key={model} value={model}>
              {model.split('/').pop()?.replace(/-/g, ' ') || model}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
