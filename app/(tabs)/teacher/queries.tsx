import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  teacherQueriesApi,
  type ParentQuery,
  type QueryStatus,
} from '../../../services/teacher-queries';
import { useTeacherStore } from '../../../store/teacher-store';

const ACCENT = '#185FA5';

type FilterTab = 'ALL' | QueryStatus;

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'ANSWERED', label: 'Answered' },
  { key: 'CLOSED', label: 'Closed' },
];

const STATUS_CONFIG: Record<QueryStatus, { color: string; bg: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }> = {
  OPEN: { color: '#D97706', bg: '#FFFBEB', icon: 'time-outline' },
  ANSWERED: { color: '#1D9E75', bg: '#E1F5EE', icon: 'checkmark-circle-outline' },
  CLOSED: { color: '#888888', bg: '#F5F5F5', icon: 'lock-closed-outline' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function QueriesScreen() {
  const { selectedSection } = useTeacherStore();

  const [queries, setQueries] = useState<ParentQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  const [selectedQuery, setSelectedQuery] = useState<ParentQuery | null>(null);
  const [replyText, setReplyText] = useState('');
  const [markAnswered, setMarkAnswered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState('');

  async function fetchQueries(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    setFetchError('');
    try {
      const params: { status?: QueryStatus; section_id?: string } = {};
      if (activeTab !== 'ALL') params.status = activeTab;
      if (selectedSection?.id) params.section_id = selectedSection.id;
      const data = await teacherQueriesApi.getAll(params);
      setQueries(data.results);
    } catch (err: any) {
      setFetchError(err.details ?? 'Failed to load queries.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchQueries();
    }, [activeTab, selectedSection?.id]),
  );

  function openQuery(query: ParentQuery) {
    setSelectedQuery(query);
    setReplyText('');
    setMarkAnswered(false);
    setReplyError('');
  }

  function closeSheet() {
    if (submitting) return;
    setSelectedQuery(null);
  }

  async function handleReply() {
    if (!selectedQuery) return;
    const msg = replyText.trim();
    if (!msg) { setReplyError('Reply message cannot be empty.'); return; }

    setReplyError('');
    setSubmitting(true);
    try {
      const result = await teacherQueriesApi.reply(selectedQuery.id, msg, markAnswered);
      // Update the query status in local list
      setQueries((prev) =>
        prev.map((q) =>
          q.id === selectedQuery.id ? { ...q, status: result.query_status } : q,
        ),
      );
      setSelectedQuery(null);
    } catch (err: any) {
      setReplyError(err.details ?? 'Failed to send reply. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const counts = {
    ALL: queries.length,
    OPEN: queries.filter((q) => q.status === 'OPEN').length,
    ANSWERED: queries.filter((q) => q.status === 'ANSWERED').length,
    CLOSED: queries.filter((q) => q.status === 'CLOSED').length,
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Parent Queries</Text>
          {selectedSection && (
            <Text style={styles.headerSub}>
              {selectedSection.class_name} – {selectedSection.section_name}
            </Text>
          )}
        </View>
        {!loading && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{counts.OPEN} open</Text>
          </View>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {counts[tab.key] > 0 && (
              <View style={[styles.tabCount, activeTab === tab.key && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, activeTab === tab.key && styles.tabCountTextActive]}>
                  {counts[tab.key]}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchQueries(true); }}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
      >
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.loadingText}>Loading queries…</Text>
          </View>
        )}

        {!loading && !!fetchError && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={32} color="#DC2626" />
            <Text style={styles.errorText}>{fetchError}</Text>
            <Pressable style={styles.retryBtn} onPress={() => fetchQueries()}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {!loading && !fetchError && queries.length === 0 && (
          <View style={styles.centered}>
            <Ionicons name="chatbubbles-outline" size={52} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No queries found</Text>
            <Text style={styles.emptyHint}>
              {activeTab === 'ALL'
                ? 'No parent queries have been assigned to you.'
                : `No ${activeTab.toLowerCase()} queries.`}
            </Text>
          </View>
        )}

        {!loading && !fetchError && queries.map((query) => {
          const cfg = STATUS_CONFIG[query.status];
          const isClosed = query.status === 'CLOSED';
          return (
            <Pressable
              key={query.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => openQuery(query)}
            >
              <View style={styles.cardTop}>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={11} color={cfg.color} />
                  <Text style={[styles.statusText, { color: cfg.color }]}>
                    {query.status.charAt(0) + query.status.slice(1).toLowerCase()}
                  </Text>
                </View>
                <Text style={styles.cardDate}>{formatDate(query.created_at)}</Text>
              </View>

              <Text style={styles.cardSubject} numberOfLines={1}>{query.subject}</Text>
              <Text style={styles.cardMessage} numberOfLines={2}>{query.message}</Text>

              <View style={styles.cardFooter}>
                <View style={styles.personChip}>
                  <Ionicons name="person-outline" size={11} color="#888888" />
                  <Text style={styles.personText}>{query.parent?.name ?? '—'}</Text>
                </View>
                <View style={styles.dot} />
                <View style={styles.personChip}>
                  <Ionicons name="school-outline" size={11} color="#888888" />
                  <Text style={styles.personText}>{query.student?.name ?? '—'}</Text>
                </View>
                {!isClosed && (
                  <View style={styles.replyHint}>
                    <Ionicons name="arrow-undo-outline" size={13} color={ACCENT} />
                    <Text style={styles.replyHintText}>Reply</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Reply sheet */}
      <Modal
        visible={!!selectedQuery}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeSheet} />

          {selectedQuery && (() => {
            const cfg = STATUS_CONFIG[selectedQuery.status];
            const isClosed = selectedQuery.status === 'CLOSED';
            return (
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />

                {/* Sheet header */}
                <View style={styles.sheetHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={11} color={cfg.color} />
                    <Text style={[styles.statusText, { color: cfg.color }]}>
                      {selectedQuery.status.charAt(0) + selectedQuery.status.slice(1).toLowerCase()}
                    </Text>
                  </View>
                  <Pressable onPress={closeSheet} hitSlop={8}>
                    <Ionicons name="close" size={22} color="#666666" />
                  </Pressable>
                </View>

                <ScrollView
                  style={styles.sheetScroll}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Query details */}
                  <Text style={styles.sheetSubject}>{selectedQuery.subject}</Text>

                  <View style={styles.sheetPersonRow}>
                    <View style={styles.personChip}>
                      <Ionicons name="person-outline" size={12} color="#888888" />
                      <Text style={styles.personText}>{selectedQuery.parent?.name ?? '—'}</Text>
                    </View>
                    <Text style={styles.sheetArrow}>→</Text>
                    <View style={styles.personChip}>
                      <Ionicons name="school-outline" size={12} color="#888888" />
                      <Text style={styles.personText}>{selectedQuery.student?.name ?? '—'}</Text>
                    </View>
                  </View>

                  <View style={styles.queryMsgBox}>
                    <Text style={styles.queryMsgText}>{selectedQuery.message}</Text>
                    <Text style={styles.queryMsgDate}>{formatDate(selectedQuery.created_at)}</Text>
                  </View>

                  {/* Closed state */}
                  {isClosed && (
                    <View style={styles.closedBanner}>
                      <Ionicons name="lock-closed-outline" size={15} color="#888888" />
                      <Text style={styles.closedText}>
                        This query is closed and cannot receive new replies.
                      </Text>
                    </View>
                  )}

                  {/* Reply form */}
                  {!isClosed && (
                    <>
                      <Text style={styles.fieldLabel}>Your Reply</Text>
                      <TextInput
                        style={[styles.input, styles.inputMulti]}
                        value={replyText}
                        onChangeText={(v) => { setReplyText(v); setReplyError(''); }}
                        placeholder="Type your reply to the parent…"
                        placeholderTextColor="#AAAAAA"
                        multiline
                        textAlignVertical="top"
                      />

                      {selectedQuery.status === 'OPEN' && (
                        <View style={styles.toggleRow}>
                          <View>
                            <Text style={styles.toggleLabel}>Mark as Answered</Text>
                            <Text style={styles.toggleHint}>
                              Changes query status from Open → Answered
                            </Text>
                          </View>
                          <Switch
                            value={markAnswered}
                            onValueChange={setMarkAnswered}
                            trackColor={{ false: '#DDDDDD', true: '#93C5FD' }}
                            thumbColor={markAnswered ? ACCENT : '#FFFFFF'}
                          />
                        </View>
                      )}

                      {!!replyError && (
                        <View style={styles.errorRow}>
                          <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                          <Text style={styles.errorText}>{replyError}</Text>
                        </View>
                      )}

                      <Pressable
                        style={({ pressed }) => [
                          styles.submitBtn,
                          pressed && styles.submitBtnPressed,
                          submitting && styles.submitBtnDisabled,
                        ]}
                        onPress={handleReply}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="send-outline" size={17} color="#FFFFFF" />
                            <Text style={styles.submitBtnText}>Send Reply</Text>
                          </>
                        )}
                      </Pressable>
                    </>
                  )}
                </ScrollView>
              </View>
            );
          })()}
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F4F8' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111111' },
  headerSub: { fontSize: 12, color: '#AAAAAA', marginTop: 2 },
  countBadge: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  countBadgeText: { fontSize: 12, fontWeight: '600', color: '#D97706' },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: ACCENT },
  tabText: { fontSize: 13, fontWeight: '500', color: '#AAAAAA' },
  tabTextActive: { color: ACCENT, fontWeight: '600' },
  tabCount: {
    backgroundColor: '#EEEEEE',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabCountActive: { backgroundColor: '#EBF2FB' },
  tabCountText: { fontSize: 10, fontWeight: '600', color: '#888888' },
  tabCountTextActive: { color: ACCENT },

  // List
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  centered: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  loadingText: { fontSize: 14, color: '#888888' },

  errorCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: { fontSize: 13, color: '#888888', textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 9,
    marginTop: 4,
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#444444' },
  emptyHint: { fontSize: 13, color: '#AAAAAA', textAlign: 'center', lineHeight: 20 },

  // Query card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: { opacity: 0.85 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardDate: { fontSize: 11, color: '#AAAAAA' },
  cardSubject: { fontSize: 15, fontWeight: '600', color: '#111111', marginBottom: 4 },
  cardMessage: { fontSize: 13, color: '#666666', lineHeight: 18, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  personChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  personText: { fontSize: 11, color: '#888888' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#CCCCCC' },
  replyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
  },
  replyHintText: { fontSize: 12, color: ACCENT, fontWeight: '500' },

  // Modal / sheet
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: '88%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#DDDDDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sheetScroll: { paddingHorizontal: 20 },
  sheetSubject: { fontSize: 18, fontWeight: '700', color: '#111111', marginBottom: 8 },
  sheetPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sheetArrow: { fontSize: 14, color: '#CCCCCC' },

  queryMsgBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  queryMsgText: { fontSize: 14, color: '#333333', lineHeight: 20, marginBottom: 8 },
  queryMsgDate: { fontSize: 11, color: '#AAAAAA' },

  closedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  closedText: { flex: 1, fontSize: 13, color: '#888888', lineHeight: 18 },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111111',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputMulti: { minHeight: 110, paddingTop: 12 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#111111', marginBottom: 2 },
  toggleHint: { fontSize: 12, color: '#AAAAAA' },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 32,
  },
  submitBtnPressed: { opacity: 0.85 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
