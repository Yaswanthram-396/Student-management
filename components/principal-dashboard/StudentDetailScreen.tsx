import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { principalApi } from '../../services/principal';
import type { StudentDetailResponse, StudentAttendanceStatus } from '../../types/principal';
import { HeaderBar } from '../shared';

const STATUS_CFG: Record<StudentAttendanceStatus['status'], { bg: string; color: string }> = {
  PRESENT: { bg: colors.successBg, color: colors.success },
  ABSENT: { bg: colors.dangerBg, color: colors.danger },
  PARTIAL: { bg: colors.warningBg, color: colors.warning },
  NOT_MARKED: { bg: colors.border, color: colors.textMuted },
};

export function StudentDetailScreen() {
  const { student_id, date } = useLocalSearchParams<{
    student_id: string;
    date?: string;
  }>();
  const [data, setData] = useState<StudentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const selectedDate = date ?? new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!student_id) return;
    setLoading(true);
    setError(false);
    principalApi
      .getStudentDetail(student_id, { date: selectedDate })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [student_id, selectedDate]);

  const formattedDate = new Date(selectedDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const statusCfg = data ? STATUS_CFG[data.attendance.status] : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        left={
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
        }
        center={
          <Text style={styles.headerTitle} numberOfLines={1}>
            {data?.student.name ?? 'Student Detail'}
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
          <Text style={styles.errorText}>Failed to load student detail.</Text>
        </View>
      )}

      {data && !loading && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.studentCard}>
            <Text style={styles.studentName}>{data.student.name}</Text>
            <Text style={styles.studentMeta}>
              {data.student.academic_class.name} · Section {data.student.section.name}
            </Text>
            <Text style={styles.studentMeta}>
              Roll {data.student.roll_number || '-'} · Admission {data.student.admission_number || '-'}
            </Text>
          </View>

          <View style={styles.attendanceCard}>
            <View style={styles.attendanceTop}>
              <View>
                <Text style={styles.attendanceTitle}>Attendance</Text>
                <Text style={styles.attendanceDate}>{formattedDate}</Text>
              </View>
              {statusCfg && (
                <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                  <Text style={[styles.statusText, { color: statusCfg.color }]}>
                    {data.attendance.status}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.metricRow}>
              <View style={styles.metricCell}>
                <Text style={styles.metricValue}>{data.attendance.present_count}</Text>
                <Text style={styles.metricLabel}>Present</Text>
              </View>
              <View style={styles.metricCell}>
                <Text style={styles.metricValue}>{data.attendance.absent_count}</Text>
                <Text style={styles.metricLabel}>Absent</Text>
              </View>
            </View>

            {data.attendance.records.length > 0 ? (
              <View style={styles.recordsWrap}>
                {data.attendance.records.map((record, index) => (
                  <View key={`${record.slot}-${index}`} style={styles.recordRow}>
                    <Text style={styles.recordSlot}>{record.slot}</Text>
                    <Text style={styles.recordStatus}>{record.status}</Text>
                    <Text style={styles.recordTime}>
                      {new Date(record.confirmed_at).toLocaleTimeString('en-IN', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noRecords}>No confirmed attendance records for this day.</Text>
            )}
          </View>
        </ScrollView>
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
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  studentCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
  },
  studentName: { ...(typography.h3 as object), color: colors.textPrimary, fontWeight: '700' },
  studentMeta: { ...(typography.caption as object), color: colors.textMuted, marginTop: 4 },
  attendanceCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.md,
  },
  attendanceTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  attendanceTitle: { ...(typography.body as object), color: colors.textPrimary, fontWeight: '700' },
  attendanceDate: { ...(typography.caption as object), color: colors.textMuted, marginTop: 2 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: spacing.sm, borderRadius: 999 },
  statusText: { ...(typography.caption as object), fontWeight: '700' },
  metricRow: { flexDirection: 'row', gap: spacing.sm },
  metricCell: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  metricValue: { ...(typography.h3 as object), color: colors.textPrimary, fontWeight: '700' },
  metricLabel: { ...(typography.caption as object), color: colors.textMuted, marginTop: 2 },
  recordsWrap: { gap: spacing.sm },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  recordSlot: { ...(typography.label as object), color: colors.textPrimary, flex: 1 },
  recordStatus: { ...(typography.caption as object), color: colors.textSecondary, flex: 1, textAlign: 'center' },
  recordTime: { ...(typography.caption as object), color: colors.textMuted, flex: 1, textAlign: 'right' },
  noRecords: { ...(typography.body as object), color: colors.textMuted, textAlign: 'center' },
});
