import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, TextInput, TextInputProps, StyleSheet, PanResponder, Animated, ScrollView, NativeSyntheticEvent, NativeScrollEvent, TouchableWithoutFeedback, GestureResponderEvent } from 'react-native';
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

const ScrollableTextInputV2 = forwardRef<ScrollableTextInputRef, ScrollableTextInputProps>(function ScrollableTextInputV2({
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
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollbarY = useRef(new Animated.Value(0)).current;
  const scrollbarHeight = useRef(new Animated.Value(0)).current;
  
  const [touchStartY, setTouchStartY] = useState(0);
  const [scrollPositionAtStart, setScrollPositionAtStart] = useState(0);
  
  const handleScrollbarTouchStart = (evt: GestureResponderEvent) => {
    if (contentHeight <= containerHeight) return;
    
    setIsScrolling(true);
    const scrollbarContainerHeight = containerHeight - 8;
    const scrollbarAvailableHeight = scrollbarContainerHeight - 40;
    
    // Store the initial touch position and scroll position
    setTouchStartY(evt.nativeEvent.pageY);
    setScrollPositionAtStart(scrollPosition);
    
    console.log('Touch start:', { 
      pageY: evt.nativeEvent.pageY,
      scrollPosition
    });
  };
  
  const handleScrollbarTouchMove = (evt: GestureResponderEvent) => {
    if (!isScrolling || contentHeight <= containerHeight) return;
    
    const scrollbarContainerHeight = containerHeight - 8;
    const scrollbarAvailableHeight = scrollbarContainerHeight - 40;
    const scrollableContentHeight = contentHeight - containerHeight;
    
    // Calculate how much the finger has moved
    const touchCurrentY = evt.nativeEvent.pageY;
    const dy = touchCurrentY - touchStartY;
    
    // Calculate the new scroll position based on the movement
    const scrollRatio = dy / scrollbarAvailableHeight;
    let newScrollY = scrollPositionAtStart + scrollRatio * scrollableContentHeight;
    newScrollY = Math.max(0, Math.min(newScrollY, scrollableContentHeight));
    
    // Calculate the new scrollbar position
    const scrollbarTop = (newScrollY / scrollableContentHeight) * scrollbarAvailableHeight;
    
    console.log('Touch move:', { 
      touchCurrentY,
      dy,
      scrollRatio,
      newScrollY,
      scrollbarTop
    });
    
    // Update state and scroll
    setScrollPosition(newScrollY);
    scrollbarY.setValue(scrollbarTop);
    scrollViewRef.current?.scrollTo({ y: newScrollY, animated: false });
  };
  
  const handleScrollbarTouchEnd = () => {
    setIsScrolling(false);
    console.log('Touch end');
  };
  
  const handleContentSizeChange = (width: number, height: number) => {
    setContentHeight(height);
    
    if (height > containerHeight) {
      const ratio = containerHeight / height;
      const scrollbarContainerHeight = containerHeight - 8;
      const scrollbarAvailableHeight = scrollbarContainerHeight - 40; // Minimum scrollbar height
      const scrollbarH = Math.max(40, scrollbarAvailableHeight * ratio);
      scrollbarHeight.setValue(scrollbarH);
      setShowScrollbar(true);
    } else {
      setShowScrollbar(false);
    }
  };
  
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    setScrollPosition(contentOffset.y);
    
    if (contentHeight > containerHeight) {
      const scrollableContentHeight = contentHeight - containerHeight;
      const scrollbarContainerHeight = containerHeight - 8;
      const scrollbarAvailableHeight = scrollbarContainerHeight - 40;
      
      // Calculate scrollbar position based on scroll ratio
      const scrollRatio = contentOffset.y / scrollableContentHeight;
      const scrollbarTop = scrollRatio * scrollbarAvailableHeight;
      scrollbarY.setValue(scrollbarTop);
    }
  };
  
  const handleLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setContainerHeight(height);
  };
  
  useEffect(() => {
    if (contentHeight > containerHeight && containerHeight > 0) {
      const scrollableContentHeight = contentHeight - containerHeight;
      const scrollbarContainerHeight = containerHeight - 8;
      const scrollbarAvailableHeight = scrollbarContainerHeight - 40;
      
      // Calculate scrollbar position based on scroll ratio
      const scrollRatio = scrollPosition / scrollableContentHeight;
      const scrollbarTop = scrollRatio * scrollbarAvailableHeight;
      scrollbarY.setValue(scrollbarTop);
    }
  }, [scrollPosition, contentHeight, containerHeight]);
  
  useImperativeHandle(ref, () => ({
    focus: () => {
      textInputRef.current?.focus();
    },
    scrollTo: (params: { y: number; animated?: boolean }) => {
      scrollViewRef.current?.scrollTo(params);
    }
  }));
  
  return (
    <View style={[styles.container, { minHeight, maxHeight }]} onLayout={handleLayout}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
      >
        <TextInput
          ref={textInputRef}
          {...textInputProps}
          style={[styles.textInput, textInputProps.style, {
            backgroundColor: 'transparent',
            color: themeColors.text,
            fontSize: fontSize,
            minHeight: containerHeight - (Spacing.md * 2),
          }]}
          multiline
          scrollEnabled={false} // Disable TextInput scrolling, use ScrollView instead

        />
      </ScrollView>
      
      {showScrollbar && (
        <View style={[styles.scrollbarContainer, { width: 24 }]}>
          <View style={[styles.scrollbarBackground, { backgroundColor: scrollbarBackgroundColor || '#F0F0F0' }]} />
          <Animated.View
            style={[
              styles.scrollbarThumb,
              {
                width: 24,
                height: scrollbarHeight,
                transform: [{ translateY: scrollbarY }],
                backgroundColor: scrollbarColor,
                opacity: isScrolling ? 1 : 0.8,
              }
            ]}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleScrollbarTouchStart}
            onResponderMove={handleScrollbarTouchMove}
            onResponderRelease={handleScrollbarTouchEnd}
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
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    minHeight: '100%',
  },
  textInput: {
    flex: 1,
    fontFamily: 'monospace',
    lineHeight: 20,
    textAlignVertical: 'top',
    paddingRight: 12,
    includeFontPadding: false,
  },
  scrollbarContainer: {
    position: 'absolute',
    right: 4,
    top: 4,
    bottom: 4,
    borderRadius: 4,
    overflow: 'hidden',
    zIndex: 10,
    width: 24, // Make it wider to ensure touch events are captured
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

export default ScrollableTextInputV2;