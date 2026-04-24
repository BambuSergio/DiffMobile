import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, TextInput, TextInputProps, StyleSheet, PanResponder, Animated, NativeSyntheticEvent, TextInputScrollEventData } from 'react-native';
import { BorderRadius, Spacing } from '../constants/theme';

interface ScrollableTextInputProps extends TextInputProps {
  scrollbarColor?: string;
  scrollbarBackgroundColor?: string;
  scrollbarWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  themeColors: Record<string, string>;
  fontSize?: number;
}

export interface ScrollableTextInputRef {
  focus: () => void;
  scrollTo: (params: { y: number; animated?: boolean }) => void;
}

const ScrollableTextInput = forwardRef<ScrollableTextInputRef, ScrollableTextInputProps>(function ScrollableTextInput({
  scrollbarColor = '#CCCCCC',
  scrollbarBackgroundColor = 'transparent',
  scrollbarWidth = 8,
  minHeight = 150,
  maxHeight = 300,
  themeColors,
  fontSize = 14,
  ...textInputProps
}, ref) {
  const [contentHeight, setContentHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(minHeight);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [showScrollbar, setShowScrollbar] = useState(false);
  
  const textInputRef = useRef<TextInput>(null);
  const scrollbarYRef = useRef(new Animated.Value(0));
  const scrollbarHeightRef = useRef(new Animated.Value(0));
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsScrolling(true);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (contentHeight <= containerHeight) return;
        
        const scrollbarContainerHeight = containerHeight - 8; // Account for padding
        const scrollableContentHeight = contentHeight - containerHeight;
        
        // Calculate new scroll position based on scrollbar drag
        const dragRatio = gestureState.dy / scrollbarContainerHeight;
        let newY = scrollPosition + dragRatio * scrollableContentHeight;
        newY = Math.max(0, Math.min(newY, scrollableContentHeight));
        
        setScrollPosition(newY);
        
        // Calculate scrollbar position (0 to scrollbarAvailableHeight)
        const scrollbarAvailableHeight = scrollbarContainerHeight - 40; // Minimum scrollbar height
        const scrollbarTop = (newY / scrollableContentHeight) * scrollbarAvailableHeight;
        scrollbarYRef.current.setValue(scrollbarTop);
        
        if (textInputRef.current) {
          // @ts-ignore - scrollTo is available on TextInput
          textInputRef.current.scrollTo({ y: newY, animated: false });
        }
      },
      onPanResponderRelease: () => {
        setIsScrolling(false);
      },
    })
  ).current;
  
  const handleContentSizeChange = (event: any) => {
    const { width, height } = event.nativeEvent;
    setContentHeight(height);
    
    console.log('Content size change:', { width, height, containerHeight });
    
    if (height > containerHeight) {
      const ratio = containerHeight / height;
      const scrollbarContainerHeight = containerHeight - 8; // Account for padding
      const scrollbarH = Math.max(40, scrollbarContainerHeight * ratio);
      scrollbarHeightRef.current.setValue(scrollbarH);
      console.log('Showing scrollbar:', { ratio, scrollbarH, scrollbarContainerHeight });
      setShowScrollbar(true);
    } else {
      console.log('Hiding scrollbar - content fits');
      setShowScrollbar(false);
    }
  };
  
  const handleScroll = (event: NativeSyntheticEvent<TextInputScrollEventData>) => {
    const { contentOffset } = event.nativeEvent;
    setScrollPosition(contentOffset.y);
    
    console.log('Scroll event:', { contentOffset, contentHeight, containerHeight });
    
    if (contentHeight > containerHeight) {
      const scrollableContentHeight = contentHeight - containerHeight;
      const scrollbarContainerHeight = containerHeight - 8; // Account for padding
      const scrollbarAvailableHeight = scrollbarContainerHeight - 40; // Minimum scrollbar height
      const scrollbarTop = (contentOffset.y / scrollableContentHeight) * scrollbarAvailableHeight;
      console.log('Updating scrollbar position:', { scrollbarTop, scrollbarAvailableHeight });
      scrollbarYRef.current.setValue(scrollbarTop);
    }
  };
  
  const handleLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    console.log('Container layout:', { height });
    setContainerHeight(height);
  };
  
  useEffect(() => {
    if (contentHeight > containerHeight && containerHeight > 0) {
      const scrollableContentHeight = contentHeight - containerHeight;
      const scrollbarContainerHeight = containerHeight - 8; // Account for padding
      const scrollbarAvailableHeight = scrollbarContainerHeight - 40; // Minimum scrollbar height
      const scrollbarTop = (scrollPosition / scrollableContentHeight) * scrollbarAvailableHeight;
      scrollbarYRef.current.setValue(scrollbarTop);
    }
  }, [scrollPosition, contentHeight, containerHeight]);
  
  useImperativeHandle(ref, () => ({
    focus: () => {
      textInputRef.current?.focus();
    },
    scrollTo: (params: { y: number; animated?: boolean }) => {
      // @ts-ignore - scrollTo is available on TextInput
      textInputRef.current?.scrollTo(params);
    }
  }));
  
  return (
    <View style={[styles.container, { minHeight, maxHeight }]} onLayout={handleLayout}>
      <TextInput
        ref={textInputRef}
        {...textInputProps}
        style={[styles.textInput, textInputProps.style, {
          backgroundColor: themeColors.surface,
          color: themeColors.text,
          borderColor: textInputProps.onFocus ? themeColors.primary : themeColors.border,
          fontSize: fontSize,
          height: containerHeight - (Spacing.md * 2), // Account for padding
        }]}
        multiline
        scrollEnabled={true}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        // @ts-ignore - scrollEventThrottle is available on TextInput
        scrollEventThrottle={16}
        onFocus={() => console.log('TextInput focused')}
        onBlur={() => console.log('TextInput blurred')}
      />
      
      {showScrollbar && (
        <View style={[styles.scrollbarContainer, { width: scrollbarWidth }]}>
          <View style={[styles.scrollbarBackground, { backgroundColor: scrollbarBackgroundColor || '#F0F0F0' }]} />
          <Animated.View
            style={[
              styles.scrollbarThumb,
              {
                width: scrollbarWidth,
                height: scrollbarHeightRef.current,
                transform: [{ translateY: scrollbarYRef.current }],
                backgroundColor: scrollbarColor,
                opacity: isScrolling ? 1 : 0.8,
              }
            ]}
            {...panResponder.panHandlers}
          />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  textInput: {
    flex: 1,
    fontFamily: 'monospace',
    lineHeight: 20,
    textAlignVertical: 'top',
    paddingRight: 12,
  },
  scrollbarContainer: {
    position: 'absolute',
    right: 4,
    top: 4,
    bottom: 4,
    borderRadius: 4,
    overflow: 'hidden',
    zIndex: 10,
  },
  scrollbarBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 4,
  },
  scrollbarThumb: {
    position: 'absolute',
    borderRadius: 4,
    width: '100%',
  },
});

export default ScrollableTextInput;