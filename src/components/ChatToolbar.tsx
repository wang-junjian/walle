'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Volume2, 
  VolumeX, 
  Square,
  Copy, 
  Share2, 
  RotateCcw, 
  BarChart3,
  CheckCircle
} from 'lucide-react';
import { Message } from '@/types/chat';
import { synthesizeSpeech, playAudio, stopAudio, isAudioPlaying } from '@/utils/voice';

interface ChatToolbarProps {
  message: Message;
  selectedVoice?: string;
  onRegenerate?: () => void;
}

export function ChatToolbar({ message, selectedVoice, onRegenerate }: ChatToolbarProps) {
  const { t } = useTranslation();
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showTokenStats, setShowTokenStats] = useState(false);
  const [tokenStatsSticky, setTokenStatsSticky] = useState(false);

  // 检查音频播放状态
  useEffect(() => {
    const checkPlayingStatus = () => {
      setIsPlaying(isAudioPlaying());
    };

    // 定期检查播放状态
    const interval = setInterval(checkPlayingStatus, 100);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  // 语音朗读功能
  const handlePlaySpeech = async () => {
    if (!message.content || isSynthesizing) return;
    
    try {
      setIsSynthesizing(true);
      const audioBlob = await synthesizeSpeech(message.content, selectedVoice);
      setIsSynthesizing(false);
      setIsPlaying(true);
      
      // 播放音频，无论是正常结束还是被停止，都会resolve
      await playAudio(audioBlob);
      setIsPlaying(false);
    } catch (error) {
      console.error('Text-to-speech error:', error);
      setIsPlaying(false);
      setIsSynthesizing(false);
      
      let errorMessage = t('voice.synthesisFailed');
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = t('voice.networkError');
        } else if (error.message.includes('401')) {
          errorMessage = t('voice.apiKeyError');
        } else if (error.message.includes('429')) {
          errorMessage = t('voice.rateLimitError');
        } else if (error.message.includes('500')) {
          errorMessage = t('voice.serverError');
        } else if (error.message.includes('音频播放失败')) {
          errorMessage = t('voice.audioPlayError');
        }
      }
      
      alert(errorMessage);
    }
  };

  // 停止语音播放
  const handleStopSpeech = () => {
    stopAudio();
    setIsPlaying(false);
  };

  // 复制功能
  const handleCopy = async () => {
    if (!message.content) return;
    
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      alert(t('toolbar.copyFailed'));
    }
  };

  // 分享功能
  const handleShare = async () => {
    if (!message.content) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('toolbar.shareTitle'),
          text: message.content
        });
      } catch (error) {
        console.error('Failed to share:', error);
      }
    } else {
      // 回退到复制链接
      handleCopy();
    }
  };

  // 词元统计浮动框
  const TokenStatsTooltip = () => {
    if (!message.stats) return null;

    return (
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
        <div className="bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg p-3 shadow-2xl min-w-48 border border-gray-700 dark:border-gray-600">
          <div className="flex items-center gap-1 mb-2 font-medium">
            <BarChart3 className="h-3 w-3" />
            <span>{t('stats.tokenStatistics')}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">{t('stats.inputTokens')}:</span>
              <span>{message.stats.inputTokens}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">{t('stats.outputTokens')}:</span>
              <span>{message.stats.outputTokens}</span>
            </div>
            <div className="flex justify-between border-t border-gray-700 pt-1">
              <span className="text-gray-300">{t('stats.totalTokens')}:</span>
              <span className="font-medium">{message.stats.totalTokens}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">{t('stats.duration')}:</span>
              <span>{message.stats.duration}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">{t('stats.tokensPerSecond')}:</span>
              <span>{message.stats.tokensPerSecond} t/s</span>
            </div>
          </div>
          {/* 箭头 */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
      {/* 语音朗读/停止 */}
      {isPlaying ? (
        <button
          onClick={handleStopSpeech}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title={t('toolbar.stopAudio')}
        >
          <Square className="h-4 w-4 text-red-500 hover:text-red-600" />
        </button>
      ) : (
        <button
          onClick={handlePlaySpeech}
          disabled={isSynthesizing || !message.content}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={t('toolbar.playAudio')}
        >
          {isSynthesizing ? (
            <VolumeX className="h-4 w-4 opacity-50" />
          ) : (
            <Volume2 className="h-4 w-4 opacity-75 hover:opacity-100" />
          )}
        </button>
      )}

      {/* 复制 */}
      <button
        onClick={handleCopy}
        disabled={!message.content}
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={t('toolbar.copy')}
      >
        {isCopied ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 opacity-75 hover:opacity-100" />
        )}
      </button>

      {/* 分享 */}
      <button
        onClick={handleShare}
        disabled={!message.content}
        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={t('toolbar.share')}
      >
        <Share2 className="h-4 w-4 opacity-75 hover:opacity-100" />
      </button>

      {/* 重新生成 */}
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title={t('toolbar.regenerate')}
        >
          <RotateCcw className="h-4 w-4 opacity-75 hover:opacity-100" />
        </button>
      )}

      {/* 词元统计 */}
      {message.stats && (
        <div className="relative">
          <button
            onClick={() => {
              setTokenStatsSticky(!tokenStatsSticky);
              setShowTokenStats(!tokenStatsSticky);
            }}
            onMouseEnter={() => !tokenStatsSticky && setShowTokenStats(true)}
            onMouseLeave={() => !tokenStatsSticky && setShowTokenStats(false)}
            className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              tokenStatsSticky ? 'bg-blue-100 dark:bg-blue-800' : ''
            }`}
            title={t('toolbar.tokenStats')}
          >
            <BarChart3 className={`h-4 w-4 ${
              tokenStatsSticky 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'opacity-75 hover:opacity-100'
            }`} />
          </button>
          {(showTokenStats || tokenStatsSticky) && <TokenStatsTooltip />}
        </div>
      )}
    </div>
  );
}
