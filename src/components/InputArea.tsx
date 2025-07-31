'use client';

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Mic, Image as ImageIcon, X, Loader2 } from 'lucide-react';

interface InputAreaProps {
  input: string;
  setInput: (value: string) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
}

export function InputArea({
  input,
  setInput,
  selectedFile,
  setSelectedFile,
  onSendMessage,
  onKeyPress,
  isLoading
}: InputAreaProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    }
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVoiceToggle = () => {
    // Voice recording functionality to be implemented
    setIsRecording(!isRecording);
  };

  return (
    <div className="space-y-3">
      {selectedFile && (
        <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
          <ImageIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
            {selectedFile.name}
          </span>
          <button
            onClick={handleRemoveFile}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <div className="flex-1">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder={t('chat.typeMessage')}
            className="w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={2}
            style={{ minHeight: '80px', maxHeight: '240px' }}
            disabled={isLoading}
          />
        </div>
        
        <div className="flex space-x-1">
          <button
            onClick={handleImageUpload}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
            disabled={isLoading}
            title={t('chat.uploadImage')}
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          
          <button
            onClick={handleVoiceToggle}
            className={`p-2 rounded-lg transition-colors ${
              isRecording
                ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
            disabled={isLoading}
            title={isRecording ? t('voice.stopRecording') : t('voice.startRecording')}
          >
            <Mic className={`h-5 w-5 ${isRecording ? 'animate-pulse' : ''}`} />
          </button>
          
          <button
            onClick={onSendMessage}
            disabled={(!input.trim() && !selectedFile) || isLoading}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={t('chat.sendMessage')}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
