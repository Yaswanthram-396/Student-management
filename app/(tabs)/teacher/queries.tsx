import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  teacherQueriesApi,
  type ParentQuery,
  type QueryDetail,
  type QueryReplyItem,
  type QueryStatus,
} from '../../../services/teacher-queries';
import { useTeacherStore } from '../../../store/teacher-store';
import { useAuthStore } from '../../../store/auth-store';
import type { TeacherMeResponse } from '../../../types/auth';

const ACCENT = '#185FA5';
const GREEN = '#1D9E75';
const AMBER = '#D97706';

type FilterTab = 'ALL' | QueryStatus;

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'ANSWERED', label: 'Answered' },
  { key: 'CLOSED', label: 'Closed' },
];

const STATUS_CONFIG: Record<QueryStatus, { color: string; bg: string; label: string }> = {
  OPEN:     { color: AMBER,    bg: '#FFFBEB', label: 'Open'     },
  ANSWERED: { color: GREEN,    bg: '#E1F5EE', label: 'Answered' },
  CLOSED:   { color: '#888888', bg: '#F5F5F5', label: 'Closed'   },
};

function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
function dateStr(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatListDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Chat Sheet ──────────────────────────────────────────────────────────────
interface ChatSheetProps {
  query: ParentQuery;
  visible: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: QueryStatus) => void;
}

function ChatSheet({ query, visible, onClose, onStatusChange }: ChatSheetProps) {
  const { currentUser } = useAuthStore();
  const teacher = currentUser as TeacherMeResponse | null;
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [detail, setDetail] = useState<QueryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDetail(null);
    setReplyText('');
    setSendError('');
    fetchDetail();
  }, [visible, query.id]);

  async function fetchDetail() {
    setLoading(true);
    setError('');
    try {
      const d = await teacherQueriesApi.getDetail(query.id);
      setDetail(d);
    } catch (err: any) {
      setError(err.details ?? 'Failed to load conversation.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const msg = replyText.trim();
    if (!msg) return;
    setSendError('');
    setSending(true);
    try {
      const result = await teacherQueriesApi.reply(query.id, msg, false);
      // Append new reply locally
      const newReply: QueryReplyItem = {
        id: result.id,
        sender_id: result.sender_id,
        sender_role: 'TEACHER',
        message: msg,
        created_at: result.created_at,
      };
      setDetail(prev => prev ? { ...prev, replies: [...prev.replies, newReply] } : prev);
      setReplyText('');
      onStatusChange(query.id, result.query_status);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      setSendError(err.details ?? 'Failed to send reply.');
    } finally {
      setSending(false);
    }
  }

  async function handleMarkAnswered() {
    if (!replyText.trim()) {
      setSendError('Enter a message to mark as answered.');
      return;
    }
    setSendError('');
    setSending(true);
    try {
      const result = await teacherQueriesApi.reply(query.id, replyText.trim(), true);
      const newReply: QueryReplyItem = {
        id: result.id,
        sender_id: result.sender_id,
        sender_role: 'TEACHER',
        message: replyText.trim(),
        created_at: result.created_at,
      };
      setDetail(prev => prev ? { ...prev, status: result.query_status, replies: [...prev.replies, newReply] } : prev);
      setReplyText('');
      onStatusChange(query.id, result.query_status);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      setSendError(err.details ?? 'Failed to send reply.');
    } finally {
      setSending(false);
    }
  }

  function handleCloseQuery() {
    Alert.alert(
      'Close Query',
      'Mark this query as closed? No further replies will be accepted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Close Query', style: 'destructive', onPress: doClose },
      ],
    );
  }

  async function doClose() {
    setClosing(true);
    try {
      await teacherQueriesApi.close(query.id);
      setDetail(prev => prev ? { ...prev, status: 'CLOSED' } : prev);
      onStatusChange(query.id, 'CLOSED');
    } catch (err: any) {
      Alert.alert('Error', err.details ?? 'Could not close query.');
    } finally {
      setClosing(false);
    }
  }

  const currentStatus = detail?.status ?? query.status;
  const isOpen = currentStatus === 'OPEN';
  const isAnswered = currentStatus === 'ANSWERED';
  const isClosed = currentStatus === 'CLOSED';
  const canReply = isOpen || isAnswered;
  const statusCfg = STATUS_CONFIG[currentStatus];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={chat.safe} edges={['top']}>
        {/* Header */}
        <View style={chat.header}>
          <Pressable
            style={({ pressed }) => [chat.backBtn, pressed && chat.backBtnPressed]}
            onPress={onClose}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color="#111111" />
          </Pressable>

          <View style={chat.headerCenter}>
            <Text style={chat.headerSubject} numberOfLines={1}>{query.subject}</Text>
            <Text style={chat.headerMeta}>
              {query.student?.name} · {query.parent?.name}
            </Text>
          </View>

          <View style={[chat.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[chat.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>

        {/* Close query button for open/answered */}
        {(isOpen || isAnswered) && (
          <Pressable
            style={({ pressed }) => [chat.closeQueryBtn, pressed && { opacity: 0.75 }]}
            onPress={handleCloseQuery}
            disabled={closing}
          >
            {closing
              ? <ActivityIndicator size="small" color="#888888" />
              : <Ionicons name="lock-closed-outline" size={13} color="#888888" />
            }
            <Text style={chat.closeQueryText}>Close Query</Text>
          </Pressable>
        )}

        {/* Messages */}
        {loading && (
          <View style={chat.centered}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={chat.stateText}>Loading conversation…</Text>
          </View>
        )}

        {!loading && !!error && (
          <View style={chat.centered}>
            <Ionicons name="alert-circle-outline" size={36} color="#DC2626" />
            <Text style={chat.errorText}>{error}</Text>
            <Pressable style={chat.retryBtn} onPress={fetchDetail}>
              <Text style={chat.retryText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {!loading && !error && detail && (
          <ScrollView
            ref={scrollRef}
            style={chat.scroll}
            contentContainerStyle={chat.scrollContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {/* Original query bubble (parent) */}
            <View style={chat.dateSep}>
              <Text style={chat.dateSepText}>{dateStr(detail.created_at)}</Text>
            </View>

            <View style={chat.rowLeft}>
              <View style={chat.senderTag}>
                <Text style={chat.senderTagText}>{detail.parent?.name}</Text>
              </View>
              <View style={[chat.bubble, chat.bubbleLeft]}>
                <Text style={chat.bubbleText}>{detail.message}</Text>
                <Text style={chat.bubbleTime}>{timeStr(detail.created_at)}</Text>
              </View>
            </View>

            {/* Reply bubbles */}
            {detail.replies.map((reply, idx) => {
              const isTeacher = reply.sender_role === 'TEACHER';
              const prevReply = detail.replies[idx - 1];
              const showDate = idx === 0 || dateStr(reply.created_at) !== dateStr(prevReply?.created_at ?? '');
              return (
                <React.Fragment key={reply.id}>
                  {showDate && (
                    <View style={chat.dateSep}>
                      <Text style={chat.dateSepText}>{dateStr(reply.created_at)}</Text>
                    </View>
                  )}
                  <View style={isTeacher ? chat.rowRight : chat.rowLeft}>
                    {!isTeacher && (
                      <View style={chat.senderTag}>
                        <Text style={chat.senderTagText}>{detail.parent?.name}</Text>
                      </View>
                    )}
                    <View style={[chat.bubble, isTeacher ? chat.bubbleRight : chat.bubbleLeft]}>
                      <Text style={[chat.bubbleText, isTeacher && chat.bubbleTextRight]}>
                        {reply.message}
                      </Text>
                      <Text style={[chat.bubbleTime, isTeacher && chat.bubbleTimeRight]}>
                        {timeStr(reply.created_at)}
                      </Text>
                    </View>
                  </View>
                </React.Fragment>
              );
            })}

            {/* Empty replies */}
            {detail.replies.length === 0 && (
              <View style={chat.emptyReplies}>
                <Text style={chat.emptyRepliesText}>No replies yet. Be the first to respond.</Text>
              </View>
            )}

            {/* Closed notice */}
            {isClosed && (
              <View style={chat.closedNotice}>
                <Ionicons name="lock-closed-outline" size={14} color="#888888" />
                <Text style={chat.closedNoticeText}>This query is closed.</Text>
              </View>
            )}

            <View style={{ height: 8 }} />
          </ScrollView>
        )}

        {/* Reply input */}
        {!loading && !error && canReply && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            <View style={[chat.inputArea, { paddingBottom: insets.bottom || 12 }]}>
              {!!sendError && (
                <View style={chat.sendErrorRow}>
                  <Ionicons name="alert-circle-outline" size={13} color="#DC2626" />
                  <Text style={chat.sendErrorText}>{sendError}</Text>
                </View>
              )}
              <View style={chat.inputRow}>
                <TextInput
                  style={chat.input}
                  value={replyText}
                  onChangeText={v => { setReplyText(v); setSendError(''); }}
                  placeholder="Type a reply…"
                  placeholderTextColor="#AAAAAA"
                  multiline
                  maxLength={1000}
                />
                <View style={chat.sendActions}>
                  {isOpen && (
                    <Pressable
                      style={({ pressed }) => [chat.markBtn, pressed && { opacity: 0.75 }]}
                      onPress={handleMarkAnswered}
                      disabled={sending}
                    >
                      <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                      <Text style={chat.markBtnText}>Answered</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={({ pressed }) => [
                      chat.sendBtn,
                      !replyText.trim() && chat.sendBtnDisabled,
                      pressed && replyText.trim() && { opacity: 0.8 },
                    ]}
                    onPress={handleSend}
                    disabled={sending || !replyText.trim()}
                  >
                    {sending
                      ? <ActivityIndicator size="small" color="#FFFFFF" />
                      : <Ionicons name="send" size={18} color="#FFFFFF" />
                    }
                  </Pressable>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Queries Screen ─────────────────────────────────────────────────────
export default function QueriesScreen() {
  const { selectedSection } = useTeacherStore();

  const [queries, setQueries] = useState<ParentQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [chatQuery, setChatQuery] = useState<ParentQuery | null>(null);

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

  useFocusEffect(useCallback(() => { fetchQueries(); }, [activeTab, selectedSection?.id]));

  function handleStatusChange(id: string, status: QueryStatus) {
    setQueries(prev => {
      const updated = prev.map(q => q.id === id ? { ...q, status } : q);
      if (activeTab !== 'ALL' && activeTab !== status) {
        return updated.filter(q => q.status === activeTab);
      }
      return updated;
    });
  }

  const counts = {
    ALL: queries.length,
    OPEN: queries.filter(q => q.status === 'OPEN').length,
    ANSWERED: queries.filter(q => q.status === 'ANSWERED').length,
    CLOSED: queries.filter(q => q.status === 'CLOSED').length,
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
          <View style={[styles.openBadge, { backgroundColor: counts.OPEN > 0 ? '#FFFBEB' : '#F5F5F5' }]}>
            <Text style={[styles.openBadgeText, { color: counts.OPEN > 0 ? AMBER : '#AAAAAA' }]}>
              {counts.OPEN} open
            </Text>
          </View>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.tabRow}>
        {TABS.map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            <View style={[styles.tabCount, activeTab === tab.key && styles.tabCountActive]}>
              <Text style={[styles.tabCountText, activeTab === tab.key && styles.tabCountTextActive]}>
                {counts[tab.key]}
              </Text>
            </View>
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
            <Text style={styles.stateText}>Loading queries…</Text>
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
              {activeTab === 'ALL' ? 'No parent queries assigned to you.' : `No ${activeTab.toLowerCase()} queries.`}
            </Text>
          </View>
        )}

        {!loading && !fetchError && queries.map(query => {
          const cfg = STATUS_CONFIG[query.status];
          return (
            <Pressable
              key={query.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => setChatQuery(query)}
            >
              <View style={styles.cardTop}>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                <Text style={styles.cardDate}>{formatListDate(query.created_at)}</Text>
              </View>

              <Text style={styles.cardSubject} numberOfLines={1}>{query.subject}</Text>
              <Text style={styles.cardMessage} numberOfLines={2}>{query.message}</Text>

              <View style={styles.cardFooter}>
                <Ionicons name="person-outline" size={11} color="#AAAAAA" />
                <Text style={styles.cardMeta}>{query.parent?.name ?? '—'}</Text>
                <View style={styles.dot} />
                <Ionicons name="school-outline" size={11} color="#AAAAAA" />
                <Text style={styles.cardMeta}>{query.student?.name ?? '—'}</Text>
                <Pressable
                  style={styles.viewRepliesBtn}
                  onPress={() => setChatQuery(query)}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={13} color={ACCENT} />
                  <Text style={styles.viewRepliesText}>View Replies</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Chat sheet */}
      {chatQuery && (
        <ChatSheet
          query={chatQuery}
          visible={!!chatQuery}
          onClose={() => setChatQuery(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F4F8' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111111' },
  headerSub: { fontSize: 12, color: '#AAAAAA', marginTop: 2 },
  openBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  openBadgeText: { fontSize: 12, fontWeight: '600' },

  tabRow: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: ACCENT },
  tabText: { fontSize: 13, fontWeight: '500', color: '#AAAAAA' },
  tabTextActive: { color: ACCENT, fontWeight: '600' },
  tabCount: { backgroundColor: '#EEEEEE', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabCountActive: { backgroundColor: '#EBF2FB' },
  tabCountText: { fontSize: 10, fontWeight: '600', color: '#888888' },
  tabCountTextActive: { color: ACCENT },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  centered: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  stateText: { fontSize: 14, color: '#888888' },
  errorCard: {
    backgroundColor: '#FFF5F5', borderRadius: 14, padding: 24,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#FFCDD2',
  },
  errorText: { fontSize: 13, color: '#888888', textAlign: 'center' },
  retryBtn: { backgroundColor: '#DC2626', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 9 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#444444' },
  emptyHint: { fontSize: 13, color: '#AAAAAA', textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 0.5, borderColor: '#EEEEEE',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardPressed: { opacity: 0.85 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardDate: { fontSize: 11, color: '#AAAAAA' },
  cardSubject: { fontSize: 15, fontWeight: '600', color: '#111111', marginBottom: 4 },
  cardMessage: { fontSize: 13, color: '#666666', lineHeight: 18, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMeta: { fontSize: 11, color: '#888888' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#CCCCCC', marginHorizontal: 2 },
  viewRepliesBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginLeft: 'auto', backgroundColor: '#EBF2FB',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  viewRepliesText: { fontSize: 12, color: ACCENT, fontWeight: '600' },
});

const chat = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F4F8' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  backBtnPressed: { backgroundColor: '#F0F0F0' },
  headerCenter: { flex: 1 },
  headerSubject: { fontSize: 15, fontWeight: '700', color: '#111111' },
  headerMeta: { fontSize: 11, color: '#AAAAAA', marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },

  closeQueryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F5F5F5', paddingHorizontal: 14, paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
    justifyContent: 'center',
  },
  closeQueryText: { fontSize: 12, color: '#888888', fontWeight: '500' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  stateText: { fontSize: 14, color: '#888888' },
  errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  retryBtn: { backgroundColor: '#DC2626', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9 },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },

  scroll: { flex: 1 },
  scrollContent: { padding: 12 },

  dateSep: { alignItems: 'center', marginVertical: 10 },
  dateSepText: { fontSize: 11, color: '#AAAAAA', backgroundColor: '#F4F4F8', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10 },

  rowLeft: { alignItems: 'flex-start', marginBottom: 6, maxWidth: '80%' },
  rowRight: { alignItems: 'flex-end', marginBottom: 6, maxWidth: '80%', alignSelf: 'flex-end' },

  senderTag: { marginBottom: 2, paddingLeft: 4 },
  senderTagText: { fontSize: 10, color: '#AAAAAA', fontWeight: '500' },

  bubble: {
    borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9,
    maxWidth: '100%',
  },
  bubbleLeft: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 4, borderWidth: 0.5, borderColor: '#EEEEEE' },
  bubbleRight: { backgroundColor: ACCENT, borderTopRightRadius: 4 },
  bubbleText: { fontSize: 14, color: '#111111', lineHeight: 20 },
  bubbleTextRight: { color: '#FFFFFF' },
  bubbleTime: { fontSize: 10, color: '#AAAAAA', marginTop: 4, textAlign: 'right' },
  bubbleTimeRight: { color: 'rgba(255,255,255,0.65)' },

  emptyReplies: { alignItems: 'center', paddingVertical: 32, gap: 4 },
  emptyRepliesText: { fontSize: 13, color: '#AAAAAA', textAlign: 'center' },

  closedNotice: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#F5F5F5', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 14, marginTop: 8,
  },
  closedNoticeText: { fontSize: 12, color: '#888888' },

  inputArea: {
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EEEEEE',
    paddingHorizontal: 12, paddingTop: 10,
  },
  sendErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  sendErrorText: { fontSize: 12, color: '#DC2626', flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1, backgroundColor: '#F5F5F5', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14,
    color: '#111111', maxHeight: 100,
  },
  sendActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  markBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E1F5EE', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20,
  },
  markBtnText: { fontSize: 12, fontWeight: '600', color: GREEN },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#CCCCCC' },
});
