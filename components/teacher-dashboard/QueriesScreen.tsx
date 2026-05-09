import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { teacherApi } from '../../services/teacher';
import { useTeacherStore } from '../../store/teacher-store';
import { ParentQuery } from '../../types/teacher';
import { StatusPill } from '../shared';

type TabKey = 'OPEN' | 'ANSWERED' | 'CLOSED';

function QueryCard({ item, onReply }: { item: ParentQuery, onReply: () => void }) {
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSendReply() {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await teacherApi.replyToParentQuery(item.id, {
        message: replyText,
        mark_answered: true
      });
      setIsReplying(false);
      setReplyText('');
      onReply(); // callback to refresh the list
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.parentName}>{item.parent.name}</Text>
          <Text style={styles.studentName}>Parent of {item.student.name}</Text>
        </View>
        <StatusPill 
          variant={item.status === 'OPEN' ? 'warning' : item.status === 'ANSWERED' ? 'success' : 'info'} 
          label={item.status} 
        />
      </View>
      
      <Text style={styles.subjectText}>Subject: {item.subject}</Text>
      <Text style={styles.messageText}>{item.message}</Text>
      
      <Text style={styles.dateText}>{new Date(item.created_at).toLocaleString()}</Text>

      {item.status === 'OPEN' && !isReplying && (
        <Pressable style={styles.replyBtn} onPress={() => setIsReplying(true)}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.teacher} />
          <Text style={styles.replyBtnText}>Reply</Text>
        </Pressable>
      )}

      {isReplying && (
        <View style={styles.replyBox}>
          <TextInput
            style={styles.replyInput}
            placeholder="Type your response..."
            value={replyText}
            onChangeText={setReplyText}
            multiline
            autoFocus
          />
          <View style={styles.replyActions}>
            <Pressable onPress={() => setIsReplying(false)} style={styles.cancelReplyBtn}>
              <Text style={styles.cancelReplyText}>Cancel</Text>
            </Pressable>
            <Pressable 
              style={[styles.sendReplyBtn, (!replyText.trim() || submitting) && styles.sendReplyBtnDisabled]}
              onPress={handleSendReply}
              disabled={!replyText.trim() || submitting}
            >
              <Text style={styles.sendReplyText}>{submitting ? 'Sending...' : 'Send'}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export function QueriesScreen() {
  const { selectedSection } = useTeacherStore();
  const [tab, setTab] = useState<TabKey>('OPEN');
  const [queries, setQueries] = useState<ParentQuery[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchQueries = useCallback(async () => {
    if (!selectedSection?.id) return;
    setLoading(true);
    try {
      const res = await teacherApi.getParentQueries({
        section_id: selectedSection.id,
        status: tab
      });
      setQueries(res.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedSection?.id, tab]);

  useEffect(() => {
    void fetchQueries();
  }, [fetchQueries]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Parent Queries</Text>
        <View style={{ width: 40 }} /> 
      </View>

      {!selectedSection ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Select a section first</Text>
          <Text style={styles.emptySub}>
            Please select a section from the dashboard to view queries.
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView 
          style={styles.content} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.tabBar}>
            {(['OPEN', 'ANSWERED', 'CLOSED'] as const).map(key => (
              <Pressable
                key={key}
                style={[styles.tab, tab === key && styles.tabActive]}
                onPress={() => setTab(key)}
              >
                <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>
                  {key}
                </Text>
              </Pressable>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.teacher} style={{ marginTop: spacing.xl }} />
          ) : (
            <FlatList
              data={queries}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <QueryCard item={item} onReply={fetchQueries} />}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
              ListEmptyComponent={() => (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyTitle}>No queries found</Text>
                  <Text style={styles.emptySub}>
                    There are no {tab.toLowerCase()} queries for this section.
                  </Text>
                </View>
              )}
            />
          )}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  tab: {
    flex: 1, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.teacher },
  tabLabel: { ...(typography.body as object), fontWeight: '500', color: colors.textMuted },
  tabLabelActive: { color: colors.textPrimary },
  listContent: { padding: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  cardHeaderLeft: { flex: 1 },
  parentName: { ...(typography.body as object), fontWeight: '600', color: colors.textPrimary },
  studentName: { ...(typography.caption as object), color: colors.textSecondary },
  subjectText: { ...(typography.caption as object), fontWeight: '600', color: colors.textPrimary, marginTop: spacing.xs },
  messageText: { ...(typography.body as object), color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 20 },
  dateText: { ...(typography.caption as object), color: colors.textMuted, marginTop: spacing.sm, fontSize: 10 },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    gap: spacing.xs,
  },
  replyBtnText: { ...(typography.body as object), color: colors.teacher, fontWeight: '500' },
  replyBox: {
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  replyInput: {
    ...(typography.body as object),
    color: colors.textPrimary,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  cancelReplyBtn: { padding: spacing.xs },
  cancelReplyText: { ...(typography.caption as object), color: colors.textSecondary },
  sendReplyBtn: {
    backgroundColor: colors.teacher,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  sendReplyBtnDisabled: { opacity: 0.5 },
  sendReplyText: { ...(typography.caption as object), color: colors.surface, fontWeight: '600' },
  emptyWrap: {
    margin: spacing.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 12, backgroundColor: colors.surface,
  },
  emptyTitle: { ...(typography.h3 as object), color: colors.textPrimary, marginBottom: spacing.xs },
  emptySub: { ...(typography.caption as object), color: colors.textSecondary, textAlign: 'center' },
});
