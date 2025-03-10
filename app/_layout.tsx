import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from '../src/utils/ThemeContext'; // Adjust the path as neededfunction CustomLayout({ children }: { children: ReactNode }) {
import { useColorScheme } from 'react-native';
import { ReactNode } from 'react';
import { colors } from '../src/utils/color';
function CustomLayout({ children }: { children: ReactNode }) {

  const { currentColors } = useTheme();
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar backgroundColor={currentColors.statusbarColor || '#0066FF'} style='light' />
        {children}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <CustomLayout>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="Login" />
          <Stack.Screen name="SignUp" />
          <Stack.Screen name="(tab)" /> {/* Tabs (Main App) */}
        </Stack>
      </CustomLayout>
    </ ThemeProvider>
  );
}
