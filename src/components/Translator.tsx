'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TranslationLanguage {
  code: string;
  name: string;
}

export function Translator() {
  const { t } = useTranslation();
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('en');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    
    setIsLoading(true);
    // TODO: 实现翻译API调用
    // 这里暂时使用模拟数据
    setTimeout(() => {
      setTranslatedText(`[${targetLang.toUpperCase()}] ${sourceText}`);
      setIsLoading(false);
    }, 1000);
  };

  const handleSwapLanguages = () => {
    if (sourceLang === 'auto') return;
    
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleCopyResult = () => {
    if (translatedText) {
      navigator.clipboard.writeText(translatedText);
    }
  };

  return (
    <div className="h-full flex justify-center">
      <div className="h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden w-full max-w-5xl">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            {t('translator.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('translator.description')}
          </p>
        </div>

      {/* Language Selection */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('translator.from')}
            </label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSwapLanguages}
            disabled={sourceLang === 'auto'}
            className="mt-6 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>

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
        </div>
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
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleTranslate}
              disabled={isLoading || !sourceText.trim()}
              className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 font-medium"
            >
              {isLoading ? t('translator.translating') : t('translator.translate')}
            </button>
          </div>
        </div>

        {/* Translated Text */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                {t('translator.translatedText')}
              </h3>
              {translatedText && (
                <button
                  onClick={handleCopyResult}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {t('chat.copy')}
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : translatedText ? (
              <div className="w-full h-full text-gray-800 dark:text-white whitespace-pre-wrap">
                {translatedText}
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
