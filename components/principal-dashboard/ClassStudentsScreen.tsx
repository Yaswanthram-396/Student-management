import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
import type { SectionResponse, StudentProfileSummary } from '../../types/principal';
import { HeaderBar } from '../shared';

type StudentWithSection = StudentProfileSummary & { sectionLabel: string };

function StudentRow({ item }: { item: StudentWithSection }) {
  return (
    <Pressable
      style={styles.studentRow}
      onPress={() =>
        router.push(
          `/(tabs)/principal/student-detail?student_id=${item.id}&student_name=${encodeURIComponent(item.name)}` as any,
        )
      }
    >
      <View style={styles.studentBadge}>
        <Text style={styles.studentBadgeText}>{item.roll_number || '-'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentMeta}>
          Section {item.sectionLabel} · Admission {item.admission_number || '-'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

export function ClassStudentsScreen() {
  const { class_id, class_name } = useLocalSearchParams<{
    class_id: string;
    class_name?: string;
  }>();
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [students, setStudents] = useState<StudentWithSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!class_id) return;
    setLoading(true);
    setError(false);
    principalApi
      .getSections({ class_id })
      .then(async (sectionsRes) => {
        setSections(sectionsRes.results);
        const studentResponses = await Promise.all(
          sectionsRes.results.map((section) =>
            principalApi.getSectionStudents(section.id).then((res) =>
              res.results.map((student) => ({
                ...student,
                sectionLabel: section.name,
              })),
            ),
          ),
        );
        setStudents(
          studentResponses
            .flat()
            .sort((a, b) => {
              const sectionCompare = a.sectionLabel.localeCompare(b.sectionLabel);
              if (sectionCompare !== 0) return sectionCompare;
              const rollA = Number(a.roll_number);
              const rollB = Number(b.roll_number);
              if (!Number.isNaN(rollA) && !Number.isNaN(rollB)) return rollA - rollB;
              return a.name.localeCompare(b.name);
            }),
        );
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [class_id]);

  const title = class_name ? `${class_name} Students` : 'Students';
  const sectionCount = useMemo(() => sections.length, [sections]);

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
            {title}
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
          <Text style={styles.errorText}>Failed to load students.</Text>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.sectionLabel}>
                {students.length} students across {sectionCount} section{sectionCount === 1 ? '' : 's'}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No students found for this class.</Text>
            </View>
          }
          renderItem={({ item }) => <StudentRow item={item} />}
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
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  listHeader: { marginBottom: spacing.md },
  sectionLabel: { ...(typography.label as object), color: colors.textMuted },
  emptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: { ...(typography.body as object), color: colors.textMuted, textAlign: 'center' },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
  },
  studentBadge: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.principal + '18',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  studentBadgeText: {
    ...(typography.caption as object),
    color: colors.principal,
    fontWeight: '700',
  },
  studentName: { ...(typography.body as object), color: colors.textPrimary, fontWeight: '700' },
  studentMeta: { ...(typography.caption as object), color: colors.textMuted, marginTop: 2 },
});
