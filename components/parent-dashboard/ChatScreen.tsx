import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { HeaderBar } from '../shared';

type Sender = 'teacher' | 'parent';
type Message = { id: string; from: Sender; text: string; time: string };

const INITIAL_MESSAGES: Message[] = [
  { id: '1', from: 'teacher', text: "Hello Priya, Arjun did very well in today's class activity.",            time: '10:30 AM' },
  { id: '2', from: 'parent',  text: "Thank you Ma'am! He was excited about it at home too.",                  time: '10:45 AM' },
  { id: '3', from: 'teacher', text: 'Please make sure he completes the Math homework by tomorrow.',           time: '10:46 AM' },
  { id: '4', from: 'parent',  text: "Sure Ma'am, I will make sure.",                                          time: '11:00 AM' },
  { id: '5', from: 'teacher', text: 'Also, there is a PTM on 10th May. Please confirm your attendance.',      time: '11:02 AM' },
  { id: '6', from: 'parent',  text: "Yes Ma'am, I will be there.",                                            time: '11:05 AM' },
];

function MessageBubble({ item }: { item: Message }) {
  const isParent = item.from === 'parent';
  return (
    <View style={[styles.bubbleRow, isParent ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      <View style={[styles.bubble, isParent ? styles.bubbleParent : styles.bubbleTeacher]}>
        <Text style={[styles.bubbleText, isParent && styles.bubbleTextParent]}>
          {item.text}
        </Text>
      </View>
      <Text style={styles.bubbleTime}>{item.time}</Text>
    </View>
  );
}

export function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList<Message>>(null);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: String(Date.now()), from: 'parent', text, time: timeStr }]);
    setInputText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar center={<Text style={styles.headerTitle}>Messages</Text>} />

      {/* Teacher contact bar */}
      <View style={styles.teacherBar}>
        <View style={styles.teacherAvatar}>
          <Text style={styles.teacherInitials}>SR</Text>
        </View>
        <View>
          <Text style={styles.teacherName}>Mrs. Sunita Rao</Text>
          <Text style={styles.teacherRole}>Class Teacher – 6B</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble item={item} />}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="send" size={18} color={colors.surface} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  // Teacher bar
  teacherBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  teacherAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.parent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherInitials: {
    ...(typography.caption as object),
    fontWeight: '600',
    color: colors.surface,
  },
  teacherName: { ...(typography.h3 as object), color: colors.textPrimary },
  teacherRole: { ...(typography.caption as object), color: colors.textMuted },
  // Messages
  messageList: { padding: spacing.lg, paddingBottom: spacing.md },
  bubbleRow: { maxWidth: '72%' },
  bubbleRowLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubbleRowRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
  },
  bubbleTeacher: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  bubbleParent: {
    backgroundColor: colors.parent,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    ...(typography.body as object),
    color: colors.textPrimary,
    lineHeight: 21,
  },
  bubbleTextParent: { color: colors.surface },
  bubbleTime: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    ...(typography.body as object),
    color: colors.textPrimary,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.parent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
