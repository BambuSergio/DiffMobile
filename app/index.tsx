import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Animated,
  Keyboard,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../context/ThemeContext';
import { computeDiff } from '../utils/diffEngine';
import { FontSizes, BorderRadius, Spacing } from '../constants/theme';
import DiffResultView, { DiffResultViewRef } from '../components/DiffResultView';
import ScrollableTextInput from '../components/ScrollableTextInputV2';
import * as LegacyFileSystem from 'expo-file-system/legacy';
const { readAsStringAsync } = LegacyFileSystem;

export default function CompareScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark, themeColors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();

  const originalText = useAppStore((state) => state.originalText);
  const modifiedText = useAppStore((state) => state.modifiedText);
  const diffLines = useAppStore((state) => state.diffLines);
  const diffStats = useAppStore((state) => state.diffStats);
  const hasCompared = useAppStore((state) => state.hasCompared);
  const ignoreWhitespace = useAppStore((state) => state.ignoreWhitespace);
  const ignoreCase = useAppStore((state) => state.ignoreCase);
  const ignoreEmptyLines = useAppStore((state) => state.ignoreEmptyLines);
  const flashMessage = useAppStore((state) => state.flashMessage);
  const setFlashMessage = useAppStore((state) => state.setFlashMessage);
  const fontSizeMode = useAppStore((state) => state.fontSizeMode);
  const setOriginalText = useAppStore((state) => state.setOriginalText);
  const setModifiedText = useAppStore((state) => state.setModifiedText);
  const setDiffResults = useAppStore((state) => state.setDiffResults);
  const clearTexts = useAppStore((state) => state.clearTexts);
  const swapTexts = useAppStore((state) => state.swapTexts);
  const undoOriginal = useAppStore((state) => state.undoOriginal);
  const redoOriginal = useAppStore((state) => state.redoOriginal);
  const undoModified = useAppStore((state) => state.undoModified);
  const redoModified = useAppStore((state) => state.redoModified);
  const canUndoOriginal = useAppStore((state) => state.canUndoOriginal);
  const canRedoOriginal = useAppStore((state) => state.canRedoOriginal);
  const canUndoModified = useAppStore((state) => state.canUndoModified);
  const canRedoModified = useAppStore((state) => state.canRedoModified);

  const [showResult, setShowResult] = useState(false);
  const [activeInput, setActiveInput] = useState<'original' | 'modified' | null>(null);
  const [selectionOriginal, setSelectionOriginal] = useState({ start: 0, end: 0 });
  const [selectionModified, setSelectionModified] = useState({ start: 0, end: 0 });
  const [selectionColorOriginal, setSelectionColorOriginal] = useState<string | undefined>(undefined);
  const [selectionColorModified, setSelectionColorModified] = useState<string | undefined>(undefined);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [compareButtonVisible, setCompareButtonVisible] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const scrollHintAnim = useRef(new Animated.Value(0)).current;
  const originalInputRef = useRef<any>(null);
  const modifiedInputRef = useRef<any>(null);
  const highlightTimerOriginal = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimerModified = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blinkIntervalOriginal = useRef<ReturnType<typeof setInterval> | null>(null);
  const blinkIntervalModified = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollHintTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diffResultViewRef = useRef<DiffResultViewRef>(null);
  const hasShownScrollHint = useRef(false);
  const compareButtonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      if (compareButtonTimer.current) {
        clearTimeout(compareButtonTimer.current);
      }
    };
  }, []);

  const fontSize = FontSizes[fontSizeMode];

  const findDifferenceRange = (text1: string, text2: string) => {
    let start = 0;
    const len1 = text1.length;
    const len2 = text2.length;
    const minLen = Math.min(len1, len2);
    while (start < minLen && text1[start] === text2[start]) {
      start++;
    }
    let end1 = len1 - 1;
    let end2 = len2 - 1;
    while (end1 >= start && end2 >= start && text1[end1] === text2[end2]) {
      end1--;
      end2--;
    }
    return { start, end: end2 + 1 };
  };

  const expandToWordBoundaries = (text: string, start: number, end: number) => {
    let expandedStart = start;
    while (expandedStart > 0 && !/\s/.test(text[expandedStart - 1])) {
      expandedStart--;
    }
    let expandedEnd = end;
    while (expandedEnd < text.length && !/\s/.test(text[expandedEnd])) {
      expandedEnd++;
    }
    return { start: expandedStart, end: expandedEnd };
  };

  const lightenColor = (color: string, percent: number) => {
    const hex = color.replace('#', '');
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    r = Math.round(r + (255 - r) * percent);
    g = Math.round(g + (255 - g) * percent);
    b = Math.round(b + (255 - b) * percent);
    return `rgba(${r}, ${g}, ${b}, 0.8)`;
  };

  const hideCompareButtonTemporarily = useCallback(() => {
    if (compareButtonTimer.current) {
      clearTimeout(compareButtonTimer.current);
    }
    
    setCompareButtonVisible(false);
    
    compareButtonTimer.current = setTimeout(() => {
      setCompareButtonVisible(true);
    }, 1000);
  }, []);

  const handleUndoOriginal = useCallback(() => {
    const oldText = originalText;
    undoOriginal();
    const newText = useAppStore.getState().originalText;
    const range = findDifferenceRange(oldText, newText);
    const { start, end } = expandToWordBoundaries(newText, range.start, range.end);
    
    if (highlightTimerOriginal.current) clearTimeout(highlightTimerOriginal.current);

    setSelectionOriginal({ start, end });
    setSelectionColorOriginal(lightenColor(themeColors.primary, 0.3));
    originalInputRef.current?.focus();

    highlightTimerOriginal.current = setTimeout(() => {
      setSelectionColorOriginal(undefined);
      setSelectionOriginal({ start: end, end });
    }, 600);
  }, [originalText, undoOriginal, themeColors.primary]);

  const handleRedoOriginal = useCallback(() => {
    const oldText = originalText;
    redoOriginal();
    const newText = useAppStore.getState().originalText;
    const range = findDifferenceRange(oldText, newText);
    const { start, end } = expandToWordBoundaries(newText, range.start, range.end);
    
    if (highlightTimerOriginal.current) clearTimeout(highlightTimerOriginal.current);

    setSelectionOriginal({ start, end });
    setSelectionColorOriginal(lightenColor(themeColors.primary, 0.3));
    originalInputRef.current?.focus();

    highlightTimerOriginal.current = setTimeout(() => {
      setSelectionColorOriginal(undefined);
      setSelectionOriginal({ start: end, end });
    }, 600);
  }, [originalText, redoOriginal, themeColors.primary]);

  const handleUndoModified = useCallback(() => {
    const oldText = modifiedText;
    undoModified();
    const newText = useAppStore.getState().modifiedText;
    const range = findDifferenceRange(oldText, newText);
    const { start, end } = expandToWordBoundaries(newText, range.start, range.end);
    
    if (highlightTimerModified.current) clearTimeout(highlightTimerModified.current);

    setSelectionModified({ start, end });
    setSelectionColorModified(lightenColor(themeColors.primary, 0.3));
    modifiedInputRef.current?.focus();

    highlightTimerModified.current = setTimeout(() => {
      setSelectionColorModified(undefined);
      setSelectionModified({ start: end, end });
    }, 600);
  }, [modifiedText, undoModified, themeColors.primary]);

  const handleRedoModified = useCallback(() => {
    const oldText = modifiedText;
    redoModified();
    const newText = useAppStore.getState().modifiedText;
    const range = findDifferenceRange(oldText, newText);
    const { start, end } = expandToWordBoundaries(newText, range.start, range.end);
    
    if (highlightTimerModified.current) clearTimeout(highlightTimerModified.current);

    setSelectionModified({ start, end });
    setSelectionColorModified(lightenColor(themeColors.primary, 0.3));
    modifiedInputRef.current?.focus();

    highlightTimerModified.current = setTimeout(() => {
      setSelectionColorModified(undefined);
      setSelectionModified({ start: end, end });
    }, 600);
  }, [modifiedText, redoModified, themeColors.primary]);

  // Flash message animation
  const toolbarScrollRef = useRef<ScrollView>(null);
  const [scrollX, setScrollX] = useState(0);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);
  const [layoutWidth, setLayoutWidth] = useState(0);

  const handleToolbarScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    setScrollX(contentOffset.x);
    setShowLeftArrow(contentOffset.x > 4);
    setShowRightArrow(contentOffset.x < contentSize.width - layoutMeasurement.width - 4);
    setContentWidth(contentSize.width);
    setLayoutWidth(layoutMeasurement.width);
  };

  const scrollToolbar = (direction: 'left' | 'right') => {
    const offset = direction === 'left'
      ? Math.max(0, scrollX - 80)
      : scrollX + 80;
    toolbarScrollRef.current?.scrollTo({ x: offset, animated: true });
  };

  useEffect(() => {
    if (flashMessage) {
      if (flashTimeout.current) {
        clearTimeout(flashTimeout.current);
      }
      flashAnim.setValue(0);
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [flashMessage, flashAnim]);

  const handleCompare = useCallback(() => {
    if (!originalText.trim() && !modifiedText.trim()) {
      Alert.alert(t('compare.compare'), t('compare.noTextToCompare'));
      return;
    }

    const { lines, stats } = computeDiff(originalText, modifiedText, {
      ignoreWhitespace,
      ignoreCase,
      ignoreEmptyLines,
    });
    // Reset scroll hint flag for new comparison
    hasShownScrollHint.current = false;
    setDiffResults(lines, stats);
    setShowResult(true);

    const totalDifferences = stats.added + stats.removed + stats.modified;
    if (totalDifferences === 0) {
      setFlashMessage(t('compare.noDifferences'));
      setTimeout(() => setFlashMessage(null), 2500);
    }

    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [originalText, modifiedText, ignoreWhitespace, ignoreCase, ignoreEmptyLines, setDiffResults, slideAnim, t, setFlashMessage]);

  const handleLoadFile = async (target: 'original' | 'modified') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const fileUri = result.assets[0].uri;
      const content = await readAsStringAsync(fileUri);

      if (target === 'original') {
        setOriginalText(content);
      } else {
        setModifiedText(content);
      }
    } catch (error) {
      console.error('Error loading file:', error);
      Alert.alert(t('compare.loadFile'), t('compare.fileLoadError'));
    }
  };

  const handleClear = () => {
    clearTexts();
    setShowResult(false);
    slideAnim.setValue(0);
    hasShownScrollHint.current = false; // Reset hint flag when clearing
  };

  const handleSwap = () => {
    swapTexts();
    if (hasCompared) {
      const { lines, stats } = computeDiff(
        modifiedText,
        originalText,
        { ignoreWhitespace, ignoreCase, ignoreEmptyLines }
      );
      setDiffResults(lines, stats);
    }
  };

  const showSummary = diffStats !== null && diffStats.total > 0;
  const hasDifferences = diffStats !== null && diffStats.added + diffStats.removed + diffStats.modified > 0;

  // Handle scroll state changes from DiffResultView - show flash notification for 3 seconds
  const handleScrollStateChange = useCallback((state: { isFirstDifferenceVisible: boolean; hasDifferencesBelow: boolean }) => {
    // Don't show hint if already shown once for this comparison
    if (hasShownScrollHint.current) return;

    const shouldShow = hasDifferences && state.hasDifferencesBelow && !state.isFirstDifferenceVisible;

    if (shouldShow) {
      hasShownScrollHint.current = true;

      // Clear any existing timeout
      if (scrollHintTimeout.current) {
        clearTimeout(scrollHintTimeout.current);
      }

      // Reset and animate in
      scrollHintAnim.setValue(0);
      Animated.timing(scrollHintAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      setShowScrollHint(true);

      // Auto-hide after 3 seconds
      scrollHintTimeout.current = setTimeout(() => {
        Animated.timing(scrollHintAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowScrollHint(false);
        });
      }, 3000);
    }
  }, [hasDifferences, scrollHintAnim]);

  const handleScrollHintPress = () => {
    // Hide the hint when pressed
    if (scrollHintTimeout.current) {
      clearTimeout(scrollHintTimeout.current);
    }
    Animated.timing(scrollHintAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowScrollHint(false);
    });
    diffResultViewRef.current?.scrollToFirstModified();
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header toolbar */}
      <View style={[styles.toolbar, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border, paddingTop: insets.top + Spacing.sm, paddingBottom: Spacing.sm, paddingHorizontal: Spacing.sm }]}>
        {/* Left scroll button */}
        {showLeftArrow && (
          <TouchableOpacity
            style={[styles.scrollArrowButton, styles.scrollArrowLeft, { backgroundColor: themeColors.surfaceSecondary, borderColor: themeColors.border }]}
            onPress={() => scrollToolbar('left')}
          >
            <Ionicons name="chevron-back" size={16} color={themeColors.textSecondary} />
          </TouchableOpacity>
        )}
        <ScrollView
          ref={toolbarScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingRight: Spacing.lg }}
          onScroll={handleToolbarScroll}
          scrollEventThrottle={16}
        >
          <TouchableOpacity
            style={[styles.toolbarButton, { backgroundColor: themeColors.surfaceSecondary }]}
            onPress={() => handleLoadFile(activeInput === 'modified' ? 'modified' : 'original')}
          >
            <Ionicons name="document-outline" size={18} color={themeColors.primary} />
            <Text style={[styles.toolbarButtonText, { color: themeColors.primary }]}>{t('compare.loadFile')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolbarButton, { backgroundColor: themeColors.surfaceSecondary }]}
            onPress={handleSwap}
          >
            <Ionicons name="swap-vertical-outline" size={18} color={themeColors.primary} />
            <Text style={[styles.toolbarButtonText, { color: themeColors.primary }]}>{t('compare.swapTexts')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolbarButton, { backgroundColor: themeColors.surfaceSecondary }]}
            onPress={handleClear}
          >
            <Ionicons name="trash-outline" size={18} color={themeColors.error} />
            <Text style={[styles.toolbarButtonText, { color: themeColors.error }]}>{t('compare.clearText')}</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, minWidth: Spacing.sm }} />

          <TouchableOpacity
            style={[styles.toolbarButton, { backgroundColor: themeColors.surfaceSecondary }]}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={18} color={themeColors.primary} />
          </TouchableOpacity>
        </ScrollView>
        {/* Right scroll button */}
        {showRightArrow && (
          <TouchableOpacity
            style={[styles.scrollArrowButton, styles.scrollArrowRight, { backgroundColor: themeColors.surfaceSecondary, borderColor: themeColors.border }]}
            onPress={() => scrollToolbar('right')}
          >
            <Ionicons name="chevron-forward" size={16} color={themeColors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {!showResult ? (
        <View style={{ flex: 1 }}>
          <ScrollView
            style={styles.inputContainer}
            contentContainerStyle={{ paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Original Text */}
            <View style={styles.inputSection}>
              <View style={styles.inputHeader}>
                <View style={[styles.inputBadge, { backgroundColor: themeColors.removedBorder }]}>
                  <Text style={styles.inputBadgeText}>A</Text>
                </View>
                <Text style={[styles.inputTitle, { color: themeColors.text }]}>{t('compare.originalTitle')}</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' }}>
                  <TouchableOpacity
                    style={[styles.undoButton, { backgroundColor: themeColors.surfaceSecondary, borderColor: themeColors.border, opacity: canUndoOriginal ? 1 : 0.4 }]}
                    onPress={handleUndoOriginal}
                    disabled={!canUndoOriginal}
                  >
                    <Ionicons name="arrow-undo" size={16} color={canUndoOriginal ? themeColors.primary : themeColors.textLight} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.undoButton, { backgroundColor: themeColors.surfaceSecondary, borderColor: themeColors.border, opacity: canRedoOriginal ? 1 : 0.4 }]}
                    onPress={handleRedoOriginal}
                    disabled={!canRedoOriginal}
                  >
                    <Ionicons name="arrow-redo" size={16} color={canRedoOriginal ? themeColors.primary : themeColors.textLight} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.pasteButton, { backgroundColor: themeColors.primary }]}
                  onPress={async () => {
                    const content = await Clipboard.getStringAsync();
                    setOriginalText(content);
                  }}
                >
                  <Ionicons name="clipboard-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.pasteButtonText}>{t('compare.pasteText')}</Text>
                </TouchableOpacity>
              </View>
              <ScrollableTextInput
                ref={originalInputRef}
                themeColors={themeColors}
                value={originalText}
                onChangeText={setOriginalText}
                placeholder={t('compare.placeholderOriginal')}
                placeholderTextColor={themeColors.textLight}
                onFocus={() => setActiveInput('original')}
                selection={selectionOriginal}
                selectionColor={selectionColorOriginal}
                onSelectionChange={(e) => {
                  if (highlightTimerOriginal.current) clearTimeout(highlightTimerOriginal.current);
                  setSelectionColorOriginal(undefined);
                  setSelectionOriginal(e.nativeEvent.selection);
                }}
                scrollbarColor={themeColors.primary}
                minHeight={150}
                maxHeight={Math.max(150, windowHeight * 0.25)}
                fontSize={fontSize}
              />
            </View>

            {/* Modified Text */}
            <View style={styles.inputSection}>
              <View style={styles.inputHeader}>
                <View style={[styles.inputBadge, { backgroundColor: themeColors.addedBorder }]}>
                  <Text style={styles.inputBadgeText}>B</Text>
                </View>
                <Text style={[styles.inputTitle, { color: themeColors.text }]}>{t('compare.modifiedTitle')}</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' }}>
                  <TouchableOpacity
                    style={[styles.undoButton, { backgroundColor: themeColors.surfaceSecondary, borderColor: themeColors.border, opacity: canUndoModified ? 1 : 0.4 }]}
                    onPress={handleUndoModified}
                    disabled={!canUndoModified}
                  >
                    <Ionicons name="arrow-undo" size={16} color={canUndoModified ? themeColors.primary : themeColors.textLight} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.undoButton, { backgroundColor: themeColors.surfaceSecondary, borderColor: themeColors.border, opacity: canRedoModified ? 1 : 0.4 }]}
                    onPress={handleRedoModified}
                    disabled={!canRedoModified}
                  >
                    <Ionicons name="arrow-redo" size={16} color={canRedoModified ? themeColors.primary : themeColors.textLight} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.pasteButton, { backgroundColor: themeColors.primary }]}
                  onPress={async () => {
                    const content = await Clipboard.getStringAsync();
                    setModifiedText(content);
                  }}
                >
                  <Ionicons name="clipboard-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.pasteButtonText}>{t('compare.pasteText')}</Text>
                </TouchableOpacity>
              </View>
              <ScrollableTextInput
                ref={modifiedInputRef}
                themeColors={themeColors}
                value={modifiedText}
                onChangeText={(text) => {
                  setModifiedText(text);
                  hideCompareButtonTemporarily();
                }}
                placeholder={t('compare.placeholderModified')}
                placeholderTextColor={themeColors.textLight}
                onFocus={() => {
                  setActiveInput('modified');
                  hideCompareButtonTemporarily();
                }}
                onScroll={() => hideCompareButtonTemporarily()}
                selection={selectionModified}
                selectionColor={selectionColorModified}
                onSelectionChange={(e) => {
                  if (highlightTimerModified.current) clearTimeout(highlightTimerModified.current);
                  setSelectionColorModified(undefined);
                  setSelectionModified(e.nativeEvent.selection);
                }}
                scrollbarColor={themeColors.primary}
                minHeight={150}
                maxHeight={Math.max(150, windowHeight * 0.25)}
                fontSize={fontSize}
              />
            </View>
          </ScrollView>

          {/* Compare button */}
          {compareButtonVisible && (
            <TouchableOpacity
              style={[
                styles.compareButton,
                {
                  backgroundColor: themeColors.primary,
                  bottom: keyboardHeight > 0 ? keyboardHeight + Spacing.sm : insets.bottom + Spacing.md,
                  opacity: 0.7
                }
              ]}
              onPress={handleCompare}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="file-compare" size={22} color="#FFFFFF" />
              <Text style={styles.compareButtonText}>{t('compare.compare')}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <Animated.View style={[styles.resultContainer, { opacity: slideAnim, transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] }]}>
          {/* Stats summary */}
          {showSummary && (
            <View style={[styles.statsContainer, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: themeColors.addedBorder }]} />
                <Text style={[styles.statValue, { color: themeColors.text }]}>{diffStats?.added}</Text>
                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{t('compare.addedLines')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: themeColors.removedBorder }]} />
                <Text style={[styles.statValue, { color: themeColors.text }]}>{diffStats?.removed}</Text>
                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{t('compare.removedLines')}</Text>
              </View>
              <View style={styles.statDivider} />
              <TouchableOpacity
                style={[styles.statItem, { position: 'relative' }]}
                onPress={() => diffResultViewRef.current?.scrollToFirstModified()}
              >
                <View style={[styles.statDot, { backgroundColor: themeColors.modifiedBorder }]} />
                <Text style={[styles.statValue, { color: themeColors.text }]}>{diffStats?.modified}</Text>
                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{t('compare.modifiedLines')}</Text>

                {/* Scroll hint flash notification - shown for 3 seconds */}
                <Animated.View
                  style={[
                    styles.scrollHintFlash,
                    {
                      opacity: scrollHintAnim,
                      backgroundColor: themeColors.modified,
                    },
                  ]}
                  pointerEvents={showScrollHint ? 'auto' : 'none'}
                >
                  <TouchableOpacity
                    style={styles.scrollHintButton}
                    onPress={handleScrollHintPress}
                  >
                    <Ionicons name="arrow-down-circle" size={18} color={themeColors.modifiedBorder} />
                    <Text style={[styles.scrollHintText, { color: themeColors.modifiedText }]}>
                      {t('compare.scrollToFirstDifference')}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </TouchableOpacity>
            </View>
          )}

          {/* Diff result */}
          <DiffResultView
            ref={diffResultViewRef}
            lines={diffLines}
            fontSize={fontSize}
            themeColors={themeColors}
            isDark={isDark}
            onScrollStateChange={handleScrollStateChange}
          />

          {/* Back to edit */}
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: themeColors.surfaceSecondary, borderColor: themeColors.border }]}
            onPress={() => {
              setShowResult(false);
              slideAnim.setValue(0);
              hasShownScrollHint.current = false; // Reset hint flag when going back
            }}
          >
            <Ionicons name="arrow-back-outline" size={18} color={themeColors.textSecondary} />
            <Text style={[styles.backButtonText, { color: themeColors.textSecondary }]}>{t('compare.back')}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Flash message overlay */}
      {flashMessage && (
        <Animated.View
          style={[
            styles.flashContainer,
            {
              opacity: flashAnim,
              backgroundColor: themeColors.success,
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.flashText}>{flashMessage}</Text>
        </Animated.View>
      )}

      {/* Bottom padding */}
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    borderBottomWidth: 1,
    position: 'relative',
  },
  scrollArrowButton: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    zIndex: 10,
  },
  scrollArrowLeft: {
    left: Spacing.sm,
  },
  scrollArrowRight: {
    right: Spacing.sm,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  toolbarButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  inputContainer: {
    flex: 1,
    padding: Spacing.md,
  },
  inputSection: {
    marginBottom: Spacing.md,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  inputBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  inputTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  pasteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  compareButton: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10,
  },
  compareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resultContainer: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E9ECEF',
  },
  scrollHintFlash: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  scrollHintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 6,
  },
  scrollHintText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  flashContainer: {
    position: 'absolute',
    top: '50%',
    left: '20%',
    right: '20%',
    transform: [{ translateY: -25 }],
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  flashText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
