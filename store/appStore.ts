import { create } from 'zustand';
import { DiffLine, DiffStats } from '../types/diff';

export type ThemeMode = 'system' | 'light' | 'dark';
export type LanguageMode = 'auto' | 'en' | 'es';
export type FontSizeMode = 'small' | 'medium' | 'large';

const MAX_HISTORY = 50;

interface AppState {
  // Texts
  originalText: string;
  modifiedText: string;
  setOriginalText: (text: string, trackHistory?: boolean) => void;
  setModifiedText: (text: string, trackHistory?: boolean) => void;
  setTexts: (original: string, modified: string, trackHistory?: boolean) => void;
  swapTexts: () => void;
  clearTexts: () => void;

  // Undo/Redo history
  originalHistory: string[];
  modifiedHistory: string[];
  historyIndexOriginal: number;
  historyIndexModified: number;
  canUndoOriginal: boolean;
  canRedoOriginal: boolean;
  canUndoModified: boolean;
  canRedoModified: boolean;
  undoOriginal: () => void;
  redoOriginal: () => void;
  undoModified: () => void;
  redoModified: () => void;
  pushHistory: (original?: string, modified?: string) => void;

  // Diff results
  diffLines: DiffLine[];
  diffStats: DiffStats | null;
  hasCompared: boolean;
  setDiffResults: (lines: DiffLine[], stats: DiffStats) => void;
  resetDiff: () => void;

  // Settings
  themeMode: ThemeMode;
  languageMode: LanguageMode;
  fontSizeMode: FontSizeMode;
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  ignoreEmptyLines: boolean;
  isFullscreen: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguageMode: (mode: LanguageMode) => void;
  setFontSizeMode: (mode: FontSizeMode) => void;
  setIgnoreWhitespace: (value: boolean) => void;
  setIgnoreCase: (value: boolean) => void;
  setIgnoreEmptyLines: (value: boolean) => void;
  setIsFullscreen: (value: boolean) => void;
  resetSettings: () => void;

  // UI
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showSummary: boolean;
  setShowSummary: (show: boolean) => void;
  flashMessage: string | null;
  setFlashMessage: (msg: string | null) => void;
}

const defaultSettings = {
  themeMode: 'system' as ThemeMode,
  languageMode: 'auto' as LanguageMode,
  fontSizeMode: 'medium' as FontSizeMode,
  ignoreWhitespace: false,
  ignoreCase: false,
  ignoreEmptyLines: false,
  isFullscreen: false,
};

export const useAppStore = create<AppState>((set, get) => ({
  // Texts
  originalText: '',
  modifiedText: '',
  setOriginalText: (text, trackHistory = true) => {
    if (trackHistory) {
      get().pushHistory(text, undefined);
    }
    set({ originalText: text });
  },
  setModifiedText: (text, trackHistory = true) => {
    if (trackHistory) {
      get().pushHistory(undefined, text);
    }
    set({ modifiedText: text });
  },
  setTexts: (original, modified, trackHistory = true) => {
    if (trackHistory) {
      get().pushHistory(original, modified);
    }
    set({ originalText: original, modifiedText: modified });
  },
  swapTexts: () => set((state) => ({
    originalText: state.modifiedText,
    modifiedText: state.originalText,
  })),
  clearTexts: () => set((state) => {
    // Push current state to history before clearing, so undo restores what was before clearing
    const origHistory = state.originalHistory.slice(0, state.historyIndexOriginal + 1);
    origHistory.push(state.originalText);
    const modHistory = state.modifiedHistory.slice(0, state.historyIndexModified + 1);
    modHistory.push(state.modifiedText);

    return {
      originalText: '',
      modifiedText: '',
      diffLines: [],
      diffStats: null,
      hasCompared: false,
      originalHistory: origHistory,
      modifiedHistory: modHistory,
      historyIndexOriginal: origHistory.length - 1,
      historyIndexModified: modHistory.length - 1,
      canUndoOriginal: true,
      canRedoOriginal: false,
      canUndoModified: true,
      canRedoModified: false,
    };
  }),

  // Undo/Redo history
  originalHistory: [''],
  modifiedHistory: [''],
  historyIndexOriginal: 0,
  historyIndexModified: 0,
  canUndoOriginal: false,
  canRedoOriginal: false,
  canUndoModified: false,
  canRedoModified: false,

  pushHistory: (original, modified) => {
    const state = get();
    if (original !== undefined) {
      const newHistory = state.originalHistory.slice(0, state.historyIndexOriginal + 1);
      newHistory.push(original);
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      const newIndex = newHistory.length - 1;
      set({
        originalHistory: newHistory,
        historyIndexOriginal: newIndex,
        canUndoOriginal: newIndex > 0,
        canRedoOriginal: false,
      });
    }
    if (modified !== undefined) {
      const newHistory = state.modifiedHistory.slice(0, state.historyIndexModified + 1);
      newHistory.push(modified);
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      const newIndex = newHistory.length - 1;
      set({
        modifiedHistory: newHistory,
        historyIndexModified: newIndex,
        canUndoModified: newIndex > 0,
        canRedoModified: false,
      });
    }
  },

  undoOriginal: () => {
    const state = get();
    if (state.historyIndexOriginal > 0) {
      const newIndex = state.historyIndexOriginal - 1;
      set({
        originalText: state.originalHistory[newIndex],
        historyIndexOriginal: newIndex,
        canUndoOriginal: newIndex > 0,
        canRedoOriginal: true,
      });
    }
  },

  redoOriginal: () => {
    const state = get();
    if (state.historyIndexOriginal < state.originalHistory.length - 1) {
      const newIndex = state.historyIndexOriginal + 1;
      set({
        originalText: state.originalHistory[newIndex],
        historyIndexOriginal: newIndex,
        canUndoOriginal: true,
        canRedoOriginal: newIndex < state.originalHistory.length - 1,
      });
    }
  },

  undoModified: () => {
    const state = get();
    if (state.historyIndexModified > 0) {
      const newIndex = state.historyIndexModified - 1;
      set({
        modifiedText: state.modifiedHistory[newIndex],
        historyIndexModified: newIndex,
        canUndoModified: newIndex > 0,
        canRedoModified: true,
      });
    }
  },

  redoModified: () => {
    const state = get();
    if (state.historyIndexModified < state.modifiedHistory.length - 1) {
      const newIndex = state.historyIndexModified + 1;
      set({
        modifiedText: state.modifiedHistory[newIndex],
        historyIndexModified: newIndex,
        canUndoModified: true,
        canRedoModified: newIndex < state.modifiedHistory.length - 1,
      });
    }
  },

  // Diff results
  diffLines: [],
  diffStats: null,
  hasCompared: false,
  setDiffResults: (lines, stats) => set({ diffLines: lines, diffStats: stats, hasCompared: true }),
  resetDiff: () => set({ diffLines: [], diffStats: null, hasCompared: false }),

  // Settings
  themeMode: defaultSettings.themeMode,
  languageMode: defaultSettings.languageMode,
  fontSizeMode: defaultSettings.fontSizeMode,
  ignoreWhitespace: defaultSettings.ignoreWhitespace,
  ignoreCase: defaultSettings.ignoreCase,
  ignoreEmptyLines: defaultSettings.ignoreEmptyLines,
  isFullscreen: defaultSettings.isFullscreen,
  setThemeMode: (mode) => set({ themeMode: mode }),
  setLanguageMode: (mode) => set({ languageMode: mode }),
  setFontSizeMode: (mode) => set({ fontSizeMode: mode }),
  setIgnoreWhitespace: (value) => set({ ignoreWhitespace: value }),
  setIgnoreCase: (value) => set({ ignoreCase: value }),
  setIgnoreEmptyLines: (value) => set({ ignoreEmptyLines: value }),
  setIsFullscreen: (value) => set({ isFullscreen: value }),
  resetSettings: () => set(defaultSettings),

  // UI
  activeTab: 'compare',
  setActiveTab: (tab) => set({ activeTab: tab }),
  showSummary: true,
  setShowSummary: (show) => set({ showSummary: show }),
  flashMessage: null,
  setFlashMessage: (msg) => set({ flashMessage: msg }),
}));
