import type { Preview } from '@storybook/react-vite'

import '@blueprintjs/core/lib/css/blueprint.css'
import { Colors } from '@blueprintjs/core'
import i18next from 'i18next'
import React, { useEffect } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { Provider } from 'react-redux'

import type { RootState } from '../poi-types'

import enUS from '../i18n/en-US.json'
import jaJP from '../i18n/ja-JP.json'
import koKR from '../i18n/ko-KR.json'
import zhCN from '../i18n/zh-CN.json'
import zhTW from '../i18n/zh-TW.json'

type StoryStore = {
  dispatch: (action: unknown) => unknown
  getState: () => RootState
  replaceReducer: () => void
  subscribe: () => () => void
}

const localeResources = {
  'en-US': enUS,
  'ja-JP': jaJP,
  'ko-KR': koKR,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
}

type Locale = keyof typeof localeResources

type Theme = 'light' | 'dark'

const locales = Object.keys(localeResources) as Locale[]

const getLocale = (locale: unknown): Locale =>
  locales.includes(locale as Locale) ? (locale as Locale) : 'en-US'

const getTheme = (theme: unknown): Theme =>
  theme === 'dark' ? 'dark' : 'light'

declare global {
  interface Window {
    ROOT: string
    ticker: {
      reg: (id: string, callback: (currentTime: number) => void) => void
      unreg: (id: string) => void
    }
  }
}

const i18n = i18next.createInstance()

void i18n.use(initReactI18next).init({
  fallbackLng: 'en-US',
  interpolation: {
    escapeValue: false,
  },
  lng: 'en-US',
  ns: ['poi-plugin-anchorage-repair', 'resources'],
  resources: Object.fromEntries(
    Object.entries(localeResources).map(([locale, resources]) => [
      locale,
      {
        'poi-plugin-anchorage-repair': resources,
        resources: {},
      },
    ]),
  ),
})

window.ROOT = window.ROOT || ''
window.ticker = window.ticker || {
  reg: (_id, callback) => callback(Date.now()),
  unreg: () => undefined,
}

const createStore = (state: RootState): StoryStore => ({
  dispatch: (action) => action,
  getState: () => state,
  replaceReducer: () => undefined,
  subscribe: () => () => undefined,
})

const StoryFrame: React.FC<{
  Story: React.ComponentType
  locale: Locale
  state: RootState
  theme: Theme
}> = ({ Story, locale, state, theme }) => {
  useEffect(() => {
    void i18n.changeLanguage(locale)
  }, [locale])

  const isDark = theme === 'dark'

  return (
    <I18nextProvider i18n={i18n}>
      <Provider store={createStore(state)}>
        <div
          className={isDark ? 'bp5-dark' : undefined}
          style={{
            background: isDark ? Colors.DARK_GRAY2 : Colors.WHITE,
            boxSizing: 'border-box',
            color: isDark ? Colors.LIGHT_GRAY5 : Colors.DARK_GRAY1,
            minHeight: '100vh',
            padding: 16,
          }}
        >
          <Story />
        </div>
      </Provider>
    </I18nextProvider>
  )
}

const preview: Preview = {
  decorators: [
    (Story, context) => {
      const state = context.parameters.pluginState as RootState
      const locale = getLocale(context.globals.locale)
      const theme = getTheme(context.globals.theme)

      return (
        <StoryFrame Story={Story} locale={locale} state={state} theme={theme} />
      )
    },
  ],
  globalTypes: {
    theme: {
      defaultValue: 'light',
      toolbar: {
        dynamicTitle: true,
        icon: 'circlehollow',
        items: [
          { title: 'Light', value: 'light' },
          { title: 'Dark', value: 'dark' },
        ],
        title: 'Theme',
      },
    },
    locale: {
      defaultValue: 'en-US',
      toolbar: {
        dynamicTitle: true,
        icon: 'globe',
        items: [
          { title: 'English', value: 'en-US' },
          { title: 'Japanese', value: 'ja-JP' },
          { title: 'Korean', value: 'ko-KR' },
          { title: 'Simplified Chinese', value: 'zh-CN' },
          { title: 'Traditional Chinese', value: 'zh-TW' },
        ],
        title: 'Locale',
      },
    },
  },
  initialGlobals: {
    locale: 'en-US',
    theme: 'light',
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
