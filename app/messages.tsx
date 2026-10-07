import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { useAuth } from '@/components/auth-provider';
import { BottomNavigation } from '@/components/bottom-navigation';
import { formatMessageTime, useMessages } from '@/components/messages-provider';
import { useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';
import { useSafeNavigation } from '@/hooks/use-safe-navigation';
import { findUserByEmail } from '@/lib/directory';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The Messages tab, shared by customers and mechanics: every chat the signed-in person is in.
export default function MessagesScreen() {
  const navigate = useSafeNavigation(false);
  const { role, user } = useAuth();
  const { conversations, startConversation } = useMessages();
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [composeError, setComposeError] = useState('');
  const [finding, setFinding] = useState(false);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Chats that were opened but never had a message sent stay out of the list.
  const visible = conversations.filter((conversation) => conversation.lastMessage.length > 0);

  const closeCompose = () => {
    setComposeOpen(false);
    setRecipientEmail('');
    setComposeError('');
  };

  // Looks the person up by their exact email, then opens (or creates) the chat with them.
  const handleStartChat = async () => {
    const email = recipientEmail.trim().toLowerCase();

    if (finding) {
      return;
    }

    if (!emailPattern.test(email)) {
      setComposeError('Enter their full email address.');
      return;
    }

    if (email === user?.email?.toLowerCase()) {
      setComposeError("That's your own email address.");
      return;
    }

    setFinding(true);
    setComposeError('');

    try {
      const person = await findUserByEmail(email);

      if (!person) {
        setComposeError('No AutoWise account found for that email. Check the spelling, or ask them to open the app once so they can be found.');
        return;
      }

      if (person.uid === user?.uid) {
        setComposeError("That's your own account.");
        return;
      }

      const conversationId = await startConversation(person);
      closeCompose();
      navigate(`/message/${conversationId}`);
    } catch (error) {
      console.error('AutoWise: could not start chat', error);
      setComposeError("Couldn't start the chat. Check your connection and that the latest firestore.rules are published.");
    } finally {
      setFinding(false);
    }
  };

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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start a new message"
            hitSlop={8}
            onPress={() => setComposeOpen(true)}
            style={({ pressed }) => [styles.newButton, pressed && styles.conversationCardPressed]}
          >
            <Ionicons name="create-outline" size={18} color={colors.dark} />
            <Text style={styles.newButtonText}>New message</Text>
          </Pressable>

          {visible.length === 0 && (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubbles-outline" size={26} color={colors.gold} />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>
                {role === 'mechanic'
                  ? 'Tap New message to chat with anyone by their email, or accept a request and tap the chat button on the job to message the customer.'
                  : 'Tap New message to chat with anyone by their email, or message your mechanic once they accept your service or checkup (open the car, Schedule tab).'}
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

        <Modal animationType="fade" transparent visible={composeOpen} onRequestClose={closeCompose}>
          <KeyboardAvoidingView behavior="padding" style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>New message</Text>
              <Text style={styles.modalMessage}>Enter the email address the other person signed up with. Customers and mechanics can both be found this way.</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                keyboardType="email-address"
                onChangeText={(value) => {
                  setComposeError('');
                  setRecipientEmail(value);
                }}
                onSubmitEditing={handleStartChat}
                placeholder="name@example.com"
                placeholderTextColor={colors.muted}
                returnKeyType="go"
                style={styles.modalInput}
                value={recipientEmail}
              />
              {composeError.length > 0 && <Text style={styles.modalError}>{composeError}</Text>}
              <View style={styles.modalActions}>
                <Pressable accessibilityRole="button" onPress={closeCompose} style={({ pressed }) => [styles.cancelButton, pressed && styles.conversationCardPressed]}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={finding}
                  onPress={handleStartChat}
                  style={({ pressed }) => [styles.confirmButton, (pressed || finding) && styles.conversationCardPressed]}
                >
                  {finding ? <ActivityIndicator color={colors.dark} /> : <Text style={styles.confirmButtonText}>Start chat</Text>}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
    newButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 12, flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 14, minHeight: 46 },
    newButtonText: { color: colors.dark, fontSize: 14, fontWeight: '800' },
    modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', flex: 1, justifyContent: 'center', padding: 24 },
    modalCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, padding: 20, width: '100%' },
    modalTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
    modalMessage: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
    modalInput: { backgroundColor: colors.cardAlt, borderColor: colors.border, borderRadius: 11, borderWidth: 1, color: colors.text, fontSize: 14, marginTop: 16, minHeight: 48, paddingHorizontal: 13 },
    modalError: { color: colors.danger, fontSize: 12, lineHeight: 17, marginTop: 12 },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancelButton: { alignItems: 'center', backgroundColor: colors.cardAlt, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 46 },
    cancelButtonText: { color: colors.text, fontSize: 14, fontWeight: '700' },
    confirmButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 12, flex: 1, justifyContent: 'center', minHeight: 46 },
    confirmButtonText: { color: colors.dark, fontSize: 14, fontWeight: '800' },
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
