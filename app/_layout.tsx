import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from '../src/utils/ThemeContext'; 

import { ReactNode } from 'react';
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
          <Stack.Screen name="(tab)" /> 
        </Stack>
      </CustomLayout>
    </ ThemeProvider>
  );
}
