'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface DebugConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logModelCalls: boolean;
  logApiRequests: boolean;
  logToolExecutions: boolean;
  outputToFile: boolean;
  logFilePath: string;
}

interface DebugSettingsProps {
  onClose?: () => void;
}

export function DebugSettings({ onClose }: DebugSettingsProps) {
  const _t = useTranslation(); // Keep for future use
  const [debugConfig, setDebugConfig] = useState<DebugConfig>({
    enabled: false,
    logLevel: 'info',
    logModelCalls: false,
    logApiRequests: false,
    logToolExecutions: false,
    outputToFile: false,
    logFilePath: './debug.log'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 加载当前调试配置
  useEffect(() => {
    const loadDebugConfig = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/debug-config');
        const result = await response.json();
        
        if (result.success) {
          setDebugConfig(result.data);
        } else {
          setError('Failed to load debug configuration');
        }
      } catch (err) {
        setError('Failed to load debug configuration');
        console.error('Error loading debug config:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDebugConfig();
  }, []);

  // 保存调试配置
  const saveDebugConfig = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      const response = await fetch('/api/debug-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ debugConfig }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || 'Failed to save debug configuration');
      }
    } catch (err) {
      setError('Failed to save debug configuration');
      console.error('Error saving debug config:', err);
    } finally {
      setSaving(false);
    }
  };

  // 更新配置字段
  const updateConfig = (field: keyof DebugConfig, value: string | boolean) => {
    setDebugConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Loading debug settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              调试设置
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
              <p className="text-green-800 dark:text-green-200 text-sm">配置保存成功！</p>
            </div>
          )}

          {/* 启用调试模式 */}
          <div className="space-y-2">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={debugConfig.enabled}
                onChange={(e) => updateConfig('enabled', e.target.checked)}
                className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  启用调试模式
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  开启后将记录详细的调试信息
                </p>
              </div>
            </label>
          </div>

          {/* 日志级别 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 dark:text-white">
              日志级别
            </label>
            <select
              value={debugConfig.logLevel}
              onChange={(e) => updateConfig('logLevel', e.target.value)}
              disabled={!debugConfig.enabled}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            >
              <option value="debug">Debug (最详细)</option>
              <option value="info">Info (一般信息)</option>
              <option value="warn">Warning (警告)</option>
              <option value="error">Error (仅错误)</option>
            </select>
          </div>

          {/* 具体日志选项 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              日志内容选项
            </h3>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={debugConfig.logModelCalls}
                onChange={(e) => updateConfig('logModelCalls', e.target.checked)}
                disabled={!debugConfig.enabled}
                className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
              />
              <div>
                <span className="text-sm text-gray-900 dark:text-white">
                  记录模型调用
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  记录发送给AI模型的输入和输出
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={debugConfig.logApiRequests}
                onChange={(e) => updateConfig('logApiRequests', e.target.checked)}
                disabled={!debugConfig.enabled}
                className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
              />
              <div>
                <span className="text-sm text-gray-900 dark:text-white">
                  记录API请求
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  记录所有API请求的详细信息
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={debugConfig.logToolExecutions}
                onChange={(e) => updateConfig('logToolExecutions', e.target.checked)}
                disabled={!debugConfig.enabled}
                className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
              />
              <div>
                <span className="text-sm text-gray-900 dark:text-white">
                  记录工具执行
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  记录搜索、代码执行等工具的使用情况
                </p>
              </div>
            </label>
          </div>

          {/* 文件输出选项 */}
          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={debugConfig.outputToFile}
                onChange={(e) => updateConfig('outputToFile', e.target.checked)}
                disabled={!debugConfig.enabled}
                className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
              />
              <span className="text-sm text-gray-900 dark:text-white">
                输出到文件
              </span>
            </label>

            {debugConfig.outputToFile && (
              <div className="space-y-2 ml-7">
                <label className="block text-sm font-medium text-gray-900 dark:text-white">
                  日志文件路径
                </label>
                <input
                  type="text"
                  value={debugConfig.logFilePath}
                  onChange={(e) => updateConfig('logFilePath', e.target.value)}
                  disabled={!debugConfig.enabled}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                  placeholder="./debug.log"
                />
              </div>
            )}
          </div>

          {/* 说明文本 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              <strong>注意：</strong> 调试模式会记录详细信息，可能包含敏感数据。请仅在开发或调试时启用，并确保妥善处理日志文件。
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex space-x-3">
            <button
              onClick={saveDebugConfig}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
            >
              {saving ? '保存中...' : '保存设置'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md transition-colors duration-200"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
