import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { HeaderBar, BottomSheet, SegmentedControl } from '../shared';
import { teacherApi, type ParentQuery } from '../../services/teacher';

type Filter = 'ALL' | 'OPEN' | 'REPLIED';

const STATUS_CFG = {
  OPEN:    { bg: colors.warningBg,  text: colors.warning,       label: 'Open'    },
  REPLIED: { bg: colors.successBg,  text: colors.success,       label: 'Replied' },
  CLOSED:  { bg: colors.border,     text: colors.textMuted,     label: 'Closed'  },
} as const;

function relativeTime(iso: string): string {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    const days = Math.floor(diff / 86400);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso;
  }
}

export function QueriesScreen() {
  const [queries, setQueries] = useState<ParentQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selectedQuery, setSelectedQuery] = useState<ParentQuery | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const loadQueries = useCallback(async () => {
    setLoading(true);
    try {
      const params =
        filter !== 'ALL' ? { status: filter } : undefined;
      const res = await teacherApi.getParentQueries(params);
      setQueries(res.results);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load queries.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadQueries();
  }, [loadQueries]);

  async function handleReply() {
    if (!selectedQuery || !replyText.trim()) {
      Alert.alert('Validation', 'Please enter a reply message.');
      return;
    }
    setReplying(true);
    try {
      const res = await teacherApi.replyToParentQuery(
        selectedQuery.id,
        replyText.trim(),
      );
      setQueries((prev) =>
        prev.map((q) =>
          q.id === selectedQuery.id
            ? { ...q, status: res.query_status as ParentQuery['status'] }
            : q,
        ),
      );
      setSelectedQuery(null);
      setReplyText('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to send reply.');
    } finally {
      setReplying(false);
    }
  }

  const displayed =
    filter === 'ALL' ? queries : queries.filter((q) => q.status === filter);

  function renderItem({ item }: { item: ParentQuery }) {
    const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.CLOSED;
    const isOpen = item.status === 'OPEN';

    return (
      <Pressable
        style={[st.queryCard, isOpen && st.queryCardOpen]}
        onPress={() => {
          setSelectedQuery(item);
          setReplyText('');
        }}
      >
        <View style={st.queryHeader}>
          <View style={st.queryHeaderLeft}>
            <Text style={st.querySubject}>{item.subject}</Text>
            <Text style={st.queryTime}>{relativeTime(item.created_at)}</Text>
          </View>
          <View style={[st.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[st.statusBadgeText, { color: cfg.text }]}>
              {cfg.label}
            </Text>
          </View>
        </View>

        <Text style={st.queryMessage} numberOfLines={2}>
          {item.message}
        </Text>

        <View style={st.queryFooter}>
          <View style={st.queryFrom}>
            <Ionicons name="person-outline" size={11} color={colors.textMuted} />
            <Text style={st.queryFromText}>
              {item.parent.name} · {item.student.name}
            </Text>
          </View>
          {isOpen && (
            <View style={st.replyHint}>
              <Ionicons
                name="chatbubble-outline"
                size={11}
                color={colors.teacher}
              />
              <Text style={st.replyHintText}>Tap to reply</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <HeaderBar center={<Text style={st.headerTitle}>Parent Queries</Text>} />

      {/* Filter */}
      <View style={st.filterBar}>
        <SegmentedControl
          options={['All', 'Open', 'Replied']}
          activeIndex={filter === 'ALL' ? 0 : filter === 'OPEN' ? 1 : 2}
          onChange={(i) =>
            setFilter((['ALL', 'OPEN', 'REPLIED'] as Filter[])[i])
          }
          accentColor={colors.teacher}
        />
      </View>

      {loading ? (
        <View style={st.centered}>
          <ActivityIndicator size="large" color={colors.teacher} />
        </View>
      ) : displayed.length === 0 ? (
        <View style={st.centered}>
          <Ionicons
            name="chatbubbles-outline"
            size={52}
            color={colors.textMuted}
          />
          <Text style={st.emptyTitle}>No Queries</Text>
          <Text style={st.emptyBody}>
            {filter === 'OPEN'
              ? 'No open queries from parents right now.'
              : 'No queries found.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={st.listContent}
          ItemSeparatorComponent={() => (
            <View style={{ height: spacing.sm }} />
          )}
          showsVerticalScrollIndicator={false}
          onRefresh={loadQueries}
          refreshing={loading}
        />
      )}

      {/* Reply sheet */}
      <BottomSheet
        visible={!!selectedQuery}
        onClose={() => setSelectedQuery(null)}
      >
        {selectedQuery && (
          <>
            <Text style={st.sheetTitle}>Reply to Query</Text>

            {/* Query preview */}
            <View style={st.queryPreview}>
              <View style={st.previewHeader}>
                <Text style={st.previewSubject}>{selectedQuery.subject}</Text>
                <Text style={st.previewFrom}>{selectedQuery.parent.name}</Text>
              </View>
              <Text style={st.previewMessage}>{selectedQuery.message}</Text>
              <View style={st.previewFooter}>
                <Ionicons
                  name="person-outline"
                  size={11}
                  color={colors.textMuted}
                />
                <Text style={st.previewStudent}>
                  Student: {selectedQuery.student.name}
                </Text>
              </View>
            </View>

            <Text style={st.fieldLabel}>Your Reply</Text>
            <TextInput
              style={st.replyInput}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Type your reply to the parent…"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />

            <View style={st.sheetBtns}>
              <Pressable
                style={st.cancelBtn}
                onPress={() => setSelectedQuery(null)}
              >
                <Text style={st.cancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[st.sendBtn, replying && st.sendBtnBusy]}
                onPress={handleReply}
                disabled={replying}
              >
                {replying ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <>
                    <Ionicons name="send" size={14} color={colors.surface} />
                    <Text style={st.sendTxt}>Send Reply</Text>
                  </>
                )}
              </Pressable>
            </View>
          </>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
  },
  emptyTitle: { ...(typography.h2 as object), color: colors.textPrimary },
  emptyBody: {
    ...(typography.body as object),
    color: colors.textMuted,
    textAlign: 'center',
  },

  filterBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  listContent: { padding: spacing.lg },

  queryCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
  },
  queryCardOpen: {
    borderColor: colors.teacher,
    borderWidth: 1,
  },
  queryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  queryHeaderLeft: { flex: 1, marginRight: spacing.sm },
  querySubject: {
    ...(typography.body as object),
    fontWeight: '500',
    color: colors.textPrimary,
  },
  queryTime: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    flexShrink: 0,
  },
  statusBadgeText: { ...(typography.label as object) },
  queryMessage: {
    ...(typography.body as object),
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  queryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  queryFrom: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  queryFromText: { ...(typography.caption as object), color: colors.textMuted },
  replyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  replyHintText: {
    ...(typography.caption as object),
    color: colors.teacher,
    fontWeight: '500',
  },

  sheetTitle: {
    ...(typography.h3 as object),
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...(typography.caption as object),
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  queryPreview: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  previewSubject: {
    ...(typography.body as object),
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  previewFrom: { ...(typography.caption as object), color: colors.textMuted },
  previewMessage: {
    ...(typography.body as object),
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  previewStudent: { ...(typography.caption as object), color: colors.textMuted },
  replyInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: spacing.md,
    ...(typography.body as object),
    color: colors.textPrimary,
    height: 110,
    marginBottom: spacing.lg,
    textAlignVertical: 'top',
  },
  sheetBtns: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelTxt: {
    ...(typography.h3 as object),
    fontWeight: '500',
    color: colors.textSecondary,
  },
  sendBtn: {
    flex: 2,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.teacher,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  sendBtnBusy: { backgroundColor: colors.success },
  sendTxt: {
    ...(typography.h3 as object),
    fontWeight: '500',
    color: colors.surface,
  },
});
