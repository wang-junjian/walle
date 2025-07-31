'use client';

import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

export function DynamicTitle() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = t('chat.title');
  }, [i18n.language, t]);

  return null;
}
