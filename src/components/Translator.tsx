'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface TranslationLanguage {
  code: string;
  name: string;
}

interface TranslationUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export function Translator() {
  const { t } = useTranslation();
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('en');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [models, setModels] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [_usage, _setUsage] = useState<TranslationUsage | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const languages: TranslationLanguage[] = [
    { code: 'auto', name: t('translator.autoDetect') },
    { code: 'en', name: t('languages.en') },
    { code: 'zh', name: t('languages.zh') },
    { code: 'ja', name: t('languages.ja') },
    { code: 'ko', name: t('languages.ko') },
    { code: 'fr', name: t('languages.fr') },
    { code: 'de', name: t('languages.de') },
    { code: 'es', name: t('languages.es') },
    { code: 'it', name: t('languages.it') },
    { code: 'pt', name: t('languages.pt') },
    { code: 'ru', name: t('languages.ru') },
    { code: 'ar', name: t('languages.ar') },
  ];

  // Fetch available models on component mount
  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/models');
      if (response.ok) {
        const data = await response.json();
        setModels(data.models || []);
        setSelectedModel(data.currentModel || data.models[0] || '');
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    
    setIsLoading(true);
    setIsStreaming(false);
    setError('');
    _setUsage(null);
    setTranslatedText('');

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sourceText,
          sourceLang: sourceLang,
          targetLang: targetLang,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Translation failed');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      
      // Set streaming state
      setIsLoading(false);
      setIsStreaming(true);

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim();
                if (jsonStr) {
                  const data = JSON.parse(jsonStr);
                  
                  if (data.type === 'chunk') {
                    setTranslatedText(data.translatedText);
                  } else if (data.type === 'complete') {
                    setTranslatedText(data.translatedText);
                    setIsStreaming(false);
                  } else if (data.type === 'error') {
                    throw new Error(data.error);
                  }
                }
              } catch (parseError) {
                console.error('Error parsing streaming data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      setIsStreaming(false);
    } catch (error) {
      console.error('Translation error:', error);
      setError(error instanceof Error ? error.message : 'Translation failed');
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const _handleSwapLanguages = () => {
    if (sourceLang === 'auto') return;
    
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleCopyResult = async () => {
    if (translatedText) {
      try {
        await navigator.clipboard.writeText(translatedText);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (error) {
        console.error('Failed to copy text:', error);
      }
    }
  };

  const handleClearText = () => {
    setSourceText('');
    setTranslatedText('');
    setError('');
    _setUsage(null);
  };

  return (
    <div className="h-full flex flex-col w-full">
      <div className="h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {/* Top Controls Bar */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-end gap-4">
            {/* Model Selector */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('chat.modelSelector')}
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Language Selector */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('translator.to')}
              </label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {languages.filter(lang => lang.code !== 'auto').map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleTranslate}
                disabled={isLoading || isStreaming || !sourceText.trim()}
                className="px-12 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 font-medium"
              >
                {isLoading ? t('translator.translating') : isStreaming ? t('translator.translating') : t('translator.translate')}
              </button>
              
              <button
                onClick={handleClearText}
                disabled={!sourceText.trim() && !translatedText.trim()}
                className="px-12 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors duration-200"
              >
                {t('common.clear')}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Translation Interface */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Source Text */}
          <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                  {t('translator.sourceText')}
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {sourceText.length}/5000
                </span>
              </div>
            </div>
            <div className="flex-1 p-4">
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder={t('translator.enterText')}
                maxLength={5000}
                className="w-full h-full resize-none border-none outline-none bg-transparent text-gray-800 dark:text-white placeholder-gray-400"
              />
            </div>
          </div>

          {/* Translated Text */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                  {t('translator.translatedText')}
                </h3>
                <div className="flex items-center gap-2">
                  {translatedText && (
                    <button
                      onClick={handleCopyResult}
                      className={`flex items-center gap-2 px-3 py-1 text-sm rounded-lg transition-all duration-200 ${
                        copySuccess 
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                          : 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                    >
                      {copySuccess ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {t('chat.copied')}
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          {t('chat.copy')}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <span className="text-gray-600 dark:text-gray-400">{t('translator.connecting')}</span>
                  </div>
                </div>
              ) : translatedText ? (
                <div className="w-full text-gray-800 dark:text-white whitespace-pre-wrap">
                  {translatedText}
                  {isStreaming && (
                    <span className="inline-block w-0.5 h-5 bg-blue-500 ml-1 animate-pulse"></span>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                  {t('translator.placeholder')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
