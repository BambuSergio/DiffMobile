import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, ThemeMode, LanguageMode, FontSizeMode } from '../store/appStore';
import { useTheme } from '../context/ThemeContext';
import { BorderRadius, Spacing } from '../constants/theme';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark, themeColors } = useTheme();

  const themeMode = useAppStore((state) => state.themeMode);
  const languageMode = useAppStore((state) => state.languageMode);
  const fontSizeMode = useAppStore((state) => state.fontSizeMode);
  const ignoreWhitespace = useAppStore((state) => state.ignoreWhitespace);
  const ignoreCase = useAppStore((state) => state.ignoreCase);
  const ignoreEmptyLines = useAppStore((state) => state.ignoreEmptyLines);
  const isFullscreen = useAppStore((state) => state.isFullscreen);

  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const setLanguageMode = useAppStore((state) => state.setLanguageMode);
  const setFontSizeMode = useAppStore((state) => state.setFontSizeMode);
  const setIgnoreWhitespace = useAppStore((state) => state.setIgnoreWhitespace);
  const setIgnoreCase = useAppStore((state) => state.setIgnoreCase);
  const setIgnoreEmptyLines = useAppStore((state) => state.setIgnoreEmptyLines);
  const setIsFullscreen = useAppStore((state) => state.setIsFullscreen);
  const resetSettings = useAppStore((state) => state.resetSettings);

  const handleResetSettings = () => {
    Alert.alert(
      t('settings.resetSettings'),
      t('settings.settingsReset'),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: () => {
            resetSettings();
            if (languageMode === 'auto') {
              const langCode = i18n.language?.startsWith('es') ? 'es' : 'en';
              i18n.changeLanguage(langCode);
            } else {
              i18n.changeLanguage(languageMode);
            }
          },
        },
      ]
    );
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>{title}</Text>
      <View style={[styles.sectionContent, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
        {children}
      </View>
    </View>
  );

  const renderSetting = (
    icon: string,
    title: string,
    subtitle?: string,
    right?: React.ReactNode,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingHeader}>
        <View style={[styles.settingIcon, { backgroundColor: themeColors.primary + '15' }]}>
          <Ionicons name={icon as any} size={20} color={themeColors.primary} />
        </View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, { color: themeColors.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, { color: themeColors.textSecondary }]}>{subtitle}</Text>}
        </View>
      </View>
      {right && <View style={styles.settingRight}>{right}</View>}
    </TouchableOpacity>
  );

  const renderOptionRow = (
    options: { label: string; value: string }[],
    currentValue: string,
    onSelect: (value: string) => void
  ) => (
    <View style={styles.optionRow}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.optionButton,
            {
              backgroundColor: option.value === currentValue ? themeColors.primary : themeColors.surfaceSecondary,
              borderColor: option.value === currentValue ? themeColors.primary : themeColors.border,
            },
          ]}
          onPress={() => onSelect(option.value)}
        >
          <Text
            style={[
              styles.optionText,
              { color: option.value === currentValue ? '#FFFFFF' : themeColors.textSecondary },
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.lg }}
    >
      {/* Language */}
      {renderSection(
        t('settings.language'),
        <>
          {renderSetting(
            'language-outline',
            t('settings.language'),
            t('settings.languageDescription'),
            <View style={{ flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm }}>
              {renderOptionRow(
                [
                  { label: 'Auto', value: 'auto' },
                  { label: 'EN', value: 'en' },
                  { label: 'ES', value: 'es' },
                ],
                languageMode,
                (value) => {
                  setLanguageMode(value as LanguageMode);
                  if (value === 'auto') {
                    i18n.changeLanguage(i18n.language?.startsWith('es') ? 'es' : 'en');
                  } else {
                    i18n.changeLanguage(value);
                  }
                }
              )}
            </View>
          )}
        </>
      )}

      {/* Appearance */}
      {renderSection(
        t('settings.appearance'),
        <>
          {renderSetting(
            isDark ? 'moon-outline' : 'sunny-outline',
            t('settings.appearance'),
            t('settings.appearanceDescription'),
            <View style={{ flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm }}>
              {renderOptionRow(
                [
                  { label: t('settings.system'), value: 'system' },
                  { label: t('settings.light'), value: 'light' },
                  { label: t('settings.dark'), value: 'dark' },
                ],
                themeMode,
                (value) => setThemeMode(value as ThemeMode)
              )}
            </View>
          )}
          {renderSetting(
            'text-outline',
            t('settings.fontSize'),
            undefined,
            <View style={{ flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm }}>
              {renderOptionRow(
                [
                  { label: t('settings.small'), value: 'small' },
                  { label: t('settings.medium'), value: 'medium' },
                  { label: t('settings.large'), value: 'large' },
                ],
                fontSizeMode,
                (value) => setFontSizeMode(value as FontSizeMode)
              )}
            </View>
          )}
          {renderSetting(
            'expand-outline',
            t('settings.fullscreen'),
            undefined,
            <Switch
              value={isFullscreen}
              onValueChange={setIsFullscreen}
              trackColor={{ false: themeColors.border, true: themeColors.primary }}
              thumbColor="#FFFFFF"
            />
          )}
        </>
      )}

      {/* Diff options */}
      {renderSection(
        t('settings.diffOptions'),
        <>
          {renderSetting(
            'swap-horizontal-outline',
            t('settings.ignoreWhitespace'),
            undefined,
            <Switch
              value={ignoreWhitespace}
              onValueChange={setIgnoreWhitespace}
              trackColor={{ false: themeColors.border, true: themeColors.primary }}
              thumbColor="#FFFFFF"
            />
          )}
          {renderSetting(
            'text-outline',
            t('settings.ignoreCase'),
            undefined,
            <Switch
              value={ignoreCase}
              onValueChange={setIgnoreCase}
              trackColor={{ false: themeColors.border, true: themeColors.primary }}
              thumbColor="#FFFFFF"
            />
          )}
          {renderSetting(
            'list-outline',
            t('settings.ignoreEmptyLines'),
            undefined,
            <Switch
              value={ignoreEmptyLines}
              onValueChange={setIgnoreEmptyLines}
              trackColor={{ false: themeColors.border, true: themeColors.primary }}
              thumbColor="#FFFFFF"
            />
          )}
        </>
      )}

      {/* About */}
      {renderSection(
        t('settings.about'),
        <>
          {renderSetting(
            'information-circle-outline',
            t('settings.version'),
            '1.0.0'
          )}
          {renderSetting(
            'code-slash-outline',
            'DiffMobile',
            t('settings.description')
          )}
          {renderSetting(
            'document-text-outline',
            t('settings.license'),
            t('settings.licenseDescription'),
            undefined,
            () => {
              Alert.alert(
                t('settings.license'),
                t('settings.licenseFull'),
                [{ text: 'OK', style: 'cancel' }]
              );
            }
          )}
        </>
      )}

      {/* Reset */}
      <TouchableOpacity
        style={[styles.resetButton, { borderColor: themeColors.border }]}
        onPress={handleResetSettings}
      >
        <Ionicons name="refresh-outline" size={18} color={themeColors.error} />
        <Text style={[styles.resetButtonText, { color: themeColors.error }]}>{t('settings.resetSettings')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  sectionContent: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E9ECEF',
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    flexShrink: 0,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  settingRight: {
    marginLeft: 36 + Spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  optionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resetButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
