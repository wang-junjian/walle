'use client';

import { useTranslation } from 'react-i18next';
import { ConversationSummary } from '@/types/conversation';

interface ConversationListProps {
  conversations: ConversationSummary[];
  currentConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
}

export function ConversationList({ 
  conversations, 
  currentConversationId, 
  onSelectConversation,
  onDeleteConversation 
}: ConversationListProps) {
  const { t } = useTranslation();

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return t('conversations.today');
    } else if (diffInDays === 1) {
      return t('conversations.yesterday');
    } else if (diffInDays <= 7) {
      return t('conversations.lastWeek');
    } else {
      return t('conversations.older');
    }
  };

  const groupedConversations = conversations.reduce((groups, conv) => {
    const dateGroup = formatDate(conv.updatedAt);
    if (!groups[dateGroup]) {
      groups[dateGroup] = [];
    }
    groups[dateGroup].push(conv);
    return groups;
  }, {} as Record<string, ConversationSummary[]>);

  const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (window.confirm(t('conversations.confirmDelete'))) {
      onDeleteConversation(conversationId);
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
        {t('conversations.noConversations')}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {Object.entries(groupedConversations).map(([dateGroup, convs]) => (
        <div key={dateGroup} className="mb-4">
          {/* 日期分组标题 */}
          <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {dateGroup}
          </div>
          
          {/* 对话列表 */}
          <div className="space-y-1">
            {convs.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group relative px-3 py-2 mx-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  currentConversationId === conv.id
                    ? 'bg-blue-100 dark:bg-blue-900 border-l-2 border-blue-500'
                    : 'hover:border-l-2 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                {/* 对话标题 */}
                <div className="text-sm font-medium text-gray-800 dark:text-white truncate pr-6">
                  {conv.title}
                </div>
                
                {/* 最后一条消息预览 */}
                {conv.lastMessage && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1 pr-6">
                    {conv.lastMessage}
                  </div>
                )}
                
                {/* 消息数量 */}
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {conv.messageCount} 条消息
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={(e) => handleDeleteClick(e, conv.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900 text-red-500 dark:text-red-400"
                  title={t('conversations.deleteConversation')}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
