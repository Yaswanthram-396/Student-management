import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { useTeacherStore } from '../../store/teacher-store';
import { TeacherTopBar } from './TeacherTopBar';

type Activity = { id: string; text: string; time: string };

const HOME_ACTIVITY: Activity[] = [
  { id: '1', text: 'Uploaded Science PDF – Ch 6', time: '2 hours ago' },
  { id: '2', text: 'Added Math homework', time: 'Yesterday' },
  { id: '3', text: 'Posted announcement to Class 6B', time: '2 days ago' },
  { id: '4', text: 'Marked attendance – Morning', time: '2 days ago' },
];

const STATS = [
  { value: '4', label: 'Homework\nthis week' },
  { value: '12', label: 'Materials\nuploaded' },
  { value: '2', label: 'Upcoming\nexams' },
];

export function HomeScreen() {
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const { selectedSection } = useTeacherStore();

  useEffect(() => {
    setAttendanceMarked(false);
  }, [selectedSection?.id]);

  const sectionTitle = useMemo(() => {
    if (!selectedSection) return 'Section not selected';
    return `${selectedSection.class_name} - Section ${selectedSection.section_name}`;
  }, [selectedSection]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TeacherTopBar />

      {!selectedSection ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Select a section to continue</Text>
          <Text style={styles.emptyBody}>
            Use the dropdown in the header to pick one of your assigned sections.
          </Text>
        </View>
      ) : null}

      <FlatList
        key={selectedSection?.id ?? 'no-section'}
        data={HOME_ACTIVITY}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={null}
        renderItem={({ item, index }) => (
          <View style={[
            styles.activityRow,
            index === 0 && styles.activityRowFirst,
            index === HOME_ACTIVITY.length - 1 && styles.activityRowLast,
          ]}>
            <View style={styles.activityDot} />
            <View style={styles.activityInfo}>
              <Text style={styles.activityText}>{item.text}</Text>
              <Text style={styles.activityTime}>{item.time}</Text>
            </View>
          </View>
        )}
        ListHeaderComponent={
          <View>
            {/* {!attendanceMarked ? (
              <View style={[styles.attendCard, styles.attendUnmarked]}>
                <Text style={styles.attendTitleWarn}>Attendance not marked yet</Text>
                <Text style={styles.attendSubWarn}>{sectionTitle} · Morning Session</Text>
                <Pressable style={styles.markNowBtn} onPress={() => setAttendanceMarked(true)}>
                  <Text style={styles.markNowText}>Mark Attendance Now</Text>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.attendCard, styles.attendMarked]}>
                <Text style={styles.attendTitleSuccess}>Attendance marked</Text>
                <Text style={styles.attendSubSuccess}>32 Present · 3 Absent · 0 Unmarked</Text>
                <Pressable onPress={() => setAttendanceMarked(false)}>
                  <Text style={styles.viewDetails}>View Details →</Text>
                </Pressable>
              </View>
            )} */}

            <View style={styles.statsRow}>
              {STATS.map(({ value, label }) => (
                <View key={label} style={styles.metricCard}>
                  <Text style={styles.metricValue}>{value}</Text>
                  <Text style={styles.metricLabel}>{label}</Text>
                </View>
              ))}
            </View>

            <Pressable style={styles.queriesCard} onPress={() => router.push('/teacher/parent-queries')}>
              <View style={styles.queriesCardContent}>
                <Ionicons name="chatbubbles-outline" size={24} color={colors.teacher} />
                <View style={styles.queriesCardTextWrap}>
                  <Text style={styles.queriesCardTitle}>Parent Queries</Text>
                  <Text style={styles.queriesCardSub}>View and reply to messages from parents</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>

            <Text style={styles.sectionLabel}>Recent Activity</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg, gap: spacing.lg },
  emptyWrap: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...(typography.h3 as object),
    color: colors.textPrimary,
  },
  emptyBody: {
    ...(typography.caption as object),
    color: colors.textSecondary,
  },
  // Attendance card
  attendCard: { borderWidth: 0.5, borderColor: colors.border, borderRadius: 14, padding: spacing.lg },
  attendUnmarked: { backgroundColor: colors.warningBg },
  attendMarked: { backgroundColor: colors.successBg },
  attendTitleWarn: { ...(typography.body as object), fontWeight: '600', color: '#92400E', marginBottom: spacing.xs },
  attendSubWarn: { ...(typography.caption as object), color: colors.warning, marginBottom: spacing.md },
  attendTitleSuccess: { ...(typography.body as object), fontWeight: '600', color: '#0F6E56', marginBottom: spacing.xs },
  attendSubSuccess: { ...(typography.caption as object), color: colors.textSecondary, marginBottom: spacing.sm },
  markNowBtn: {
    height: 48, borderRadius: 10,
    backgroundColor: colors.teacher,
    alignItems: 'center', justifyContent: 'center',
  },
  markNowText: { ...(typography.h3 as object), color: colors.surface, fontWeight: '500' },
  viewDetails: { ...(typography.caption as object), fontWeight: '500', color: colors.teacher },
  // Stats
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  metricCard: {
    flex: 1, backgroundColor: colors.background,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 10, paddingVertical: 14, paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  metricValue: { fontSize: 28, fontWeight: '600', color: colors.teacher, lineHeight: 34 },
  metricLabel: { ...(typography.caption as object), color: colors.textMuted },
  queriesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
    marginVertical: spacing.lg,
  },
  queriesCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  queriesCardTextWrap: {
    gap: 2,
  },
  queriesCardTitle: {
    ...(typography.body as object),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  queriesCardSub: {
    ...(typography.caption as object),
    color: colors.textSecondary,
  },
  sectionLabel: { ...(typography.label as object), color: colors.textMuted },
  // Activity rows forming a card via borders
  activityRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderLeftWidth: 0.5, borderRightWidth: 0.5,
    borderBottomWidth: 0.5, borderColor: colors.border,
  },
  activityRowFirst: { borderTopWidth: 0.5, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  activityRowLast: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  activityDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.teacher, marginTop: 5, flexShrink: 0,
  },
  activityInfo: { flex: 1 },
  activityText: { ...(typography.body as object), color: colors.textPrimary },
  activityTime: { ...(typography.caption as object), color: colors.textMuted, marginTop: spacing.xs },
});
