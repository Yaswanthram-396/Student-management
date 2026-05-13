import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../store/auth-store';
import { useTeacherStore } from '../../../store/teacher-store';
import { notificationsApi } from '../../../services/notifications';
import { teacherQueriesApi } from '../../../services/teacher-queries';
import { teacherHomeworkApi, type Homework } from '../../../services/teacher-homework';
import { teacherAnnouncementsApi, type Announcement } from '../../../services/teacher-announcements';
import type { TeacherMeResponse } from '../../../types/auth';

const ACCENT = '#185FA5';
const GREEN = '#1D9E75';
const AMBER = '#D97706';

function greeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${time}, ${name}!`;
}

function formatDeadline(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const AUDIENCE_COLOR: Record<string, string> = {
  SCHOOL: '#534AB7', CLASS: GREEN, SECTION: ACCENT,
};

export default function HomeScreen() {
  const { currentUser } = useAuthStore();
  const { selectedSection } = useTeacherStore();
  const teacher = currentUser as TeacherMeResponse | null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);
  const [openQueries, setOpenQueries] = useState(0);
  const [upcomingHw, setUpcomingHw] = useState<Homework[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(false);

    const [notifRes, queriesRes, hwRes, annRes] = await Promise.allSettled([
      notificationsApi.getUnreadCount(),
      teacherQueriesApi.getAll({ status: 'OPEN', ...(selectedSection?.id ? { section_id: selectedSection.id } : {}) }),
      selectedSection?.id ? teacherHomeworkApi.getAll({ section_id: selectedSection.id }) : Promise.resolve({ count: 0, results: [] }),
      teacherAnnouncementsApi.getAll(),
    ]);

    let anySuccess = false;

    if (notifRes.status === 'fulfilled') {
      setUnreadCount(notifRes.value.count);
      anySuccess = true;
    }
    if (queriesRes.status === 'fulfilled') {
      setOpenQueries(queriesRes.value.count);
      anySuccess = true;
    }
    if (hwRes.status === 'fulfilled') {
      const now = new Date();
      const upcoming = hwRes.value.results.filter(h => new Date(h.deadline) > now);
      setUpcomingHw(upcoming.slice(0, 3));
      anySuccess = true;
    }
    if (annRes.status === 'fulfilled') {
      setAnnouncements(annRes.value.results.slice(0, 3));
      anySuccess = true;
    }

    if (!anySuccess) setError(true);
    setLoading(false);
    setRefreshing(false);
  }, [selectedSection?.id]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const initials = teacher?.profile.name
    ?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() ?? 'T';

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Loading dashboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color="#CCCCCC" />
          <Text style={styles.errorTitle}>{"Couldn't load dashboard"}</Text>
          <Pressable style={styles.retryBtn} onPress={() => fetchAll()}>
            <Ionicons name="refresh-outline" size={15} color="#FFFFFF" />
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchAll(true); }}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
      >
        {/* ── Greeting ── */}
        <View style={styles.greetingCard}>
          <View style={styles.greetingRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingText}>
                {greeting(teacher?.profile.name ?? 'Teacher')}
              </Text>
              {teacher?.school.name ? (
                <Text style={styles.schoolText}>{teacher.school.name}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={13} color="#AAAAAA" />
            <Text style={styles.dateText}>{today}</Text>
          </View>
          {selectedSection && (
            <View style={styles.sectionPill}>
              <Ionicons name="school-outline" size={12} color={ACCENT} />
              <Text style={styles.sectionPillText}>
                {selectedSection.class_name} – {selectedSection.section_name}
              </Text>
            </View>
          )}
        </View>

        {/* ── Quick stats row ── */}
        {(unreadCount > 0 || openQueries > 0) && (
          <View style={styles.statsRow}>
            {unreadCount > 0 && (
              <Pressable
                style={[styles.statChip, { backgroundColor: '#EBF2FB' }]}
                onPress={() => { /* bell opens notification sheet */ }}
              >
                <Ionicons name="notifications" size={15} color={ACCENT} />
                <Text style={[styles.statChipNum, { color: ACCENT }]}>{unreadCount}</Text>
                <Text style={[styles.statChipLabel, { color: ACCENT }]}>unread</Text>
              </Pressable>
            )}
            {openQueries > 0 && (
              <Pressable
                style={[styles.statChip, { backgroundColor: '#FFFBEB' }]}
                onPress={() => router.navigate('/(tabs)/teacher/queries')}
              >
                <Ionicons name="chatbubbles" size={15} color={AMBER} />
                <Text style={[styles.statChipNum, { color: AMBER }]}>{openQueries}</Text>
                <Text style={[styles.statChipLabel, { color: AMBER }]}>open queries</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ── Open queries card ── */}
        {openQueries > 0 && (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.navigate('/(tabs)/teacher/queries')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="chatbubbles" size={20} color={AMBER} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Parent Queries</Text>
                <Text style={styles.cardSubtitle}>
                  {openQueries} {openQueries === 1 ? 'query needs' : 'queries need'} your response
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
            </View>
          </Pressable>
        )}

        {/* ── Upcoming homework card ── */}
        {upcomingHw.length > 0 && (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.navigate('/(tabs)/teacher/homework')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#EBF2FB' }]}>
                <Ionicons name="book" size={20} color={ACCENT} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Upcoming Homework</Text>
                <Text style={styles.cardSubtitle}>
                  {upcomingHw.length} assignment{upcomingHw.length > 1 ? 's' : ''} due soon
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
            </View>

            <View style={styles.hwList}>
              {upcomingHw.map((hw, idx) => (
                <View key={hw.id} style={[styles.hwItem, idx < upcomingHw.length - 1 && styles.hwItemBorder]}>
                  <View style={styles.hwDot} />
                  <Text style={styles.hwName} numberOfLines={1}>{hw.subject?.name}</Text>
                  <View style={styles.hwDeadline}>
                    <Ionicons name="time-outline" size={11} color={GREEN} />
                    <Text style={styles.hwDeadlineText}>{formatDeadline(hw.deadline)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Pressable>
        )}

        {/* ── Recent announcements ── */}
        {announcements.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Announcements</Text>
              <Pressable onPress={() => router.navigate('/(tabs)/teacher/announce')}>
                <Text style={styles.sectionLink}>View all</Text>
              </Pressable>
            </View>

            {announcements.map(ann => {
              const color = AUDIENCE_COLOR[ann.audience] ?? ACCENT;
              return (
                <View key={ann.id} style={styles.annCard}>
                  <View style={[styles.annStripe, { backgroundColor: color }]} />
                  <View style={styles.annBody}>
                    <View style={styles.annTopRow}>
                      <View style={[styles.annBadge, { backgroundColor: color + '18' }]}>
                        <Text style={[styles.annBadgeText, { color }]}>{ann.audience}</Text>
                      </View>
                      <Text style={styles.annTime}>
                        {ann.published_at ? timeAgo(ann.published_at) : 'Draft'}
                      </Text>
                    </View>
                    <Text style={styles.annTitle} numberOfLines={1}>{ann.title}</Text>
                    <Text style={styles.annBody2} numberOfLines={2}>{ann.body}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty state — nothing to show */}
        {openQueries === 0 && upcomingHw.length === 0 && announcements.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={52} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyBody}>
              No pending queries, upcoming homework, or new announcements.
            </Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F4F8' },
  scrollContent: { padding: 16, gap: 12 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  loadingText: { fontSize: 14, color: '#888888' },
  errorTitle: { fontSize: 16, fontWeight: '600', color: '#444444' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#DC2626', borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

  // Greeting card
  greetingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 0.5,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  greetingText: { fontSize: 18, fontWeight: '700', color: '#111111', marginBottom: 2 },
  schoolText: { fontSize: 13, color: '#888888' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { fontSize: 12, color: '#AAAAAA' },
  sectionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EBF2FB',
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  sectionPillText: { fontSize: 12, fontWeight: '600', color: ACCENT },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 10 },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  statChipNum: { fontSize: 18, fontWeight: '800' },
  statChipLabel: { fontSize: 12, fontWeight: '500' },

  // Generic card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  cardPressed: { opacity: 0.88 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111111', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: '#888888' },

  // Homework list inside card
  hwList: { gap: 0 },
  hwItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
  },
  hwItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  hwDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
  hwName: { flex: 1, fontSize: 13, fontWeight: '500', color: '#333333' },
  hwDeadline: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  hwDeadlineText: { fontSize: 11, color: GREEN, fontWeight: '500' },

  // Section block (announcements)
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111111' },
  sectionLink: { fontSize: 12, color: ACCENT, fontWeight: '600' },

  // Announcement card
  annCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  annStripe: { width: 4 },
  annBody: { flex: 1, padding: 12, gap: 4 },
  annTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  annBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  annBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  annTime: { fontSize: 10, color: '#AAAAAA' },
  annTitle: { fontSize: 13, fontWeight: '600', color: '#111111' },
  annBody2: { fontSize: 12, color: '#666666', lineHeight: 16 },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#444444' },
  emptyBody: { fontSize: 13, color: '#AAAAAA', textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },
});
