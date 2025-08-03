'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function Dictionary() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsLoading(true);
    // TODO: 实现词典查询API调用
    // 这里暂时使用模拟数据
    setTimeout(() => {
      setSearchResults([
        {
          word: searchTerm,
          phonetic: '/ˈeksəmpl/',
          meanings: [
            {
              partOfSpeech: 'noun',
              definitions: [
                {
                  definition: 'A thing characteristic of its kind or illustrating a general rule.',
                  example: 'It\'s a good example of how European action can produce results.'
                }
              ]
            }
          ]
        }
      ]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="h-full flex justify-center">
      <div className="h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden w-full max-w-5xl">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            {t('dictionary.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('dictionary.description')}
          </p>
        </div>

      {/* Search */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('dictionary.searchPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <svg 
              className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading || !searchTerm.trim()}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 font-medium"
          >
            {isLoading ? t('dictionary.searching') : t('dictionary.search')}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="space-y-6">
            {searchResults.map((result, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                    {result.word}
                  </h3>
                  {result.phonetic && (
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {result.phonetic}
                    </p>
                  )}
                </div>
                
                {result.meanings?.map((meaning: any, meaningIndex: number) => (
                  <div key={meaningIndex} className="mb-4">
                    <h4 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-2">
                      {meaning.partOfSpeech}
                    </h4>
                    {meaning.definitions?.map((def: any, defIndex: number) => (
                      <div key={defIndex} className="mb-3 ml-4">
                        <p className="text-gray-700 dark:text-gray-300 mb-1">
                          {def.definition}
                        </p>
                        {def.example && (
                          <p className="text-gray-600 dark:text-gray-400 italic text-sm">
                            <span className="font-medium">{t('dictionary.example')}:</span> {def.example}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : searchTerm && !isLoading ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">
              {t('dictionary.noResults')}
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">
              {t('dictionary.placeholder')}
            </p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
