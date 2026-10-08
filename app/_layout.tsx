import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/components/auth-provider';
import { MessageBanner } from '@/components/message-banner';
import { MessagesProvider } from '@/components/messages-provider';
import { NotificationObserver } from '@/components/notification-observer';
import { ServiceUpdateBanner } from '@/components/service-update-banner';
import { ProfileProvider } from '@/components/profile-provider';
import { ThemeProvider as AppThemeProvider, useAppTheme, type ThemeColors } from '@/components/theme-provider';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
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
    <AppThemeProvider>
      <AuthProvider>
        <ProfileProvider>
          <MessagesProvider>
            <ThemedRoot onLayout={handleRootLayout} />
          </MessagesProvider>
        </ProfileProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}

function ThemedRoot({ onLayout }: { onLayout: () => void }) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const navigationTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.background,
        card: colors.headerBackground,
        text: colors.text,
        border: colors.border,
        primary: colors.gold,
      },
    }),
    [isDark, colors],
  );

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <RootView onLayout={onLayout} style={styles.rootView}>
        <RootNavigator background={colors.background} />
        <NotificationObserver />
        <ServiceUpdateBanner />
        <MessageBanner />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </RootView>
    </NavigationThemeProvider>
  );
}

function RootNavigator({ background }: { background: string }) {
  const { isLoggedIn, isAdmin, role, isInitializing } = useAuth();
  const { colors } = useAppTheme();

  // Wait for Firebase to report whether a session is already saved on this device, so a
  // returning signed-in user doesn't see a flash of the login screen before landing on Home.
  if (isInitializing) {
    return (
      <View style={[styles.initializingView, { backgroundColor: background }]}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  // Stack.Protected removes a group's screens (and their history entries) whenever its guard is false.
  // Signing in therefore drops the loading/auth screens, so "back" can never return to the login screen,
  // and opening a login URL while signed in lands on the home screen instead.
  return (
    <Stack
      screenOptions={{
        animation: 'fade',
        contentStyle: { backgroundColor: background },
        headerShown: false,
      }}
    >
      <Stack.Protected guard={isLoggedIn}>
        {/* Bottom-tab destinations switch instantly; the default fade would delay every tab press. */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="cars" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="messages" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="settings" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="history" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="car/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="message/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="add-car" options={{ headerShown: false }} />
        <Stack.Screen name="add-schedule" options={{ headerShown: false }} />
      </Stack.Protected>
      {/* Admin-only screens. This only hides them in the UI - firestore.rules is what really stops a
          non-admin from reading or changing other users' data. */}
      <Stack.Protected guard={isLoggedIn && isAdmin}>
        <Stack.Screen name="admin/index" options={{ headerShown: false }} />
        <Stack.Screen name="admin/user/[uid]" options={{ headerShown: false }} />
        <Stack.Screen name="admin/car" options={{ headerShown: false }} />
      </Stack.Protected>
      {/* Mechanic-only screens. The mechanic's home is the same '/' route as the customer's - the
          Home screen swaps in the mechanic dashboard when the account's role is 'mechanic'. */}
      <Stack.Protected guard={isLoggedIn && role === 'mechanic'}>
        <Stack.Screen name="mechanic/account" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="loading" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}

function RootView({ children, onLayout, style }: { children: ReactNode; onLayout: () => void; style: object }) {
  return <View style={[styles.rootViewBase, style]} onLayout={onLayout}>{children}</View>;
}

const styles = StyleSheet.create({
  rootViewBase: {
    flex: 1,
  },
  initializingView: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    rootView: {
      backgroundColor: colors.background,
      flex: 1,
    },
  });
}
