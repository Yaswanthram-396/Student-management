import React from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { typography } from '../../../constants/typography';
import { HeaderBar, MetricCard, StatusPill } from '../../shared';

const SCREEN_WIDTH = Dimensions.get('window').width;
// card content width: outer padding (16*2) + card padding (12*2)
const HEATMAP_CONTENT_W = SCREEN_WIDTH - spacing.lg * 2 - spacing.md * 2;
const LABEL_W = 48;
const CELL_W = (HEATMAP_CONTENT_W - LABEL_W) / 5;

const HEATMAP_DATA: number[][] = [
  [92, 85, 78, 94, 88],
  [76, 91, 89, 72, 95],
  [88, 64, 92, 81, 77],
  [95, 88, 71, 90, 86],
  [69, 83, 95, 87, 93],
];

const HOME_METRICS = [
  { value: "87%", label: "Today's Attendance" },
  { value: "14",  label: "Homework Posted"    },
  { value: "3",   label: "Pending Results"    },
  { value: "28",  label: "Active Teachers"    },
];

type Announcement = { id: string; title: string; date: string };
const HOME_ANNOUNCEMENTS: Announcement[] = [
  { id: '1', title: 'School Closed on 10 May for Elections', date: '3 May 2026' },
  { id: '2', title: 'Mid-Term Exam Timetable Released',       date: '3 May 2026' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const LEGEND = [
  { color: colors.success, label: '90%+' },
  { color: colors.warning, label: '70–89%' },
  { color: colors.danger,  label: '<70%' },
];

function heatColor(val: number) {
  if (val >= 90) return colors.success;
  if (val >= 70) return colors.warning;
  return colors.danger;
}

export function HomeScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        left={
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>DPS</Text>
          </View>
        }
        center={<Text style={styles.headerTitle}>Delhi Public School</Text>}
        right={
          <View>
            <Ionicons name="notifications-outline" size={22} color={colors.textMuted} />
            <View style={styles.notifDot} />
          </View>
        }
      />

      <FlatList
        data={HOME_ANNOUNCEMENTS}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <View style={styles.annCard}>
            <Text style={styles.annTitle}>{item.title}</Text>
            <Text style={styles.annMeta}>Sent to All · {item.date}</Text>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Date / title */}
            <View style={styles.greeting}>
              <Text style={styles.greetingDate}>Monday, 5 May 2026</Text>
              <Text style={styles.greetingTitle}>School Overview</Text>
            </View>

            {/* 2×2 metrics grid */}
            <View style={styles.metricsGrid}>
              {HOME_METRICS.map((m, i) => (
                <View key={i} style={styles.metricWrapper}>
                  <MetricCard value={m.value} label={m.label} accentColor={colors.principal} />
                </View>
              ))}
            </View>

            {/* Attendance heatmap */}
            <View style={styles.heatmapSection}>
              <Text style={styles.sectionLabel}>Class Attendance This Week</Text>
              <View style={styles.heatmapCard}>
                {/* Day headers */}
                <View style={styles.heatmapHeaderRow}>
                  <View style={{ width: LABEL_W }} />
                  {DAYS.map(d => (
                    <View key={d} style={[styles.heatmapHeaderCell, { width: CELL_W }]}>
                      <Text style={styles.heatmapDayLabel}>{d}</Text>
                    </View>
                  ))}
                </View>
                {/* Rows */}
                {HEATMAP_DATA.map((row, ri) => (
                  <View key={ri} style={styles.heatmapRow}>
                    <Text style={[styles.heatmapRowLabel, { width: LABEL_W }]}>
                      Class {ri + 1}
                    </Text>
                    {row.map((val, ci) => (
                      <View
                        key={ci}
                        style={[
                          styles.heatmapCell,
                          { width: CELL_W - 4, backgroundColor: heatColor(val) },
                        ]}
                      >
                        <Text style={styles.heatmapCellText}>{val}%</Text>
                      </View>
                    ))}
                  </View>
                ))}
                {/* Legend */}
                <View style={styles.heatmapLegend}>
                  {LEGEND.map(l => (
                    <View key={l.label} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                      <Text style={styles.legendLabel}>{l.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Recent Announcements</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.pendingCard}>
            <Text style={styles.pendingText}>3 exam results awaiting your approval</Text>
            <Pressable
              style={styles.reviewBtn}
              onPress={() => navigation.navigate('Results')}
            >
              <Text style={styles.reviewBtnText}>Review Now</Text>
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  logoCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#14B8A6',
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { ...(typography.label as object), color: colors.surface, fontWeight: '700' },
  notifDot: {
    position: 'absolute', top: 0, right: 0,
    width: 7, height: 7, borderRadius: 999,
    backgroundColor: colors.danger,
    borderWidth: 1.5, borderColor: colors.surface,
  },
  listContent: { padding: spacing.lg, gap: spacing.lg },
  listHeader: { gap: spacing.lg },
  // Greeting
  greeting: { gap: spacing.xs },
  greetingDate:  { ...(typography.caption as object), color: colors.textMuted },
  greetingTitle: { ...(typography.h2 as object), fontWeight: '600', color: colors.textPrimary },
  // Metrics grid
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metricWrapper: { width: '48%' },
  // Heatmap
  heatmapSection: { gap: spacing.sm },
  sectionLabel: {
    ...(typography.label as object), color: colors.textMuted,
  },
  heatmapCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, padding: spacing.md,
  },
  heatmapHeaderRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs,
  },
  heatmapHeaderCell: { alignItems: 'center' },
  heatmapDayLabel: { ...(typography.caption as object), color: colors.textMuted },
  heatmapRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs,
  },
  heatmapRowLabel: { ...(typography.caption as object), color: colors.textSecondary },
  heatmapCell: {
    height: 26, marginHorizontal: 2,
    borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  heatmapCellText: { fontSize: 10, fontWeight: '600', color: colors.surface },
  heatmapLegend: {
    flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendLabel: { ...(typography.caption as object), color: colors.textMuted },
  // Announcement card
  annCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, padding: spacing.md, paddingHorizontal: spacing.lg,
  },
  annTitle: { ...(typography.body as object), fontWeight: '500', color: colors.textPrimary },
  annMeta:  { ...(typography.caption as object), color: colors.textMuted, marginTop: spacing.xs },
  // Pending action
  pendingCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderLeftWidth: 3, borderLeftColor: colors.principal,
    borderRadius: 14, padding: spacing.lg,
    marginTop: spacing.sm,
  },
  pendingText: {
    ...(typography.body as object), fontWeight: '500',
    color: colors.textPrimary, marginBottom: spacing.md,
  },
  reviewBtn: {
    height: 48, borderRadius: 10,
    backgroundColor: colors.principal,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.surface },
});
