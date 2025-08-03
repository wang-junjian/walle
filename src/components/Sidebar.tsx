'use client';

import { useTranslation } from 'react-i18next';
import { AnimatedRobot } from './AnimatedRobot';

interface SidebarProps {
  selectedTab: string;
  onTabChange: (tab: string) => void;
}

interface SidebarItem {
  id: string;
  icon: React.ReactNode;
  labelKey: string;
  isComingSoon?: boolean;
}

export function Sidebar({ selectedTab, onTabChange }: SidebarProps) {
  const { t } = useTranslation();

  const sidebarItems: SidebarItem[] = [
    {
      id: 'chat',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      labelKey: 'sidebar.newChat'
    },
    {
      id: 'translator',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
      ),
      labelKey: 'sidebar.translator'
    }
  ];

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header with Logo and Title */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <AnimatedRobot 
            className="w-8 h-8" 
            isActive={false}
            status="idle"
            messageCount={0}
          />
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            {t('chat.title')}
          </h1>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (!item.isComingSoon) {
                onTabChange(item.id);
              }
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] ${
              selectedTab === item.id
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 shadow-md'
                : item.isComingSoon
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm hover:text-blue-600 dark:hover:text-blue-400'
            }`}
            disabled={item.isComingSoon}
            title={item.id === 'chat' ? t('chat.newChat') : undefined}
          >
            <span className={`transition-transform duration-200 ${
              !item.isComingSoon && selectedTab !== item.id ? 'group-hover:scale-110' : ''
            }`}>
              {item.icon}
            </span>
            <span className="flex-1 transition-all duration-200">{t(item.labelKey)}</span>
            {item.isComingSoon && (
              <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full transition-all duration-200">
                {t('sidebar.comingSoon')}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Settings at the bottom */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onTabChange('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] ${
            selectedTab === 'settings'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 shadow-md'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          <span className="transition-transform duration-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          <span className="transition-all duration-200">{t('sidebar.settings')}</span>
        </button>
      </div>
    </div>
  );
}
