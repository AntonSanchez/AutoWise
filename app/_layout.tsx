import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/components/auth-provider';
import { PendingUsersProvider } from '@/components/pending-users-provider';
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
    <PendingUsersProvider>
      <ProfileProvider>
        <AuthProvider>
          <ThemeProvider value={navigationTheme}>
            <RootView onLayout={handleRootLayout}>
              <RootNavigator />
              <StatusBar style="light" />
            </RootView>
          </ThemeProvider>
        </AuthProvider>
      </ProfileProvider>
    </PendingUsersProvider>
  );
}

function RootNavigator() {
  const { isLoggedIn } = useAuth();

  // Stack.Protected removes a group's screens (and their history entries) whenever its guard is false.
  // Signing in therefore drops the loading/auth screens, so "back" can never return to the login screen,
  // and opening a login URL while signed in lands on the home screen instead.
  return (
    <Stack
      screenOptions={{
        animation: 'fade',
        contentStyle: { backgroundColor: appBackground },
        headerShown: false,
      }}
    >
      <Stack.Protected guard={isLoggedIn}>
        {/* Bottom-tab destinations switch instantly; the default fade would delay every tab press. */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="schedule" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="records" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="history" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="add-schedule" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="loading" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
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
