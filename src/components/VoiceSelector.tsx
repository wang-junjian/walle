'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Voice {
  id: string;
  name: string;
}

interface VoiceSelectorProps {
  value: string;
  onChange: (voice: string) => void;
}

export default function VoiceSelector({ value, onChange }: VoiceSelectorProps) {
  const { t } = useTranslation();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadVoices = async () => {
      try {
        const response = await fetch('/api/speech/debug');
        if (response.ok) {
          const data = await response.json();
          if (data.voiceConfig?.voices) {
            setVoices(data.voiceConfig.voices);
          }
        }
      } catch (error) {
        console.error('Failed to load voices:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVoices();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setIsOpen(false);
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-500">{t('common.loading') || 'Loading...'}</span>
      </div>
    );
  }

  const currentVoice = voices.find(voice => voice.id === value);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        aria-label={t('voice.voiceSelector') || 'Voice Selector'}
      >
        <svg 
          className="w-4 h-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5 7h4l5-5v20l-5-5H5a2 2 0 01-2-2V9a2 2 0 012-2z" 
          />
        </svg>
        <span>{currentVoice?.name || value}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 9l-7 7-7-7" 
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          {voices.map((voice) => (
            <button
              key={voice.id}
              onClick={() => {
                onChange(voice.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                value === voice.id 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {voice.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
