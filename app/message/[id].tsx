import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { formatMessageTime, useMessages, useThread } from '@/components/messages-provider';
import { useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';
import { useSafeBack } from '@/hooks/use-safe-navigation';

export default function MessageThreadScreen() {
  const goBack = useSafeBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sendMessage, markRead } = useMessages();
  const { conversation, messages, uid } = useThread(id);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Marks the chat as read when it opens and whenever a new message arrives while it is open.
  const unread = conversation?.unread ?? false;
  useEffect(() => {
    if (id && unread) {
      markRead(id);
    }
  }, [id, unread, messages.length, markRead]);

  const handleSend = () => {
    if (!conversation || draft.trim().length === 0) {
      return;
    }

    const text = draft;
    setSendError('');
    setDraft('');
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    sendMessage({ id: conversation.id, otherId: conversation.otherId }, text).catch((error) => {
      console.error('AutoWise: failed to send message', error);
      setDraft(text);
      setSendError("Message couldn't be sent. Check your connection and that the latest firestore.rules are published.");
    });
  };

  if (!conversation) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <AppHeader />
          <View style={styles.headerRow}>
            <Pressable accessibilityLabel="Go back" accessibilityRole="button" hitSlop={8} onPress={goBack} style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}>
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </Pressable>
            {conversation === undefined ? <ActivityIndicator color={colors.gold} style={styles.loader} /> : <Text style={styles.headerTitle}>Conversation not found</Text>}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <AppHeader />
        <View style={styles.headerRow}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" hitSlop={8} onPress={goBack} style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </Pressable>
          <View style={styles.headerAvatar}>
            <Ionicons name={conversation.otherRole === 'mechanic' ? 'construct' : 'person'} size={16} color={colors.gold} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {conversation.name}
            </Text>
            <Text style={styles.headerSubtitle}>{conversation.otherRole === 'mechanic' ? 'Mechanic' : 'Customer'}</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && <Text style={styles.emptyText}>No messages yet. Say hello to {conversation.name}.</Text>}
          {messages.map((message) => {
            const mine = message.senderId === uid;

            return (
              <View key={message.id} style={[styles.bubbleRow, mine ? styles.bubbleRowMe : styles.bubbleRowThem]}>
                <View style={[styles.bubble, mine ? styles.bubbleMe : styles.bubbleThem]}>
                  <Text style={mine ? styles.bubbleTextMe : styles.bubbleTextThem}>{message.text}</Text>
                </View>
                <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMe]}>{formatMessageTime(message.createdAtMs)}</Text>
              </View>
            );
          })}
        </ScrollView>

        {sendError.length > 0 && <Text style={styles.sendError}>{sendError}</Text>}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={(value) => {
              setSendError('');
              setDraft(value);
            }}
            placeholder="Type a message"
            placeholderTextColor={colors.muted}
            maxLength={2000}
            multiline
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            disabled={draft.trim().length === 0}
            onPress={handleSend}
            style={({ pressed }) => [styles.sendButton, draft.trim().length === 0 && styles.sendButtonDisabled, pressed && styles.buttonPressed]}
          >
            <Ionicons name="send" size={17} color={colors.dark} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    headerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      paddingHorizontal: 18,
      paddingTop: 14,
      paddingBottom: 12,
    },
    backButton: { alignItems: 'center', borderRadius: 20, height: 38, justifyContent: 'center', width: 38 },
    buttonPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
    headerAvatar: {
      alignItems: 'center',
      backgroundColor: withAlpha(colors.gold, 0.14),
      borderRadius: 15,
      height: 30,
      justifyContent: 'center',
      marginLeft: 6,
      marginRight: 8,
      width: 30,
    },
    headerTextWrap: { flex: 1, minWidth: 0 },
    headerTitle: { color: colors.text, flexShrink: 1, fontSize: 16, fontWeight: '800' },
    headerSubtitle: { color: colors.muted, fontSize: 11, marginTop: 1 },
    loader: { marginLeft: 12 },
    emptyText: { color: colors.muted, fontSize: 13, marginTop: 24, textAlign: 'center' },
    sendError: { color: colors.danger, fontSize: 12, lineHeight: 17, paddingHorizontal: 18, paddingTop: 8 },
    content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 14 },
    bubbleRow: { marginBottom: 14, maxWidth: '82%' },
    bubbleRowMe: { alignItems: 'flex-end', alignSelf: 'flex-end' },
    bubbleRowThem: { alignItems: 'flex-start', alignSelf: 'flex-start' },
    bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleMe: { backgroundColor: colors.gold, borderBottomRightRadius: 4 },
    bubbleThem: { backgroundColor: colors.card, borderBottomLeftRadius: 4, borderColor: colors.border, borderWidth: 1 },
    bubbleTextMe: { color: colors.dark, fontSize: 14, lineHeight: 19 },
    bubbleTextThem: { color: colors.text, fontSize: 14, lineHeight: 19 },
    bubbleTime: { color: colors.muted, fontSize: 9, marginTop: 4 },
    bubbleTimeMe: { textAlign: 'right' },
    inputBar: {
      alignItems: 'flex-end',
      borderTopColor: colors.border,
      borderTopWidth: 1,
      flexDirection: 'row',
      gap: 10,
      paddingBottom: 14,
      paddingHorizontal: 18,
      paddingTop: 12,
    },
    input: {
      backgroundColor: colors.cardAlt,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      color: colors.text,
      flex: 1,
      fontSize: 14,
      maxHeight: 110,
      minHeight: 44,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 12,
    },
    sendButton: {
      alignItems: 'center',
      backgroundColor: colors.gold,
      borderRadius: 22,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    sendButtonDisabled: { opacity: 0.45 },
  });
}
