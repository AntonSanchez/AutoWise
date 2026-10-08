import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/components/auth-provider';
import { useProfile } from '@/components/profile-provider';
import { useThemeColors, type ThemeColors } from '@/components/theme-provider';
import { useSafeNavigation } from '@/hooks/use-safe-navigation';
import { remotePushSupported, showLocalNotification } from '@/lib/notifications';
import { getRequestType, getServiceStatus } from '@/lib/service-status';

type Banner = { key: string; title: string; body: string; carId: string };

// Stand-in for push notifications where they can't be received: the web, and Expo Go on Android (remote
// push was removed from it in SDK 53). When the app sees one of the customer's bookings go from pending to
// accepted, it shows a notification on the phone itself (a local notification), or an in-app banner if that
// isn't available (web, or notifications not allowed). It only sees the change while the app is running.
// Where real push works this renders nothing, so people don't get both.
export function ServiceUpdateBanner() {
  const { role, isLoggedIn } = useAuth();

  return !remotePushSupported && isLoggedIn && role === 'customer' ? <BannerContent /> : null;
}

function BannerContent() {
  const { user } = useAuth();
  const { scheduledServices } = useProfile();
  const navigate = useSafeNavigation(false);
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const known = useRef<Map<string, string>>(new Map());
  const owner = useRef<string | null>(null);
  const slide = useRef(new Animated.Value(-140)).current;

  // Compare each booking's status with what was seen last time. Bookings that show up already accepted
  // (the first load) are remembered, not announced; only pending -> accepted while the app is open is.
  useEffect(() => {
    if (owner.current !== (user?.uid ?? null)) {
      owner.current = user?.uid ?? null;
      known.current = new Map();
    }

    for (const service of scheduledServices) {
      const status = getServiceStatus(service);
      const before = known.current.get(service.id);

      if (before === 'pending' && status === 'accepted') {
        const kind = getRequestType(service) === 'checkup' ? 'checkup' : 'service';
        const title = `Your ${kind} was accepted`;
        const body = `${service.mechanicName || 'A mechanic'} accepted ${service.title} for ${service.scheduledDate} at ${service.time}.`;
        const carId = service.carId;

        showLocalNotification({ title, body, data: { type: 'service', carId } }).then((shown) => {
          if (!shown) {
            setBanner({ key: `${service.id}-${Date.now()}`, title, body, carId });
          }
        });
      }

      known.current.set(service.id, status);
    }
  }, [scheduledServices, user?.uid]);

  useEffect(() => {
    if (!banner) {
      return;
    }

    Animated.timing(slide, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    const timer = setTimeout(() => dismiss(), 7000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner]);

  const dismiss = () => {
    Animated.timing(slide, { toValue: -140, duration: 200, useNativeDriver: true }).start(() => setBanner(null));
  };

  if (!banner) {
    return null;
  }

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { paddingTop: insets.top + 8, transform: [{ translateY: slide }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${banner.title}. ${banner.body}`}
        onPress={() => {
          dismiss();
          navigate(`/car/${banner.carId}`);
        }}
        style={styles.banner}
      >
        <Ionicons name="checkmark-circle" size={22} color={colors.green} />
        <View style={styles.textWrap}>
          <Text style={styles.title}>{banner.title}</Text>
          <Text numberOfLines={2} style={styles.body}>
            {banner.body}
          </Text>
        </View>
        <Pressable accessibilityLabel="Dismiss" hitSlop={10} onPress={dismiss}>
          <Ionicons name="close" size={18} color={colors.muted} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { left: 0, paddingHorizontal: 14, position: 'absolute', right: 0, top: 0, zIndex: 100 },
    banner: {
      alignItems: 'center',
      backgroundColor: colors.card,
      borderColor: colors.gold,
      borderRadius: 14,
      borderWidth: 1,
      elevation: 6,
      flexDirection: 'row',
      gap: 12,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: { height: 3, width: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    textWrap: { flex: 1 },
    title: { color: colors.text, fontSize: 14, fontWeight: '800' },
    body: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  });
}
