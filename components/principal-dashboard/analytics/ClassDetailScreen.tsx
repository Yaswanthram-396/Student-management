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
import { colors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { typography } from '../../../constants/typography';
import { analyticsApi } from '../../../services/analyticsApi';
import type { ClassAnalyticsDetailResponse } from '../../../types/analytics';
import { HeaderBar } from '../../shared';

function SectionCard({
  examId,
  section,
}: {
  examId: string;
  section: ClassAnalyticsDetailResponse['sections'][number];
}) {
  return (
    <Pressable
      style={styles.sectionCard}
      onPress={() =>
        router.push(
          `/(tabs)/principal/section-detail?exam_id=${examId}&section_id=${section.section_id}` as any,
        )
      }
    >
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Section {section.section_name}</Text>
          <Text style={styles.sectionMeta}>{section.student_count} students</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>

      <View style={styles.subjectList}>
        {section.subjects.map((subject) => (
          <View key={`${section.section_id}-${subject.subject_name}`} style={styles.subjectRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.subjectName}>{subject.subject_name}</Text>
              <Text style={styles.subjectMeta}>
                Median {subject.median_marks.toFixed(1)} · SD {subject.std_dev.toFixed(1)}
              </Text>
            </View>
            <View style={styles.subjectMetricBlock}>
              <Text style={styles.subjectAvg}>{subject.avg_marks.toFixed(1)}</Text>
              <Text style={styles.subjectMeta}>{subject.at_risk_count} at risk</Text>
            </View>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

export function ClassDetailScreen() {
  const { exam_id, class_id } = useLocalSearchParams<{ exam_id: string; class_id: string }>();
  const [data, setData] = useState<ClassAnalyticsDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!exam_id || !class_id) return;
    setLoading(true);
    setError('');
    analyticsApi.getClassDetail(class_id, exam_id)
      .then(setData)
      .catch((err: any) => {
        setData(null);
        setError(err.details ?? 'Failed to load class breakdown.');
      })
      .finally(() => setLoading(false));
  }, [class_id, exam_id]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        left={
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
        }
        center={
          <Text style={styles.headerTitle} numberOfLines={1}>
            {data?.class_name ?? 'Class Breakdown'}
          </Text>
        }
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.principal} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : data ? (
        <FlatList
          data={data.sections}
          keyExtractor={(item) => item.section_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.examLabel}>{data.exam.exam_name}</Text>
              <Text style={styles.helperText}>
                Tap a section to continue into section-level analytics and student drill-down.
              </Text>
            </View>
          }
          renderItem={({ item }) => <SectionCard examId={exam_id!} section={item} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBtn: { padding: 4 },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  errorText: { ...(typography.body as object), color: colors.danger, textAlign: 'center' },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  listHeader: { marginBottom: spacing.md, gap: spacing.xs },
  examLabel: { ...(typography.h3 as object), color: colors.textPrimary },
  helperText: { ...(typography.caption as object), color: colors.textMuted },
  sectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...(typography.body as object), fontWeight: '600', color: colors.textPrimary },
  sectionMeta: { ...(typography.caption as object), color: colors.textMuted, marginTop: 2 },
  subjectList: { gap: spacing.sm },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  subjectName: { ...(typography.body as object), color: colors.textPrimary, fontWeight: '500' },
  subjectMeta: { ...(typography.caption as object), color: colors.textMuted, marginTop: 2 },
  subjectMetricBlock: { alignItems: 'flex-end' },
  subjectAvg: { ...(typography.h3 as object), color: colors.principal },
});
