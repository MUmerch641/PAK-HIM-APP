import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons'; // For icons
import { useTheme } from '../../utils/ThemeContext'; // Adjust the path as needed

const { width } = Dimensions.get('window');
const TOGGLE_WIDTH = width * 0.3; // Reduced width for mobile
const BUTTON_SIZE = TOGGLE_WIDTH / 3; // Size for each toggle section

const ThemeToggleButton = ({ themeMode }) => {
  const { setThemeMode, currentColors } = useTheme();

  // Shared values for animation
  const translateX = useSharedValue(0); // For sliding the toggle
  const rotation = useSharedValue(0); // For rotating the system icon

  // Update slider position when themeMode changes
  useEffect(() => {
    let newPosition;
    switch (themeMode) {
      case 'light':
        newPosition = 0;
        break;
      case 'dark':
        newPosition = BUTTON_SIZE;
        break;
      case 'system':
        newPosition = BUTTON_SIZE * 2;
        break;
      default:
        newPosition = 0;
    }
    translateX.value = withSpring(newPosition, { damping: 15, stiffness: 120 });
  }, [themeMode]);

  // Handle press and toggle
  const handlePress = (mode) => {
    // Rotate the system icon
    if (mode === 'system') {
      rotation.value = withTiming(rotation.value + 360, { duration: 500 });
    }

    // Set the theme mode
    setThemeMode(mode);
  };

  // Animated styles for the toggle slider
  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Animated styles for the system icon rotation
  const systemIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: currentColors.tabBackground }]}>
      {/* Toggle Slider */}
      <Animated.View
        style={[
          styles.slider,
          sliderStyle,
          { backgroundColor: currentColors.activeTabBackground },
        ]}
      >
        {/* Icons inside the slider */}
        {themeMode === 'light' && (
          <Ionicons
            name="sunny"
            size={20}
            color={currentColors.activeTabText}
          />
        )}
        {themeMode === 'dark' && (
          <Ionicons
            name="moon"
            size={20}
            color={currentColors.activeTabText}
          />
        )}
        {themeMode === 'system' && (
          <Animated.View style={systemIconStyle}>
            <Ionicons
              name="settings"
              size={20}
              color={currentColors.activeTabText}
            />
          </Animated.View>
        )}
      </Animated.View>

      {/* Light Mode Button */}
      <TouchableOpacity
        onPress={() => handlePress('light')}
        style={styles.toggleButton}
      >
        {themeMode !== 'light' && (
          <Ionicons
            name="sunny"
            size={20}
            color={currentColors.headerText}
          />
        )}
      </TouchableOpacity>

      {/* Dark Mode Button */}
      <TouchableOpacity
        onPress={() => handlePress('dark')}
        style={styles.toggleButton}
      >
        {themeMode !== 'dark' && (
          <Ionicons
            name="moon"
            size={20}
            color={currentColors.headerText}
          />
        )}
      </TouchableOpacity>

      {/* System Mode Button */}   
      <TouchableOpacity
        onPress={() => handlePress('system')}
        style={styles.toggleButton}
      >
        {themeMode !== 'system' && (
          <Ionicons
            name="settings"
            size={20}
            color={currentColors.headerText}
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: TOGGLE_WIDTH,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 3, // Reduced padding
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5, // Android shadow
  },
  slider: {
    width: BUTTON_SIZE - 6, // Adjusted size
    height: BUTTON_SIZE - 6, // Adjusted size
    borderRadius: (BUTTON_SIZE - 6) / 2,
    position: 'absolute',
    left: 3, // Adjusted position
    top: 3, // Adjusted position
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ThemeToggleButton;