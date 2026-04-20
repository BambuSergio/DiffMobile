import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import ScrollableTextInput from './components/ScrollableTextInput';

const TestScrollbar = () => {
  const [text, setText] = useState('');
  
  const themeColors = {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceSecondary: '#F5F5F5',
    primary: '#6200EE',
    primaryLight: '#9662FF',
    primaryDark: '#3700B3',
    text: '#212121',
    textSecondary: '#757575',
    textLight: '#9E9E9E',
    border: '#E0E0E0',
    error: '#B00020',
    success: '#4CAF50',
    warning: '#FF9800',
    removed: '#FFEBEE',
    removedBorder: '#EF9A9A',
    removedText: '#C62828',
    added: '#E8F5E9',
    addedBorder: '#A5D6A7',
    addedText: '#2E7D32',
    modified: '#FFF3E0',
    modifiedBorder: '#FFE0B2',
    modifiedText: '#E65100',
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Scrollbar Test</Text>
      <ScrollableTextInput
        themeColors={themeColors}
        value={text}
        onChangeText={setText}
        placeholder="Type a lot of text here to test scrollbar..."
        scrollbarColor="#6200EE"
        minHeight={200}
        maxHeight={300}
        fontSize={16}
      />
      <Text style={styles.instructions}>
        Try typing or pasting a lot of text to see the scrollbar appear.
        You should be able to drag the scrollbar thumb to scroll.
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  instructions: {
    marginTop: 20,
    textAlign: 'center',
    color: '#666',
  },
});

export default TestScrollbar;