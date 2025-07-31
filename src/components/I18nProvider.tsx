'use client';

import { useEffect } from 'react';
import '../i18n/config';
import { DynamicHtmlLang } from './DynamicHtmlLang';
import { DynamicTitle } from './DynamicTitle';

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  useEffect(() => {
    // Initialize i18n on client side
    import('../i18n/config');
  }, []);

  return (
    <>
      <DynamicHtmlLang />
      <DynamicTitle />
      {children}
    </>
  );
}
