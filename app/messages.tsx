import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { BottomNavigation } from '@/components/bottom-navigation';
import { useMessages } from '@/components/messages-provider';
import { useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';
import { useSafeNavigation } from '@/hooks/use-safe-navigation';

export default function MessagesScreen() {
  const navigate = useSafeNavigation(false);
  const { conversations } = useMessages();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <AppHeader />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.pageTitleRow}>
            <Text style={styles.pageTitle}>Messages</Text>
            <Text style={styles.sectionMini}>{conversations.length} conversation{conversations.length === 1 ? '' : 's'}</Text>
          </View>

          {conversations.map((conversation) => {
            const lastMessage = conversation.messages[conversation.messages.length - 1];

            return (
              <Pressable
                key={conversation.id}
                accessibilityRole="button"
                accessibilityLabel={`Open conversation with ${conversation.name}`}
                onPress={() => navigate(`/message/${conversation.id}`)}
                style={({ pressed }) => [styles.conversationCard, pressed && styles.conversationCardPressed]}
              >
                <View style={styles.avatarWrap}>
                  <Ionicons name={conversation.avatarIcon as any} size={20} color={colors.gold} />
                </View>
                <View style={styles.conversationTextWrap}>
                  <View style={styles.nameRow}>
                    <Text style={styles.conversationName}>{conversation.name}</Text>
                    {lastMessage && <Text style={styles.conversationTime}>{lastMessage.time}</Text>}
                  </View>
                  <Text style={styles.conversationPreview} numberOfLines={1}>
                    {lastMessage ? lastMessage.text : conversation.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            );
          })}
        </ScrollView>

        <BottomNavigation activeRoute="/messages" />
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 22 },
    pageTitleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    pageTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
    sectionMini: { color: colors.muted, fontSize: 10 },
    conversationCard: {
      alignItems: 'center',
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: 'row',
      marginBottom: 12,
      padding: 12,
    },
    conversationCardPressed: { opacity: 0.85 },
    avatarWrap: {
      alignItems: 'center',
      backgroundColor: withAlpha(colors.gold, 0.12),
      borderRadius: 21,
      height: 42,
      justifyContent: 'center',
      marginRight: 12,
      width: 42,
    },
    conversationTextWrap: { flex: 1, minWidth: 0 },
    nameRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    conversationName: { color: colors.text, fontSize: 14, fontWeight: '800' },
    conversationTime: { color: colors.muted, fontSize: 10, marginLeft: 8 },
    conversationPreview: { color: colors.muted, fontSize: 12, marginTop: 4 },
  });
}
