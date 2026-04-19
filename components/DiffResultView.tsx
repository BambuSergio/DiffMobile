import React, { useState, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { DiffLine, CharDiff } from '../types/diff';
import { applyChangesToOriginal, exportUnifiedDiff } from '../utils/diffEngine';
import { BorderRadius, Spacing } from '../constants/theme';
import { useAppStore } from '../store/appStore';
import * as LegacyFileSystem from 'expo-file-system/legacy';
const { writeAsStringAsync, documentDirectory } = LegacyFileSystem;

interface DiffResultViewProps {
  lines: DiffLine[];
  fontSize: number;
  themeColors: Record<string, string>;
  isDark: boolean;
  onScrollStateChange?: (state: { isFirstDifferenceVisible: boolean; hasDifferencesBelow: boolean }) => void;
}

export interface DiffResultViewRef {
  scrollToFirstModified: () => void;
}

const DiffResultView = forwardRef<DiffResultViewRef, DiffResultViewProps>(({ lines, fontSize, themeColors, isDark, onScrollStateChange }, ref) => {
  const { t } = useTranslation();
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());
  const originalText = useAppStore((state) => state.originalText);
  const modifiedText = useAppStore((state) => state.modifiedText);
  const setOriginalText = useAppStore((state) => state.setOriginalText);
  const setModifiedText = useAppStore((state) => state.setModifiedText);
  const setFlashMessage = useAppStore((state) => state.setFlashMessage);

  const scrollViewRef = useRef<ScrollView>(null);
  const linePositions = useRef<{ [key: number]: number }>({});
  const firstModifiedIndex = lines.findIndex(line => line.type === 'modified' || line.type === 'added' || line.type === 'removed');

  // Report scroll state to parent
  const reportScrollState = useCallback((scrollY: number, viewHeight: number, totalContentHeight: number) => {
    if (firstModifiedIndex === -1) {
      onScrollStateChange?.({ isFirstDifferenceVisible: true, hasDifferencesBelow: false });
      return;
    }

    const firstDiffY = linePositions.current[firstModifiedIndex] ?? firstModifiedIndex * 30;
    const isFirstVisible = firstDiffY >= scrollY && firstDiffY <= scrollY + viewHeight - 50;
    const hasBelow = totalContentHeight > viewHeight && firstDiffY > scrollY + viewHeight - 50;

    onScrollStateChange?.({ isFirstDifferenceVisible: isFirstVisible, hasDifferencesBelow: hasBelow });
  }, [firstModifiedIndex, onScrollStateChange]);

  useImperativeHandle(ref, () => ({
    scrollToFirstModified: () => {
      if (firstModifiedIndex !== -1 && scrollViewRef.current) {
        const yPos = linePositions.current[firstModifiedIndex] || (firstModifiedIndex * 30);
        scrollViewRef.current.scrollTo({ y: yPos, animated: true });
      }
    }
  }));

  const renderCharDiffs = (charDiffs: CharDiff[], isUp: boolean) => {
    return charDiffs.map((cd, idx) => {
      if (cd.isDifferent) {
        return (
          <Text
            key={idx}
            style={[
              styles.charDiff,
              {
                backgroundColor: isUp ? themeColors.charRemoved : themeColors.charAdded,
                color: isUp ? themeColors.removedText : themeColors.addedText,
                borderBottomWidth: 2,
                borderBottomColor: isUp ? themeColors.removedBorder : themeColors.addedBorder,
                borderRadius: 3,
                paddingHorizontal: 2,
                paddingVertical: 1,
                overflow: 'hidden',
              },
            ]}
          >
            {cd.value}
          </Text>
        );
      }
      return (
        <Text key={idx} style={{ color: themeColors.text }}>
          {cd.value}
        </Text>
      );
    });
  };

  const handleCopyLine = async (text: string) => {
    await Clipboard.setStringAsync(text);
  };

  const handleCopyAllUp = async () => {
    const result = applyChangesToOriginal(lines, 'right-to-left');
    await Clipboard.setStringAsync(result);
    Alert.alert(t('compare.copyResultDown'), t('compare.copiedToClipboard'));
  };

  const handleCopyAllDown = async () => {
    const result = applyChangesToOriginal(lines, 'left-to-right');
    await Clipboard.setStringAsync(result);
    Alert.alert(t('compare.copyResultUp'), t('compare.copiedToClipboard'));
  };

  const handleSaveDown = async () => {
    try {
      const fileUri = documentDirectory + 'texto_de_abajo.txt';
      await writeAsStringAsync(fileUri, modifiedText);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
    } catch {
      Alert.alert(t('compare.saveDown'), t('compare.fileSaveError'));
    }
  };

  const handleSaveUp = async () => {
    try {
      const fileUri = documentDirectory + 'texto_de_arriba.txt';
      await writeAsStringAsync(fileUri, originalText);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
    } catch {
      Alert.alert(t('compare.saveUp'), t('compare.fileSaveError'));
    }
  };

  const handleAcceptUp = async () => {
    const result = applyChangesToOriginal(lines, 'left-to-right');
    await Clipboard.setStringAsync(result);
    setOriginalText(result);
    Alert.alert(t('compare.acceptUp'), t('compare.copiedToClipboard') + '. ' + t('compare.textUpdated'));
  };

  const handleAcceptDown = async () => {
    const result = applyChangesToOriginal(lines, 'right-to-left');
    await Clipboard.setStringAsync(result);
    setModifiedText(result);
    Alert.alert(t('compare.acceptDown'), t('compare.copiedToClipboard') + '. ' + t('compare.textUpdated'));
  };

  const handleExportDiff = async () => {
    const upLines: string[] = [];
    const downLines: string[] = [];
    lines.forEach((line) => {
      if (line.left) upLines.push(line.left.text);
      if (line.right) downLines.push(line.right.text);
    });
    const diff = exportUnifiedDiff(upLines.join('\n'), downLines.join('\n'));
    const fileUri = documentDirectory + 'diff_output.diff';
    await writeAsStringAsync(fileUri, diff);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    }
  };

  // Send a single line's text from one side to the other and update the store
  const handleSendLineUp = (index: number, text: string) => {
    // Take text from right side (modified) and put it into original at the corresponding position
    const upLines = originalText.split('\n');
    const diffLine = lines[index];
    
    // Determine which line number to update in original text
    let targetLineIndex: number | null = null;
    
    if (diffLine.right) {
      // For added/modified lines on right, use the right line number
      targetLineIndex = diffLine.right.lineNumber - 1;
    } else if (diffLine.left) {
      // For removed lines, use the left line number  
      targetLineIndex = diffLine.left.lineNumber - 1;
    }
    
    if (targetLineIndex !== null) {
      if (targetLineIndex >= 0 && targetLineIndex < upLines.length) {
        upLines[targetLineIndex] = text;
      } else {
        // Pad with empty lines if needed
        while (upLines.length < targetLineIndex) {
          upLines.push('');
        }
        upLines.push(text);
      }
      const newText = upLines.join('\n');
      setOriginalText(newText);
    }
    
    setFlashMessage(t('compare.textSentUp'));
    setTimeout(() => setFlashMessage(null), 2500);
  };

  const handleSendLineDown = (index: number, text: string) => {
    // Take text from left side (original) and put it into modified at the corresponding position
    const downLines = modifiedText.split('\n');
    const diffLine = lines[index];
    
    // Determine which line number to update in modified text
    let targetLineIndex: number | null = null;
    
    if (diffLine.left) {
      // For removed/modified lines on left, use the left line number
      targetLineIndex = diffLine.left.lineNumber - 1;
    } else if (diffLine.right) {
      // For added lines, use the right line number
      targetLineIndex = diffLine.right.lineNumber - 1;
    }
    
    if (targetLineIndex !== null) {
      if (targetLineIndex >= 0 && targetLineIndex < downLines.length) {
        downLines[targetLineIndex] = text;
      } else {
        // Pad with empty lines if needed
        while (downLines.length < targetLineIndex) {
          downLines.push('');
        }
        downLines.push(text);
      }
      const newText = downLines.join('\n');
      setModifiedText(newText);
    }
    
    setFlashMessage(t('compare.textSentDown'));
    setTimeout(() => setFlashMessage(null), 2500);
  };

  const toggleLine = (index: number) => {
    const newSet = new Set(expandedLines);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedLines(newSet);
  };

  return (
    <View style={styles.container}>
      {/* Action buttons */}
      <View style={[styles.actionBar, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: themeColors.removed }]}
          onPress={handleCopyAllUp}
        >
          <Ionicons name="copy-outline" size={16} color={themeColors.removedText} />
          <Text style={[styles.actionButtonText, { color: themeColors.removedText }]}>{t('compare.copyUp')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: themeColors.added }]}
          onPress={handleCopyAllDown}
        >
          <Ionicons name="copy-outline" size={16} color={themeColors.addedText} />
          <Text style={[styles.actionButtonText, { color: themeColors.addedText }]}>{t('compare.copyDown')}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.actionBar, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: themeColors.surfaceSecondary }]}
          onPress={handleAcceptUp}
        >
          <Ionicons name="arrow-up-outline" size={16} color={themeColors.primary} />
          <Text style={[styles.actionButtonText, { color: themeColors.primary }]}>{t('compare.acceptUp')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: themeColors.surfaceSecondary }]}
          onPress={handleAcceptDown}
        >
          <Ionicons name="arrow-down-outline" size={16} color={themeColors.primary} />
          <Text style={[styles.actionButtonText, { color: themeColors.primary }]}>{t('compare.acceptDown')}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.actionBar, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: themeColors.surfaceSecondary }]}
          onPress={handleSaveUp}
        >
          <Ionicons name="save-outline" size={16} color={themeColors.textSecondary} />
          <Text style={[styles.actionButtonText, { color: themeColors.textSecondary }]}>{t('compare.saveUp')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: themeColors.surfaceSecondary }]}
          onPress={handleSaveDown}
        >
          <Ionicons name="save-outline" size={16} color={themeColors.textSecondary} />
          <Text style={[styles.actionButtonText, { color: themeColors.textSecondary }]}>{t('compare.saveDown')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: themeColors.surfaceSecondary }]}
          onPress={handleExportDiff}
        >
          <Ionicons name="download-outline" size={16} color={themeColors.textSecondary} />
          <Text style={[styles.actionButtonText, { color: themeColors.textSecondary }]}>Diff</Text>
        </TouchableOpacity>
      </View>

      {/* Diff lines */}
      <ScrollView
        style={styles.diffScroll}
        contentContainerStyle={styles.diffContent}
        ref={scrollViewRef}
        onScroll={(event) => {
          const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
          // Check if first difference is below the visible area
          if (firstModifiedIndex !== -1) {
            const firstDiffY = linePositions.current[firstModifiedIndex] ?? firstModifiedIndex * 30;
            const isBelow = firstDiffY > contentOffset.y + layoutMeasurement.height - 50;
            const contentExceeds = contentSize.height > layoutMeasurement.height;
            onScrollStateChange?.({
              isFirstDifferenceVisible: !isBelow && firstDiffY >= contentOffset.y,
              hasDifferencesBelow: contentExceeds && isBelow
            });
          } else {
            onScrollStateChange?.({ isFirstDifferenceVisible: true, hasDifferencesBelow: false });
          }
        }}
        scrollEventThrottle={100}
        onContentSizeChange={(width, height) => {
          // Initial check after content size is known
          if (firstModifiedIndex !== -1) {
            const firstDiffY = linePositions.current[firstModifiedIndex] ?? firstModifiedIndex * 30;
            scrollViewRef.current?.measure((x, y, w, viewHeight) => {
              if (viewHeight > 0) {
                const isBelow = firstDiffY > viewHeight - 50;
                const contentExceeds = height > viewHeight;
                onScrollStateChange?.({
                  isFirstDifferenceVisible: !isBelow,
                  hasDifferencesBelow: contentExceeds && isBelow
                });
              }
            });
          }
        }}
      >
        {lines.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="check-circle-outline" size={48} color={themeColors.success} />
            <Text style={[styles.emptyText, { color: themeColors.success }]}>{t('compare.noDifferences')}</Text>
          </View>
        )}

        {lines.map((line, index) => (
          <View 
            key={index} 
            style={styles.lineWrapper}
            onLayout={(event) => {
              const layout = event.nativeEvent.layout;
              linePositions.current[index] = layout.y;
            }}
          >
            {line.type === 'equal' && line.left && (
              <TouchableOpacity
                style={[styles.lineRow, { backgroundColor: themeColors.surface }]}
                onPress={() => toggleLine(index)}
              >
                <View style={[styles.lineNumber, { backgroundColor: themeColors.surfaceSecondary }]}>
                  <Text style={[styles.lineNumberText, { color: themeColors.textLight }]}>{line.left.lineNumber}</Text>
                </View>
                <Text style={[styles.lineText, { fontSize, color: themeColors.text }]}>{line.left.text || ' '}</Text>
              </TouchableOpacity>
            )}

            {line.type === 'removed' && line.left && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  style={[styles.lineRow, { backgroundColor: themeColors.removed, flex: 1 }]}
                  onPress={() => handleCopyLine(line.left!.text)}
                >
                  <View style={[styles.lineNumber, { backgroundColor: themeColors.removedBorder }]}>
                    <Text style={[styles.lineNumberText, { color: '#FFFFFF' }]}>{line.left.lineNumber}</Text>
                  </View>
                  <View style={styles.lineContent}>
                    {renderCharDiffs(line.left.charDiffs, true)}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sendButton, { backgroundColor: themeColors.removedBorder }]}
                  onPress={() => handleSendLineDown(index, line.left!.text)}
                >
                  <Ionicons name="arrow-down-outline" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}

            {line.type === 'added' && line.right && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  style={[styles.lineRow, { backgroundColor: themeColors.added, flex: 1 }]}
                  onPress={() => handleCopyLine(line.right!.text)}
                >
                  <View style={[styles.lineNumber, { backgroundColor: themeColors.addedBorder }]}>
                    <Text style={[styles.lineNumberText, { color: '#FFFFFF' }]}>{line.right.lineNumber}</Text>
                  </View>
                  <View style={styles.lineContent}>
                    {renderCharDiffs(line.right.charDiffs, false)}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sendButton, { backgroundColor: themeColors.addedBorder }]}
                  onPress={() => handleSendLineUp(index, line.right!.text)}
                >
                  <Ionicons name="arrow-up-outline" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}

            {line.type === 'modified' && line.left && line.right && (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity
                    style={[styles.lineRow, styles.lineRowModified, { backgroundColor: themeColors.modified, flex: 1 }]}
                    onPress={() => handleCopyLine(line.left!.text)}
                  >
                    <View style={[styles.lineNumber, { backgroundColor: themeColors.modifiedBorder }]}>
                      <Text style={[styles.lineNumberText, { color: '#FFFFFF' }]}>{line.left.lineNumber}</Text>
                    </View>
                    <View style={styles.lineContent}>
                      {renderCharDiffs(line.left.charDiffs, true)}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sendButton, { backgroundColor: themeColors.modifiedBorder }]}
                    onPress={() => handleSendLineDown(index, line.left!.text)}
                  >
                    <Ionicons name="arrow-down-outline" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity
                    style={[styles.lineRow, styles.lineRowModified, { backgroundColor: themeColors.added, borderTopWidth: 0.5, borderTopColor: themeColors.modifiedBorder, flex: 1 }]}
                    onPress={() => handleCopyLine(line.right!.text)}
                  >
                    <View style={[styles.lineNumber, { backgroundColor: themeColors.addedBorder }]}>
                      <Text style={[styles.lineNumberText, { color: '#FFFFFF' }]}>{line.right.lineNumber}</Text>
                    </View>
                    <View style={styles.lineContent}>
                      {renderCharDiffs(line.right.charDiffs, false)}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sendButton, { backgroundColor: themeColors.addedBorder }]}
                    onPress={() => handleSendLineUp(index, line.right!.text)}
                  >
                    <Ionicons name="arrow-up-outline" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

DiffResultView.displayName = 'DiffResultView';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actionBar: {
    flexDirection: 'row',
    padding: Spacing.xs,
    gap: Spacing.xs,
    borderBottomWidth: 1,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  diffScroll: {
    flex: 1,
  },
  diffContent: {
    paddingBottom: Spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  lineWrapper: {
    marginBottom: 1,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  lineRowModified: {
    borderColor: 'transparent',
  },
  lineNumber: {
    minWidth: 32,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  lineNumberText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  lineContent: {
    flex: 1,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  lineText: {
    fontFamily: 'monospace',
    lineHeight: 20,
    flex: 1,
  },
  lineAction: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderLeftWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  charDiff: {
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  sendButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    marginHorizontal: Spacing.xs,
    marginVertical: Spacing.xs,
  },
});

export default DiffResultView;
