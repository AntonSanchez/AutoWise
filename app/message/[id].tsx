import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { useMessages } from '@/components/messages-provider';
import { useThemeColors, withAlpha, type ThemeColors } from '@/components/theme-provider';
import { useSafeBack } from '@/hooks/use-safe-navigation';

export default function MessageThreadScreen() {
  const goBack = useSafeBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { conversations, sendMessage } = useMessages();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const conversation = conversations.find((item) => item.id === id);

  const handleSend = () => {
    if (!id || draft.trim().length === 0) {
      return;
    }

    sendMessage(id, draft);
    setDraft('');
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  if (!conversation) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <AppHeader />
          <View style={styles.headerRow}>
            <Pressable hitSlop={8} onPress={goBack} style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}>
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </Pressable>
            <Text style={styles.headerTitle}>Conversation not found</Text>
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
          <Pressable hitSlop={8} onPress={goBack} style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </Pressable>
          <View style={styles.headerAvatar}>
            <Ionicons name={conversation.avatarIcon as any} size={16} color={colors.gold} />
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>{conversation.name}</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        >
          {conversation.messages.map((message) => (
            <View
              key={message.id}
              style={[styles.bubbleRow, message.sender === 'me' ? styles.bubbleRowMe : styles.bubbleRowThem]}
            >
              <View style={[styles.bubble, message.sender === 'me' ? styles.bubbleMe : styles.bubbleThem]}>
                <Text style={message.sender === 'me' ? styles.bubbleTextMe : styles.bubbleTextThem}>{message.text}</Text>
              </View>
              <Text style={[styles.bubbleTime, message.sender === 'me' && styles.bubbleTimeMe]}>{message.time}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message"
            placeholderTextColor={colors.muted}
            multiline
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            disabled={draft.trim().length === 0}
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendButton,
              draft.trim().length === 0 && styles.sendButtonDisabled,
              pressed && styles.buttonPressed,
            ]}
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
    headerTitle: { color: colors.text, flexShrink: 1, fontSize: 16, fontWeight: '800' },
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
