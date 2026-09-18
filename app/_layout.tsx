import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { ProfileProvider } from '@/components/profile-provider';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

const appBackground = '#171a1d';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: appBackground,
    card: '#101112',
    text: '#f5f4f2',
    border: 'rgba(255,255,255,0.08)',
  },
};

export default function RootLayout() {
  const splashHidden = useRef(false);

  const handleRootLayout = () => {
    if (splashHidden.current) {
      return;
    }

    splashHidden.current = true;
    SplashScreen.hideAsync();
  };

  return (
    <ProfileProvider>
      <ThemeProvider value={navigationTheme}>
        <RootView onLayout={handleRootLayout}>
          <Stack
            screenOptions={{
              animation: 'fade',
              contentStyle: { backgroundColor: appBackground },
              headerShown: false,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="loading" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
            <Stack.Screen name="schedule" options={{ headerShown: false }} />
            <Stack.Screen name="records" options={{ headerShown: false }} />
            <Stack.Screen name="history" options={{ headerShown: false }} />
            <Stack.Screen name="add-schedule" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="light" />
        </RootView>
      </ThemeProvider>
    </ProfileProvider>
  );
}

function RootView({ children, onLayout }: { children: ReactNode; onLayout: () => void }) {
  return <View style={styles.rootView} onLayout={onLayout}>{children}</View>;
}

const styles = StyleSheet.create({
  rootView: {
    backgroundColor: appBackground,
    flex: 1,
  },
});
