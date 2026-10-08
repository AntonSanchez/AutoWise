import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type FirestoreError,
} from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { db } from '@/lib/firebase';
import { sendPush } from '@/lib/notifications';

import { useAuth, type AccountRole } from './auth-provider';
import { useProfile } from './profile-provider';

// Chats between a customer and a mechanic. Each chat is one document, /conversations/{idA_idB}
// (the two uids sorted and joined with "_", so the same two people always share one chat), with the
// messages in a subcollection. firestore.rules lets only the two people in a chat read or write it.

export type Message = {
  id: string;
  senderId: string;
  text: string;
  createdAtMs: number;
};

export type Conversation = {
  id: string;
  otherId: string;
  name: string;
  otherRole: AccountRole;
  lastMessage: string;
  lastMessageAtMs: number;
  lastSenderId: string;
  unread: boolean;
  // You muted this chat: no banner, push or bell entry, and it doesn't count toward the unread badge.
  muted: boolean;
  // The other person's profile picture (a small data URI) and the one you last shared in this chat.
  avatarUri: string;
  myAvatarUri: string;
  // The other person muted it, so no push is sent to them.
  otherMuted: boolean;
};

export type ChatPartner = { uid: string; name: string; role: AccountRole };

type MessagesContextValue = {
  conversations: Conversation[];
  // True once the first list of chats has arrived.
  loaded: boolean;
  unreadCount: number;
  setMuted: (conversationId: string, muted: boolean) => Promise<void>;
  // Opens (creating if needed) the chat with this person and returns its id.
  startConversation: (partner: ChatPartner) => Promise<string>;
  sendMessage: (conversation: { id: string; otherId: string }, text: string) => Promise<void>;
  markRead: (conversationId: string) => void;
};

const MessagesContext = createContext<MessagesContextValue | undefined>(undefined);

function toMillis(value: unknown): number {
  return value && typeof (value as { toMillis?: unknown }).toMillis === 'function' ? (value as { toMillis: () => number }).toMillis() : 0;
}

function toConversation(id: string, data: DocumentData, uid: string): Conversation {
  const participants: string[] = Array.isArray(data.participants) ? data.participants : [];
  const otherId = participants.find((item) => item !== uid) ?? '';
  const lastMessageAtMs = toMillis(data.lastMessageAt);
  const lastSenderId = typeof data.lastSenderId === 'string' ? data.lastSenderId : '';
  const readAtMs = toMillis(data.readAt?.[uid]);

  return {
    id,
    otherId,
    name: typeof data.names?.[otherId] === 'string' && data.names[otherId] ? data.names[otherId] : 'User',
    otherRole: data.roles?.[otherId] === 'mechanic' ? 'mechanic' : 'customer',
    lastMessage: typeof data.lastMessage === 'string' ? data.lastMessage : '',
    lastMessageAtMs,
    lastSenderId,
    unread: lastSenderId !== '' && lastSenderId !== uid && lastMessageAtMs > readAtMs,
    avatarUri: typeof data.avatars?.[otherId] === 'string' ? data.avatars[otherId] : '',
    myAvatarUri: typeof data.avatars?.[uid] === 'string' ? data.avatars[uid] : '',
    muted: data.muted?.[uid] === true,
    otherMuted: data.muted?.[otherId] === true,
  };
}

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { user, role } = useAuth();
  const { profile } = useProfile();
  const uid = user?.uid ?? null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const sharedAvatars = useRef<Set<string>>(new Set());
  const myName = profile.ownerName?.trim() || user?.displayName?.trim() || 'User';

  // Live list of this person's chats. No orderBy here so Firestore needs no extra index; the list
  // is sorted on the phone.
  useEffect(() => {
    if (!uid) {
      setConversations([]);
      setLoaded(false);
      return;
    }

    return onSnapshot(
      query(collection(db, 'conversations'), where('participants', 'array-contains', uid)),
      (snapshot) => {
        setConversations(
          snapshot.docs
            .map((item) => toConversation(item.id, item.data({ serverTimestamps: 'estimate' }), uid))
            .sort((a, b) => b.lastMessageAtMs - a.lastMessageAtMs),
        );
        setLoaded(true);
      },
      (error: FirestoreError) => console.error('AutoWise: conversations sync failed', error),
    );
  }, [uid]);

  // Chats can't read other people's profiles, so each person copies their own profile picture onto
  // every chat they're in (conversation.avatars[uid]); the other person reads it from there.
  useEffect(() => {
    if (!uid || !loaded) {
      return;
    }

    const avatar = profile.avatarUri ?? '';

    conversations.forEach((conversation) => {
      const key = `${conversation.id}|${avatar.length}|${avatar.slice(-24)}`;

      if (conversation.myAvatarUri === avatar || sharedAvatars.current.has(key)) {
        return;
      }

      sharedAvatars.current.add(key);
      updateDoc(doc(db, 'conversations', conversation.id), { [`avatars.${uid}`]: avatar }).catch((error) =>
        console.warn('AutoWise: could not share profile picture', error),
      );
    });
  }, [conversations, loaded, profile.avatarUri, uid]);

  const value = useMemo<MessagesContextValue>(
    () => ({
      conversations,
      loaded,
      unreadCount: conversations.filter((item) => item.unread && !item.muted).length,
      setMuted: async (conversationId: string, muted: boolean) => {
        if (!uid) {
          return;
        }

        await updateDoc(doc(db, 'conversations', conversationId), { [`muted.${uid}`]: muted });
      },
      startConversation: async (partner: ChatPartner) => {
        if (!uid) {
          throw new Error('Not signed in');
        }

        // Sorted so the same two people always get the same chat id (firestore.rules checks this too).
        const [first, second] = [uid, partner.uid].sort();
        const id = `${first}_${second}`;
        const ref = doc(db, 'conversations', id);
        const existing = await getDoc(ref);

        if (!existing.exists()) {
          await setDoc(ref, {
            participants: [first, second],
            names: { [uid]: myName, [partner.uid]: partner.name },
            roles: { [uid]: role, [partner.uid]: partner.role },
            lastMessage: '',
            lastSenderId: '',
            readAt: {},
            createdAt: serverTimestamp(),
          });
        }

        return id;
      },
      sendMessage: async (conversation, text) => {
        const trimmed = text.trim().slice(0, 2000);

        if (!uid || trimmed.length === 0) {
          return;
        }

        const batch = writeBatch(db);
        batch.set(doc(collection(db, 'conversations', conversation.id, 'messages')), {
          senderId: uid,
          text: trimmed,
          createdAt: serverTimestamp(),
        });
        batch.update(doc(db, 'conversations', conversation.id), {
          lastMessage: trimmed.slice(0, 200),
          lastMessageAt: serverTimestamp(),
          lastSenderId: uid,
          [`readAt.${uid}`]: serverTimestamp(),
        });
        await batch.commit();

        // Tell the other person, unless they muted this chat. This never throws: if they have no device
        // registered it does nothing.
        const otherMuted = conversations.find((item) => item.id === conversation.id)?.otherMuted === true;

        if (!otherMuted) void sendPush(conversation.otherId, {
          title: myName,
          body: trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed,
          data: { type: 'message', conversationId: conversation.id },
        });
      },
      markRead: (conversationId: string) => {
        if (!uid) {
          return;
        }

        updateDoc(doc(db, 'conversations', conversationId), { [`readAt.${uid}`]: serverTimestamp() }).catch(() => {});
      },
    }),
    [conversations, loaded, uid, role, myName],
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages() {
  const context = useContext(MessagesContext);

  if (!context) {
    throw new Error('useMessages must be used within MessagesProvider');
  }

  return context;
}

// Live data for one open chat: the conversation itself (null if it doesn't exist or isn't yours,
// undefined while loading) and its messages, oldest first.
export function useThread(conversationId: string | undefined) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [conversation, setConversation] = useState<Conversation | null | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!uid || !conversationId) {
      setConversation(null);
      setMessages([]);
      return;
    }

    setConversation(undefined);

    const unsubscribeConversation = onSnapshot(
      doc(db, 'conversations', conversationId),
      (snapshot) => {
        setConversation(snapshot.exists() ? toConversation(snapshot.id, snapshot.data({ serverTimestamps: 'estimate' }), uid) : null);
      },
      () => setConversation(null),
    );

    const unsubscribeMessages = onSnapshot(
      query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc')),
      (snapshot) => {
        setMessages(
          snapshot.docs.map((item) => {
            const data = item.data({ serverTimestamps: 'estimate' });

            return {
              id: item.id,
              senderId: typeof data.senderId === 'string' ? data.senderId : '',
              text: typeof data.text === 'string' ? data.text : '',
              createdAtMs: toMillis(data.createdAt),
            };
          }),
        );
      },
      (error: FirestoreError) => console.error('AutoWise: messages sync failed', error),
    );

    return () => {
      unsubscribeConversation();
      unsubscribeMessages();
    };
  }, [uid, conversationId]);

  return { conversation, messages, uid };
}

// "9:41 AM" today, "Yesterday", otherwise a short date.
export function formatMessageTime(ms: number): string {
  if (!ms) {
    return '';
  }

  const date = new Date(ms);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  if (ms >= startOfToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  if (ms >= startOfToday - 24 * 60 * 60 * 1000) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
