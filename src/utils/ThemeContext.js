import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from './color'; // Your colors file

// Create the Theme Context
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme(); // Get system theme (light/dark)
  const [themeMode, setThemeMode] = useState('system'); // "light", "dark", or "system"

  // Load theme mode from storage on app start
  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const savedThemeMode = await AsyncStorage.getItem('themeMode');
        if (savedThemeMode) {
          setThemeMode(savedThemeMode);
        }
      } catch (error) {
        console.error('Error loading theme mode:', error);
      }
    };
    loadThemeMode();
  }, []);

  // Determine the effective theme based on themeMode
  const effectiveTheme =
    themeMode === 'system' ? systemColorScheme : themeMode;

  // Save theme mode to storage when it changes
  const setAndSaveThemeMode = async (newMode) => {
    setThemeMode(newMode);
    try {
      await AsyncStorage.setItem('themeMode', newMode);
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  };

  // Get current colors based on the effective theme
  const currentColors = effectiveTheme === 'dark' ? colors.dark : colors.light;

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        setThemeMode: setAndSaveThemeMode,
        effectiveTheme,
        currentColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the ThemeContext
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};