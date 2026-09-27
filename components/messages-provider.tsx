import React, { createContext, useContext, useMemo, useState } from 'react';

export type MessageSender = 'me' | 'them';

export type Message = {
  id: string;
  sender: MessageSender;
  text: string;
  time: string;
};

export type Conversation = {
  id: string;
  name: string;
  subtitle: string;
  avatarIcon: string;
  messages: Message[];
};

const initialConversations: Conversation[] = [
  {
    id: 'autowise-support',
    name: 'Username1',
    subtitle: 'We\u2019re here if you need anything',
    avatarIcon: 'person-circle-outline',
    messages: [
      {
        id: 'm1',
        sender: 'them',
        text: 'Hi, this is a placeholder.',
        time: '9:00 AM',
      },
    ],
  },
  {
    id: 'quicklube',
    name: 'Username2',
    subtitle: 'Your upcoming appointment',
    avatarIcon: 'person-circle-outline',
    messages: [
      {
        id: 'm1',
        sender: 'them',
        text: 'Hi! This is also a placeholder.',
        time: 'Yesterday',
      },
    ],
  },
];

type MessagesContextValue = {
  conversations: Conversation[];
  sendMessage: (conversationId: string, text: string) => void;
};

const MessagesContext = createContext<MessagesContextValue | undefined>(undefined);

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);

  const value = useMemo<MessagesContextValue>(
    () => ({
      conversations,
      sendMessage: (conversationId: string, text: string) => {
        const trimmed = text.trim();
        if (trimmed.length === 0) {
          return;
        }

        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  messages: [
                    ...conversation.messages,
                    {
                      id: `${Date.now()}`,
                      sender: 'me',
                      text: trimmed,
                      time: 'Just now',
                    },
                  ],
                }
              : conversation,
          ),
        );
      },
    }),
    [conversations],
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
