import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Button } from 'react-native';
import ScrollableTextInput from './components/ScrollableTextInputV2';

const TestScrollbarV2 = () => {
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

  const sampleText = `This is a long text to test the scrollbar functionality.

Line 1: Lorem ipsum dolor sit amet
Line 2: Consectetur adipiscing elit
Line 3: Sed do eiusmod tempor incididunt
Line 4: Ut labore et dolore magna aliqua
Line 5: Ut enim ad minim veniam
Line 6: Quis nostrud exercitation ullamco
Line 7: Laboris nisi ut aliquip ex ea commodo
Line 8: Consequat duis aute irure dolor
Line 9: In reprehenderit in voluptate velit
Line 10: Esse cillum dolore eu fugiat nulla pariatur

Additional content to ensure scrolling is needed:
- Item 1
- Item 2
- Item 3
- Item 4
- Item 5
- Item 6
- Item 7
- Item 8
- Item 9
- Item 10

More content here to make it scroll...
`;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Scrollbar Test V2</Text>
      <ScrollableTextInput
        themeColors={themeColors}
        value={text}
        onChangeText={setText}
        placeholder="Type or paste text here..."
        scrollbarColor="#6200EE"
        minHeight={200}
        maxHeight={300}
        fontSize={16}
      />
      <View style={styles.buttonContainer}>
        <Button
          title="Paste Sample Text"
          onPress={() => setText(sampleText)}
        />
      </View>
      <Text style={styles.instructions}>
        Try typing or pasting text to see the scrollbar appear.
        You should be able to:
        1. Scroll normally by dragging within the text area
        2. Drag the scrollbar thumb to scroll quickly
        3. See your current position via the scrollbar thumb
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
  buttonContainer: {
    marginVertical: 10,
  },
  instructions: {
    marginTop: 20,
    textAlign: 'center',
    color: '#666',
  },
});

export default TestScrollbarV2;