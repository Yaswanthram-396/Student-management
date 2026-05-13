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
import type { SectionDetailResponse, SectionSubjectDetail } from '../../../types/analytics';
import { HeaderBar } from '../../shared';

// ── Subject row ───────────────────────────────────────────────────────────────

function SubjectRow({
  item,
  examId,
  sectionId,
}: {
  item: SectionSubjectDetail;
  examId: string;
  sectionId: string;
}) {
  const deltaColor = item.delta > 0 ? colors.success : item.delta < 0 ? colors.danger : colors.textMuted;
  const deltaPrefix = item.delta > 0 ? '+' : '';

  return (
    <Pressable
      style={styles.subjectRow}
      onPress={() =>
        router.push(
          `/(tabs)/principal/question-heatmap?exam_id=${examId}&section_id=${sectionId}&subject_id=${item.subject_id}` as any,
        )
      }
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.subjectName}>{item.subject_name}</Text>
        <View style={styles.avgsRow}>
          <Text style={styles.avgLabel}>Section avg: </Text>
          <Text style={styles.sectionAvg}>{item.section_avg.toFixed(1)}</Text>
          <Text style={styles.avgLabel}>  ·  Class avg: </Text>
          <Text style={styles.classAvg}>{item.class_avg.toFixed(1)}</Text>
        </View>
      </View>

      <View style={styles.deltaContainer}>
        <Text style={[styles.deltaText, { color: deltaColor }]}>
          {deltaPrefix}{item.delta.toFixed(1)}
        </Text>
        <Ionicons
          name={item.delta >= 0 ? 'trending-up' : 'trending-down'}
          size={14}
          color={deltaColor}
        />
      </View>

      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginLeft: spacing.xs }} />
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function SectionDetailScreen() {
  const { exam_id, section_id } = useLocalSearchParams<{ exam_id: string; section_id: string }>();
  const [data, setData]         = useState<SectionDetailResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    if (!exam_id || !section_id) return;
    setLoading(true);
    setError(false);
    analyticsApi.getSectionDetail(exam_id, section_id)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [exam_id, section_id]);

  const title = data
    ? `Section ${data.section.name} — ${data.exam.exam_name}`
    : 'Section Detail';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        left={
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
        }
        center={<Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>}
        right={
          exam_id && section_id ? (
            <Pressable
              onPress={() =>
                router.push(
                  `/(tabs)/principal/section-students?exam_id=${exam_id}&section_id=${section_id}` as any,
                )
              }
            >
              <Ionicons name="people-outline" size={22} color={colors.principal} />
            </Pressable>
          ) : undefined
        }
      />

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.principal} />
        </View>
      )}

      {error && !loading && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load section detail.</Text>
        </View>
      )}

      {data && !loading && (
        <FlatList
          data={data.subjects}
          keyExtractor={item => item.subject_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.hintText}>
                Delta = section avg − class avg. Tap a subject to see question heatmap.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <SubjectRow item={item} examId={exam_id!} sectionId={section_id!} />
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.errorText}>No subjects found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  backBtn:     { padding: 4 },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:   { ...(typography.body as object), color: colors.textMuted },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  listHeader:  { marginBottom: spacing.md },
  hintText:    { ...(typography.caption as object), color: colors.textMuted },
  separator:   { height: 0.5, backgroundColor: colors.border, marginHorizontal: spacing.lg },

  subjectRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, marginBottom: spacing.sm,
  },
  subjectName:    { ...(typography.body as object), fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  avgsRow:        { flexDirection: 'row', alignItems: 'center' },
  avgLabel:       { ...(typography.caption as object), color: colors.textMuted },
  sectionAvg:     { ...(typography.caption as object), fontWeight: '600', color: colors.principal },
  classAvg:       { ...(typography.caption as object), fontWeight: '600', color: colors.textSecondary },
  deltaContainer: { alignItems: 'flex-end', gap: 2 },
  deltaText:      { ...(typography.label as object), fontWeight: '700' },
});
