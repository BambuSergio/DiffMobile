import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useColorScheme, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import '../utils/i18n';
import * as Localization from 'expo-localization';
import { useAppStore } from '../store/appStore';
import { ThemeProvider } from '../context/ThemeContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { i18n } = useTranslation();
  const languageMode = useAppStore((state) => state.languageMode);
  const themeMode = useAppStore((state) => state.themeMode);
  const isFullscreen = useAppStore((state) => state.isFullscreen);

  useEffect(() => {
    // Apply language setting
    if (languageMode === 'auto') {
      const locale = Localization.getLocales()[0];
      const langCode = locale?.languageCode?.toLowerCase() || 'en';
      i18n.changeLanguage(langCode.startsWith('es') ? 'es' : 'en');
    } else {
      i18n.changeLanguage(languageMode);
    }
  }, [languageMode, i18n]);

  useEffect(() => {
    StatusBar.setHidden(isFullscreen, 'fade');
  }, [isFullscreen]);

  const isDark = themeMode === 'dark' || (themeMode === 'system' && colorScheme === 'dark');

  return (
    <ThemeProvider>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: isDark ? '#161B22' : '#FFFFFF',
          },
          headerTintColor: isDark ? '#E6EDF3' : '#1A1A2E',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 20,
          },
          contentStyle: {
            backgroundColor: isDark ? '#0D1117' : '#F8F9FA',
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'DiffMobile',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal' }}
        />
      </Stack>
    </ThemeProvider>
  );
}
