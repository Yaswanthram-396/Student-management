import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { principalApi } from '../../services/principal';
import type { ClassAttendanceDetailResponse, SectionAttendanceDetail } from '../../types/principal';
import { HeaderBar } from '../shared';

function StatChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionCard({ section }: { section: SectionAttendanceDetail }) {
  const [expanded, setExpanded] = useState(false);

  function pct(n: number) {
    if (n >= 90) return colors.success;
    if (n >= 70) return colors.warning;
    return colors.danger;
  }

  return (
    <View style={styles.sectionCard}>
      <Pressable style={styles.sectionHeader} onPress={() => setExpanded(e => !e)}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionBadge, { backgroundColor: pct(section.attendance_percentage) + '22' }]}>
            <Text style={[styles.sectionBadgeText, { color: pct(section.attendance_percentage) }]}>
              Section {section.section_name}
            </Text>
          </View>
          <Text style={[styles.sectionPct, { color: pct(section.attendance_percentage) }]}>
            {Math.round(section.attendance_percentage)}%
          </Text>
        </View>
        <View style={styles.sectionMiniStats}>
          <Text style={styles.miniStat}>{section.present_count} present</Text>
          <Text style={styles.miniStatDot}>·</Text>
          <Text style={styles.miniStat}>{section.absent_count} absent</Text>
          <Text style={styles.miniStatDot}>·</Text>
          <Text style={styles.miniStat}>{section.total_students} total</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.textMuted}
            style={{ marginLeft: 'auto' }}
          />
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.sectionBody}>
          {section.present_students.length > 0 && (
            <View style={styles.studentGroup}>
              <View style={styles.groupHeader}>
                <View style={[styles.groupDot, { backgroundColor: colors.success }]} />
                <Text style={styles.groupLabel}>Present ({section.present_students.length})</Text>
              </View>
              {section.present_students.map(s => (
                <Text key={s.id} style={styles.studentName}>{s.name}</Text>
              ))}
            </View>
          )}
          {section.absent_students.length > 0 && (
            <View style={[styles.studentGroup, section.present_students.length > 0 && { marginTop: spacing.sm }]}>
              <View style={styles.groupHeader}>
                <View style={[styles.groupDot, { backgroundColor: colors.danger }]} />
                <Text style={styles.groupLabel}>Absent ({section.absent_students.length})</Text>
              </View>
              {section.absent_students.map(s => (
                <Text key={s.id} style={styles.studentName}>{s.name}</Text>
              ))}
            </View>
          )}
          {section.present_students.length === 0 && section.absent_students.length === 0 && (
            <Text style={styles.noData}>No attendance records yet.</Text>
          )}
        </View>
      )}
    </View>
  );
}

export function ClassAttendanceScreen() {
  const { class_id, date } = useLocalSearchParams<{ class_id: string; date?: string }>();
  const [data, setData] = useState<ClassAttendanceDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const displayDate = date ?? new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!class_id) return;
    setLoading(true);
    setError(false);
    principalApi.getAttendanceClassDetail(class_id, { date: displayDate })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [class_id, displayDate]);

  const formattedDate = new Date(displayDate).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        left={
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
        }
        center={
          <Text style={styles.headerTitle}>
            {data ? data.class_name : 'Attendance'}
          </Text>
        }
      />

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.principal} />
        </View>
      )}

      {error && !loading && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load attendance data.</Text>
        </View>
      )}

      {data && !loading && (
        <FlatList
          data={data.sections}
          keyExtractor={item => item.section_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => <SectionCard section={item} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.dateLabel}>{formattedDate}</Text>
              <View style={styles.statsRow}>
                <StatChip label="Total" value={data.total_students} color={colors.textPrimary} />
                <View style={styles.statDivider} />
                <StatChip label="Present" value={data.present_count} color={colors.success} />
                <View style={styles.statDivider} />
                <StatChip label="Absent" value={data.absent_count} color={colors.danger} />
                <View style={styles.statDivider} />
                <StatChip
                  label="Rate"
                  value={`${Math.round(data.attendance_percentage)}%`}
                  color={data.attendance_percentage >= 90 ? colors.success : data.attendance_percentage >= 70 ? colors.warning : colors.danger}
                />
              </View>
              <Text style={styles.sectionListLabel}>Section Breakdown</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backBtn: { padding: 4 },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...(typography.body as object), color: colors.textMuted },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  listHeader: { marginBottom: spacing.md, gap: spacing.md },
  dateLabel: { ...(typography.caption as object), color: colors.textMuted },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, padding: spacing.md,
    alignItems: 'center',
  },
  statChip: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { ...(typography.h3 as object), fontWeight: '700' },
  statLabel: { ...(typography.caption as object), color: colors.textMuted },
  statDivider: { width: 0.5, height: 32, backgroundColor: colors.border },
  sectionListLabel: { ...(typography.label as object), color: colors.textMuted },
  // Section card
  sectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, overflow: 'hidden',
  },
  sectionHeader: { padding: spacing.md, gap: spacing.xs },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionBadge: {
    paddingVertical: 3, paddingHorizontal: spacing.sm,
    borderRadius: 999,
  },
  sectionBadgeText: { ...(typography.label as object), fontWeight: '600' },
  sectionPct: { ...(typography.h3 as object), fontWeight: '700' },
  sectionMiniStats: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  miniStat: { ...(typography.caption as object), color: colors.textSecondary },
  miniStatDot: { ...(typography.caption as object), color: colors.textMuted },
  // Section body
  sectionBody: {
    borderTopWidth: 0.5, borderTopColor: colors.border,
    padding: spacing.md,
  },
  studentGroup: {},
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  groupLabel: { ...(typography.label as object), color: colors.textSecondary, fontWeight: '600' },
  studentName: {
    ...(typography.body as object), color: colors.textPrimary,
    paddingVertical: 3, paddingLeft: spacing.md,
  },
  noData: { ...(typography.caption as object), color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.sm },
});
