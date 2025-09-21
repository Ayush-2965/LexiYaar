"use client";
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';


import en from '../locales/en.json';
import hi from '../locales/hi.json';
import bn from '../locales/bn.json';
import gu from '../locales/gu.json';
import mr from '../locales/mr.json';
import ta from '../locales/ta.json';
import te from '../locales/te.json';
import kn from '../locales/kn.json';
import ml from '../locales/ml.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';
import zh from '../locales/zh.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  bn: { translation: bn },
  gu: { translation: gu },
  mr: { translation: mr },
  ta: { translation: ta },
  te: { translation: te },
  kn: { translation: kn },
  ml: { translation: ml },
  de: { translation: de },
  fr: { translation: fr },
  zh: { translation: zh },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
