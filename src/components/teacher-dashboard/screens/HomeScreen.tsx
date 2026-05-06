import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { typography } from '../../../constants/typography';
import { HeaderBar } from '../../shared';

type Activity = { id: string; text: string; time: string };

const HOME_ACTIVITY: Activity[] = [
  { id: '1', text: 'Uploaded Science PDF – Ch 6',         time: '2 hours ago' },
  { id: '2', text: 'Added Math homework',                  time: 'Yesterday'   },
  { id: '3', text: 'Posted announcement to Class 6B',      time: '2 days ago'  },
  { id: '4', text: 'Marked attendance – Morning',          time: '2 days ago'  },
];

const STATS = [
  { value: '4',  label: 'Homework\nthis week' },
  { value: '12', label: 'Materials\nuploaded'  },
  { value: '2',  label: 'Upcoming\nexams'      },
];

export function HomeScreen() {
  const [attendanceMarked, setAttendanceMarked] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        left={
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>SR</Text>
          </View>
        }
        center={<Text style={styles.headerTitle}>Class 6 – Section B</Text>}
        right={
          <View>
            <Ionicons name="notifications-outline" size={22} color={colors.textMuted} />
            <View style={styles.notifDot} />
          </View>
        }
      />

      <FlatList
        data={HOME_ACTIVITY}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
            {!attendanceMarked ? (
              <View style={[styles.attendCard, styles.attendUnmarked]}>
                <Text style={styles.attendTitleWarn}>Attendance not marked yet</Text>
                <Text style={styles.attendSubWarn}>5 May 2026 · Morning Session</Text>
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
            )}

            <View style={styles.statsRow}>
              {STATS.map(({ value, label }) => (
                <View key={label} style={styles.metricCard}>
                  <Text style={styles.metricValue}>{value}</Text>
                  <Text style={styles.metricLabel}>{label}</Text>
                </View>
              ))}
            </View>

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
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.teacher,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...(typography.label as object), color: colors.surface, fontWeight: '700' },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  notifDot: {
    position: 'absolute', top: 0, right: 0,
    width: 7, height: 7, borderRadius: 999,
    backgroundColor: colors.danger,
    borderWidth: 1.5, borderColor: colors.surface,
  },
  // Attendance card
  attendCard: { borderWidth: 0.5, borderColor: colors.border, borderRadius: 14, padding: spacing.lg },
  attendUnmarked: { backgroundColor: colors.warningBg },
  attendMarked:   { backgroundColor: colors.successBg   },
  attendTitleWarn:    { ...(typography.body as object), fontWeight: '600', color: '#92400E', marginBottom: spacing.xs },
  attendSubWarn:      { ...(typography.caption as object), color: colors.warning, marginBottom: spacing.md },
  attendTitleSuccess: { ...(typography.body as object), fontWeight: '600', color: '#0F6E56', marginBottom: spacing.xs },
  attendSubSuccess:   { ...(typography.caption as object), color: colors.textSecondary, marginBottom: spacing.sm },
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
  activityRowLast:  { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  activityDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.teacher, marginTop: 5, flexShrink: 0,
  },
  activityInfo: { flex: 1 },
  activityText: { ...(typography.body as object), color: colors.textPrimary },
  activityTime: { ...(typography.caption as object), color: colors.textMuted, marginTop: spacing.xs },
});
