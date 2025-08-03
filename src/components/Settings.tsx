'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ModelSelector } from './ModelSelector';
import { LanguageSelector } from './LanguageSelector';
import VoiceSelector from './VoiceSelector';
import { voiceConfig } from '@/config/voice';

interface SettingsProps {
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

export function Settings({ selectedModel, onModelChange }: SettingsProps) {
  const { t } = useTranslation();
  const [selectedVoice, setSelectedVoice] = useState(voiceConfig.defaultVoice);
  const [darkMode, setDarkMode] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    const savedAutoSave = localStorage.getItem('autoSave');
    const savedSoundEnabled = localStorage.getItem('soundEnabled');
    const savedVoice = localStorage.getItem('selectedVoice');

    if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode));
    if (savedAutoSave) setAutoSave(JSON.parse(savedAutoSave));
    if (savedSoundEnabled) setSoundEnabled(JSON.parse(savedSoundEnabled));
    if (savedVoice) setSelectedVoice(savedVoice);
  }, []);

  // Save settings to localStorage
  const saveSettings = () => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    localStorage.setItem('autoSave', JSON.stringify(autoSave));
    localStorage.setItem('soundEnabled', JSON.stringify(soundEnabled));
    localStorage.setItem('selectedVoice', selectedVoice);
  };

  const handleDarkModeToggle = () => {
    setDarkMode(!darkMode);
    // Apply dark mode to document
    if (!darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleExportData = () => {
    // TODO: 实现数据导出功能
    const data = {
      settings: {
        darkMode,
        autoSave,
        soundEnabled,
        selectedVoice,
        selectedModel
      },
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `walle-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.settings) {
          setDarkMode(data.settings.darkMode || false);
          setAutoSave(data.settings.autoSave !== undefined ? data.settings.autoSave : true);
          setSoundEnabled(data.settings.soundEnabled !== undefined ? data.settings.soundEnabled : true);
          setSelectedVoice(data.settings.selectedVoice || voiceConfig.defaultVoice);
          if (data.settings.selectedModel && onModelChange) {
            onModelChange(data.settings.selectedModel);
          }
        }
      } catch (error) {
        console.error('Error importing settings:', error);
        alert(t('settings.importError'));
      }
    };
    reader.readAsText(file);
  };

  const handleResetSettings = () => {
    if (confirm(t('settings.resetConfirm'))) {
      setDarkMode(false);
      setAutoSave(true);
      setSoundEnabled(true);
      setSelectedVoice(voiceConfig.defaultVoice);
      if (onModelChange) {
        onModelChange('');
      }
      localStorage.clear();
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="h-full flex justify-center">
      <div className="h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden w-full max-w-5xl">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            {t('settings.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('settings.description')}
          </p>
        </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* AI Settings */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            {t('settings.aiSettings')}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('chat.modelSelector')}
              </label>
              {onModelChange && (
                <ModelSelector onModelChange={onModelChange} />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('voice.selector')}
              </label>
              <VoiceSelector 
                value={selectedVoice} 
                onChange={setSelectedVoice} 
              />
            </div>
          </div>
        </section>

        {/* Appearance Settings */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            {t('settings.appearance')}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('chat.languageSelector')}
              </label>
              <LanguageSelector />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.darkMode')}
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('settings.darkModeDescription')}
                </p>
              </div>
              <button
                onClick={handleDarkModeToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  darkMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* General Settings */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            {t('settings.general')}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.autoSave')}
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('settings.autoSaveDescription')}
                </p>
              </div>
              <button
                onClick={() => setAutoSave(!autoSave)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSave ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoSave ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.soundEnabled')}
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('settings.soundEnabledDescription')}
                </p>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  soundEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            {t('settings.dataManagement')}
          </h3>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={saveSettings}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200"
              >
                {t('settings.saveSettings')}
              </button>
              <button
                onClick={handleExportData}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
              >
                {t('settings.exportData')}
              </button>
              <label className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors duration-200 cursor-pointer text-center">
                {t('settings.importData')}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleResetSettings}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
              >
                {t('settings.resetSettings')}
              </button>
            </div>
          </div>
        </section>

        {/* About */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            {t('settings.about')}
          </h3>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('settings.version')}:</span>
                <span className="text-gray-800 dark:text-white">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('settings.buildDate')}:</span>
                <span className="text-gray-800 dark:text-white">2024-08-03</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('settings.license')}:</span>
                <span className="text-gray-800 dark:text-white">MIT</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
    </div>
  );
}
