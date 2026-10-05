import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { useAuth } from '@/components/auth-provider';
import { BottomNavigation } from '@/components/bottom-navigation';
import { formatMessageTime, useMessages } from '@/components/messages-provider';
import { useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';
import { useSafeNavigation } from '@/hooks/use-safe-navigation';

// The Messages tab, shared by customers and mechanics: every chat the signed-in person is in.
export default function MessagesScreen() {
  const navigate = useSafeNavigation(false);
  const { role, user } = useAuth();
  const { conversations } = useMessages();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Chats that were opened but never had a message sent stay out of the list.
  const visible = conversations.filter((conversation) => conversation.lastMessage.length > 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <AppHeader />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.pageTitleRow}>
            <Text style={styles.pageTitle}>Messages</Text>
            <Text style={styles.sectionMini}>
              {visible.length} conversation{visible.length === 1 ? '' : 's'}
            </Text>
          </View>

          {visible.length === 0 && (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubbles-outline" size={26} color={colors.gold} />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>
                {role === 'mechanic'
                  ? 'Accept a request, then tap the chat button on the job to message the customer.'
                  : 'Once a mechanic accepts your service or checkup, tap Message mechanic on it (open the car, Schedule tab) to start a chat.'}
              </Text>
            </View>
          )}

          {visible.map((conversation) => (
            <Pressable
              key={conversation.id}
              accessibilityRole="button"
              accessibilityLabel={`Open conversation with ${conversation.name}${conversation.unread ? ', unread' : ''}`}
              onPress={() => navigate(`/message/${conversation.id}`)}
              style={({ pressed }) => [styles.conversationCard, conversation.unread && styles.unreadCard, pressed && styles.conversationCardPressed]}
            >
              <View style={styles.avatarWrap}>
                <Ionicons name={conversation.otherRole === 'mechanic' ? 'construct' : 'person'} size={19} color={colors.gold} />
              </View>
              <View style={styles.conversationTextWrap}>
                <View style={styles.nameRow}>
                  <View style={styles.nameWrap}>
                    <Text numberOfLines={1} style={styles.conversationName}>
                      {conversation.name}
                    </Text>
                    <View style={styles.roleTag}>
                      <Text style={styles.roleTagText}>{conversation.otherRole === 'mechanic' ? 'MECHANIC' : 'CUSTOMER'}</Text>
                    </View>
                  </View>
                  <Text style={styles.conversationTime}>{formatMessageTime(conversation.lastMessageAtMs)}</Text>
                </View>
                <Text style={[styles.conversationPreview, conversation.unread && styles.unreadPreview]} numberOfLines={1}>
                  {conversation.lastSenderId === user?.uid ? 'You: ' : ''}
                  {conversation.lastMessage}
                </Text>
              </View>
              {conversation.unread ? <View style={styles.unreadDot} /> : <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
            </Pressable>
          ))}
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
    emptyCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, padding: 24 },
    emptyIcon: { alignItems: 'center', backgroundColor: withAlpha(colors.gold, 0.14), borderRadius: 18, height: 56, justifyContent: 'center', marginBottom: 14, width: 56 },
    emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
    emptyText: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8, textAlign: 'center' },
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
    unreadCard: { borderColor: colors.gold },
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
    nameWrap: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 6, minWidth: 0 },
    conversationName: { color: colors.text, flexShrink: 1, fontSize: 14, fontWeight: '800' },
    roleTag: { backgroundColor: withAlpha(colors.gold, 0.14), borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    roleTagText: { color: colors.gold, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
    conversationTime: { color: colors.muted, fontSize: 10, marginLeft: 8 },
    conversationPreview: { color: colors.muted, fontSize: 12, marginTop: 4 },
    unreadPreview: { color: colors.text, fontWeight: '700' },
    unreadDot: { backgroundColor: colors.gold, borderRadius: 5, height: 10, marginLeft: 8, width: 10 },
  });
}
