# DiffMobile

A mobile text/file diff comparison application built with React Native and Expo.

## Features

- **Side-by-side text comparison**: Paste or load two texts/files to compare
- **Character-level diff highlighting**: Only the different characters are highlighted, not entire lines
- **Color-coded differences**:
  - 🟢 Green: Added content
  - 🔴 Red: Removed content  
  - 🟡 Yellow: Modified content
- **Quick actions**:
  - Copy individual different lines
  - Copy entire resulting text (both directions)
  - Accept changes in either direction
  - Save results as files
  - Export unified diff format
- **Internationalization**: Auto-detects device language (Spanish/English) with manual override in settings
- **Customizable settings**:
  - Language selection (Auto/English/Spanish)
  - Theme (System/Light/Dark)
  - Text size (Small/Medium/Large)
  - Diff options (ignore whitespace, case, empty lines)

## Getting Started

### Prerequisites

- Node.js
- Expo CLI (`npx expo`)
- Android emulator or physical device with Expo Go app

### Installation

```bash
npm install
```

### Running the App

```bash
# Start Expo dev server
npx expo start

# Run on Android
npx expo start --android

# Run on iOS
npx expo start --ios
```

## Project Structure

```
DiffMobile/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout with navigation
│   ├── index.tsx           # Main comparison screen
│   ├── settings.tsx        # Settings screen
│   └── modal.tsx           # Modal screen template
├── components/             # Reusable UI components
│   └── DiffResultView.tsx  # Diff results display
├── constants/              # App constants
│   └── theme.ts            # Theme colors & styles
├── locales/                # i18n translation files
│   ├── en.json             # English translations
│   └── es.json             # Spanish translations
├── store/                  # State management (Zustand)
│   └── appStore.ts         # Global app state
├── types/                  # TypeScript types
│   └── diff.ts             # Diff-related types
├── utils/                  # Utility functions
│   ├── diffEngine.ts       # Diff computation engine
│   └── i18n.ts             # i18n configuration
└── assets/                 # Static assets
    └── images/             # App icons and images
```

## Tech Stack

- **React Native** - Mobile framework
- **Expo** - Development platform
- **TypeScript** - Type safety
- **Zustand** - State management
- **i18next** - Internationalization
- **expo-router** - File-based routing
- **diff** - Diff computation library

## License

MIT
