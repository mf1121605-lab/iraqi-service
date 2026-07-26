import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { I18nManager } from 'react-native';

export type Locale = 'ar' | 'ckb';

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>('ar');

  useEffect(() => {
    AsyncStorage.getItem('locale').then((v) => {
      if (v === 'ar' || v === 'ckb') setLocaleState(v);
    });
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    AsyncStorage.setItem('locale', l);
    // Both Arabic and Kurdish Sorani are RTL
    if (!I18nManager.isRTL) {
      I18nManager.forceRTL(true);
    }
  }

  return { locale, setLocale };
}
