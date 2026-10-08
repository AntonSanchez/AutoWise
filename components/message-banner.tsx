import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/components/auth-provider';
import { Avatar } from '@/components/avatar';
import { useMessages } from '@/components/messages-provider';
import { useThemeColors, type ThemeColors } from '@/components/theme-provider';
import { useSafeNavigation } from '@/hooks/use-safe-navigation';
import { remotePushSupported } from '@/lib/notifications';

type Banner = { key: string; conversationId: string; title: string; body: string; avatarUri: string };

// In-app notification for new chat messages while the app is open. Like the service banner it only
// runs where real push can't (web, Expo Go on Android); elsewhere the push notification does the job.
// Muted chats never show it, and neither does the chat you are looking at right now.
export function MessageBanner() {
  const { isLoggedIn } = useAuth();

  return !remotePushSupported && isLoggedIn ? <BannerContent /> : null;
}

function BannerContent() {
  const { user } = useAuth();
  const { conversations, loaded } = useMessages();
  const pathname = usePathname();
  const navigate = useSafeNavigation(false);
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const known = useRef<Map<string, number> | null>(null);
  const owner = useRef<string | null>(null);
  const slide = useRef(new Animated.Value(-140)).current;

  useEffect(() => {
    if (owner.current !== (user?.uid ?? null)) {
      owner.current = user?.uid ?? null;
      known.current = null;
    }

    if (!loaded) {
      return;
    }

    // First load: remember what is already there instead of announcing it.
    if (known.current === null) {
      known.current = new Map(conversations.map((item) => [item.id, item.lastMessageAtMs]));
      return;
    }

    for (const conversation of conversations) {
      const before = known.current.get(conversation.id) ?? 0;

      if (
        conversation.lastMessageAtMs > before &&
        conversation.lastSenderId !== '' &&
        conversation.lastSenderId !== user?.uid &&
        !conversation.muted &&
        pathname !== `/message/${conversation.id}`
      ) {
        setBanner({ key: `${conversation.id}-${conversation.lastMessageAtMs}`, conversationId: conversation.id, title: conversation.name, body: conversation.lastMessage, avatarUri: conversation.avatarUri });
      }

      known.current.set(conversation.id, conversation.lastMessageAtMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, loaded, user?.uid]);

  useEffect(() => {
    if (!banner) {
      return;
    }

    slide.setValue(-140);
    Animated.timing(slide, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    const timer = setTimeout(() => dismiss(), 6000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner?.key]);

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
        accessibilityLabel={`New message from ${banner.title}. ${banner.body}`}
        onPress={() => {
          dismiss();
          navigate(`/message/${banner.conversationId}`);
        }}
        style={styles.banner}
      >
        <Avatar uri={banner.avatarUri} size={34} radius={17} icon="chatbubble-ellipses" />
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
