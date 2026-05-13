import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { notificationsApi, type AppNotification, type NotificationType } from '../../services/notifications';
import { setSelectedSection, useTeacherStore } from '../../store/teacher-store';

const ACCENT = '#185FA5';

// Per-type icon + color config
const TYPE_CONFIG: Record<
  NotificationType,
  { icon: string; color: string; bg: string; label: string; route: string }
> = {
  ANNOUNCEMENT_PUBLISHED: {
    icon: 'megaphone',
    color: '#534AB7',
    bg: '#F3F0FF',
    label: 'Announcement',
    route: '/(tabs)/teacher/announce',
  },
  HOMEWORK_ASSIGNED: {
    icon: 'book',
    color: '#185FA5',
    bg: '#EBF2FB',
    label: 'Homework',
    route: '/(tabs)/teacher/homework',
  },
  STUDY_MATERIAL_UPLOADED: {
    icon: 'document-text',
    color: '#0369A1',
    bg: '#E0F2FE',
    label: 'Study Material',
    route: '/(tabs)/teacher/content',
  },
  ATTENDANCE_ABSENT: {
    icon: 'person-remove',
    color: '#DC2626',
    bg: '#FEE2E2',
    label: 'Attendance',
    route: '/(tabs)/teacher/attendance',
  },
  PARENT_QUERY_RECEIVED: {
    icon: 'chatbubbles',
    color: '#D97706',
    bg: '#FEF3C7',
    label: 'New Query',
    route: '/(tabs)/teacher/queries',
  },
  QUERY_REPLY_RECEIVED: {
    icon: 'chatbubble-ellipses',
    color: '#1D9E75',
    bg: '#E1F5EE',
    label: 'Query Reply',
    route: '/(tabs)/teacher/queries',
  },
  CALENDAR_EVENT_CREATED: {
    icon: 'calendar',
    color: '#4F46E5',
    bg: '#EEF2FF',
    label: 'Calendar',
    route: '/(tabs)/teacher/',
  },
  BULK_UPLOAD_COMPLETE: {
    icon: 'checkmark-circle',
    color: '#1D9E75',
    bg: '#E1F5EE',
    label: 'Upload Done',
    route: '/(tabs)/teacher/',
  },
};

function formatTime(iso: string) {
  const now = new Date();
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onUnreadCountChange: (count: number) => void;
}

export function NotificationsSheet({ visible, onClose, onUnreadCountChange }: Props) {
  const { selectedSection, sections } = useTeacherStore();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError('');
    try {
      const data = await notificationsApi.getAll(true); // unread only
      setNotifications(data.results);
      onUnreadCountChange(data.unread_count);
    } catch (err: any) {
      setError(err.details ?? 'Failed to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch when sheet opens
  const handleOpen = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function handleMarkAll() {
    setMarkingAll(true);
    try {
      await notificationsApi.markRead(); // empty body = mark all
      setNotifications([]);
      onUnreadCountChange(0);
    } catch {
      // silent fail
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleNotificationPress(notif: AppNotification) {
    // Mark this one as read
    setMarkingId(notif.id);
    try {
      await notificationsApi.markRead([notif.id]);
      const updated = notifications.filter((n) => n.id !== notif.id);
      setNotifications(updated);
      onUnreadCountChange(updated.length);
    } catch {
      // continue anyway
    } finally {
      setMarkingId(null);
    }

    // Switch section if notification belongs to a different one
    const notifSectionId = notif.data?.section_id;
    if (notifSectionId && notifSectionId !== selectedSection?.id) {
      const target = sections.find((s) => s.id === notifSectionId);
      if (target) setSelectedSection(target);
    }

    // Close sheet then navigate
    onClose();
    const cfg = TYPE_CONFIG[notif.type];
    if (cfg?.route) {
      router.replace(cfg.route as any);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            onPress={onClose}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color="#111111" />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {notifications.length > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{notifications.length} unread</Text>
              </View>
            )}
          </View>

          {notifications.length > 0 && (
            <Pressable
              style={({ pressed }) => [styles.markAllBtn, pressed && styles.markAllBtnPressed]}
              onPress={handleMarkAll}
              disabled={markingAll}
            >
              {markingAll ? (
                <ActivityIndicator size="small" color={ACCENT} />
              ) : (
                <Ionicons name="checkmark-done" size={20} color={ACCENT} />
              )}
            </Pressable>
          )}
          {notifications.length === 0 && <View style={{ width: 36 }} />}
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchNotifications(true); }}
              tintColor={ACCENT}
              colors={[ACCENT]}
            />
          }
        >
          {/* Loading */}
          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={ACCENT} />
              <Text style={styles.stateText}>Loading notifications…</Text>
            </View>
          )}

          {/* Error */}
          {!loading && !!error && (
            <View style={styles.errorCard}>
              <View style={styles.errorIconWrap}>
                <Ionicons name="cloud-offline-outline" size={28} color="#DC2626" />
              </View>
              <Text style={styles.errorTitle}>{"Couldn't load notifications"}</Text>
              <Text style={styles.errorBody}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={() => fetchNotifications()}>
                <Ionicons name="refresh-outline" size={15} color="#FFFFFF" />
                <Text style={styles.retryText}>Try Again</Text>
              </Pressable>
            </View>
          )}

          {/* Empty */}
          {!loading && !error && notifications.length === 0 && (
            <View style={styles.centered}>
              <View style={styles.emptyIcon}>
                <Ionicons name="notifications-off-outline" size={36} color="#CCCCCC" />
              </View>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptyBody}>No unread notifications at the moment.</Text>
            </View>
          )}

          {/* Notifications */}
          {!loading && !error && notifications.map((notif) => {
            const cfg = TYPE_CONFIG[notif.type] ?? {
              icon: 'notifications',
              color: '#888888',
              bg: '#F5F5F5',
              label: notif.type,
              route: '/(tabs)/teacher/',
            };
            const isMarkingThis = markingId === notif.id;
            const notifSectionId = notif.data?.section_id;
            const isDifferentSection =
              !!notifSectionId && notifSectionId !== selectedSection?.id;

            return (
              <Pressable
                key={notif.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => handleNotificationPress(notif)}
                disabled={isMarkingThis}
              >
                {/* Icon */}
                <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
                  {isMarkingThis ? (
                    <ActivityIndicator size="small" color={cfg.color} />
                  ) : (
                    <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                  )}
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.typeBadgeText, { color: cfg.color }]}>
                        {cfg.label}
                      </Text>
                    </View>
                    <Text style={styles.timeText}>{formatTime(notif.created_at)}</Text>
                  </View>

                  <Text style={styles.cardTitle} numberOfLines={1}>{notif.title}</Text>
                  <Text style={styles.cardBody} numberOfLines={2}>{notif.body}</Text>

                  {isDifferentSection && (
                    <View style={styles.switchChip}>
                      <Ionicons name="swap-horizontal-outline" size={11} color="#D97706" />
                      <Text style={styles.switchChipText}>Switches class on open</Text>
                    </View>
                  )}
                </View>

                {/* Unread dot */}
                <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F4F8' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: { backgroundColor: '#F0F0F0' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111111' },
  unreadBadge: {
    backgroundColor: '#EBF2FB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  unreadBadgeText: { fontSize: 11, fontWeight: '600', color: ACCENT },
  markAllBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF2FB',
  },
  markAllBtnPressed: { opacity: 0.7 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  centered: { alignItems: 'center', paddingVertical: 64, gap: 12 },
  stateText: { fontSize: 14, color: '#888888' },

  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: { fontSize: 15, fontWeight: '600', color: '#111111' },
  errorBody: { fontSize: 13, color: '#888888', textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 9,
    marginTop: 4,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333333' },
  emptyBody: { fontSize: 13, color: '#AAAAAA', textAlign: 'center' },

  // Notification card
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
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
  cardPressed: { opacity: 0.82 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: { flex: 1 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  timeText: { fontSize: 11, color: '#AAAAAA' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111111', marginBottom: 3 },
  cardBody: { fontSize: 13, color: '#555555', lineHeight: 18 },
  switchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#FFFBEB',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  switchChipText: { fontSize: 10, color: '#D97706', fontWeight: '500' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
});
