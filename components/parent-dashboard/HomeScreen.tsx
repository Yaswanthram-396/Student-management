import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { HeaderBar, StatusPill } from '../shared';
import { parentApi } from '../../services/parent';
import type { ParentStudent, ParentAnnouncement } from '../../types/parent';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2;

type Child = { id: string; name: string; cls: string; present: boolean };
type Update = { id: string; color: string; title: string; sub: string; time: string };

const AUTHOR_COLORS: Record<string, string> = {
  PRINCIPAL: colors.principal,
  TEACHER: colors.teacher,
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatPublishedAt(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH} hour${diffH > 1 ? 's' : ''} ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function ChildCard({ item }: { item: Child }) {
  return (
    <View style={[styles.childCard, { width: CARD_WIDTH }]}>
      <View style={styles.childRow}>
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{item.name}</Text>
          <Text style={styles.childCls}>{item.cls}</Text>
        </View>
        <StatusPill
          variant={item.present ? 'success' : 'danger'}
          label={item.present ? 'Present Today' : 'Absent Today'}
        />
      </View>
    </View>
  );
}

function FeedCard({ item }: { item: Update }) {
  return (
    <View style={styles.feedCard}>
      <View style={[styles.feedAccent, { backgroundColor: item.color }]} />
      <View style={styles.feedBody}>
        <Text style={styles.feedTitle}>{item.title}</Text>
        <Text style={styles.feedSub}>{item.sub}</Text>
        <Text style={styles.feedTime}>{item.time}</Text>
      </View>
    </View>
  );
}

export function HomeScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [parentName, setParentName] = useState('');
  const [schoolInitials, setSchoolInitials] = useState('');
  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [announcements, setAnnouncements] = useState<ParentAnnouncement[]>([]);

  useEffect(() => {
    parentApi.getProfile().then(profile => {
      setParentName(profile.name.split(' ')[0]);
      setSchoolInitials(
        profile.school.name
          .split(' ')
          .slice(0, 3)
          .map(w => w[0])
          .join('')
          .toUpperCase(),
      );
      setStudents(profile.students);

      const today = new Date().toISOString().split('T')[0];
      profile.students.forEach(student => {
        parentApi
          .getAttendance(student.id, { date_from: today, date_to: today })
          .then(att => {
            const isPresent = att.results.some(r => r.status === 'PRESENT');
            setAttendanceMap(prev => ({ ...prev, [student.id]: isPresent }));
          })
          .catch(() => {});
      });

      if (profile.students.length > 0) {
        parentApi
          .getAnnouncements(profile.students[0].id)
          .then(data => setAnnouncements(data.results))
          .catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0);
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const childrenData: Child[] = students.map(s => ({
    id: s.id,
    name: s.name,
    cls: `${s.academic_class.name} – Section ${s.section.name}`,
    present: attendanceMap[s.id] ?? false,
  }));

  const feedItems: Update[] = announcements.map(a => ({
    id: a.id,
    color: AUTHOR_COLORS[a.author_role] ?? colors.parent,
    title: a.title,
    sub: a.body,
    time: formatPublishedAt(a.published_at),
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        left={
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>{schoolInitials || '···'}</Text>
          </View>
        }
        center={
          <Text style={styles.greeting} numberOfLines={1}>
            {getGreeting()}{parentName ? `, ${parentName}` : ''}
          </Text>
        }
        right={
          <View style={styles.headerRight}>
            <Pressable onPress={() => router.push('/(tabs)/parent/calendar')}>
              <Ionicons name="calendar-outline" size={22} color={colors.parent} />
            </Pressable>
            <View>
              <Ionicons name="notifications-outline" size={22} color={colors.textMuted} />
              {announcements.length > 0 && <View style={styles.notifDot} />}
            </View>
          </View>
        }
      />

      <FlatList
        data={feedItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.feedWrapper}>
            <FeedCard item={item} />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {childrenData.length > 0 && (
              <>
                <FlatList
                  data={childrenData}
                  keyExtractor={(c) => c.id}
                  renderItem={({ item }) => <ChildCard item={item} />}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onViewableItemsChanged={onViewableItemsChanged}
                  viewabilityConfig={viewabilityConfig}
                />
                {childrenData.length > 1 && (
                  <View style={styles.dots}>
                    {childrenData.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          {
                            width: i === activeIndex ? 20 : 6,
                            backgroundColor: i === activeIndex ? colors.parent : colors.border,
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
            {feedItems.length > 0 && (
              <Text style={styles.sectionLabel}>Announcements</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No announcements yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  listContent: { paddingBottom: spacing.lg },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.parent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    ...(typography.label as object),
    color: colors.surface,
    fontWeight: '700',
    fontSize: 9,
  },
  greeting: { ...(typography.h3 as object), color: colors.textPrimary },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  notifDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  childCard: {
    backgroundColor: colors.successBg,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  childInfo: { flex: 1, marginRight: spacing.sm },
  childName: { ...(typography.h2 as object), color: colors.textPrimary },
  childCls: {
    ...(typography.caption as object),
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  dot: { height: 6, borderRadius: 999 },
  sectionLabel: {
    ...(typography.label as object),
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  feedWrapper: { paddingHorizontal: spacing.lg },
  feedCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  feedAccent: { width: 3 },
  feedBody: { flex: 1, padding: spacing.md, paddingLeft: spacing.lg },
  feedTitle: {
    ...(typography.body as object),
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  feedSub: {
    ...(typography.caption as object),
    color: colors.textSecondary,
    lineHeight: 18,
  },
  feedTime: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  emptyWrap: {
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...(typography.body as object),
    color: colors.textMuted,
  },
});
