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
import type { SectionResponse, TeacherResponse } from '../../types/principal';
import { HeaderBar } from '../shared';

type TeacherWithSections = TeacherResponse & { matchedSections: string[] };

function TeacherRow({ item }: { item: TeacherWithSections }) {
  return (
    <View style={styles.teacherRow}>
      <View style={styles.teacherIcon}>
        <Ionicons name="person-outline" size={18} color={colors.principal} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.teacherName}>{item.name}</Text>
        <Text style={styles.teacherMeta}>
          {item.primary_subject?.name ?? 'No primary subject'}
        </Text>
        <Text style={styles.teacherSections}>
          Sections: {item.matchedSections.join(', ')}
        </Text>
      </View>
    </View>
  );
}

export function ClassTeachersScreen() {
  const { class_id, class_name } = useLocalSearchParams<{
    class_id: string;
    class_name?: string;
  }>();
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!class_id) return;
    setLoading(true);
    setError(false);
    Promise.all([principalApi.getSections({ class_id }), principalApi.getTeachers()])
      .then(([sectionsRes, teachersRes]) => {
        setSections(sectionsRes.results);
        setTeachers(teachersRes.results);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [class_id]);

  const filteredTeachers = useMemo(() => {
    const sectionMap = new Map(sections.map((section) => [section.id, section.name]));
    return teachers
      .map((teacher) => {
        const matchedSections = teacher.assigned_sections
          .filter((assigned) => sectionMap.has(assigned.id))
          .map((assigned) => sectionMap.get(assigned.id) ?? assigned.section_name);
        return { ...teacher, matchedSections };
      })
      .filter((teacher) => teacher.matchedSections.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sections, teachers]);

  const title = class_name ? `${class_name} Teachers` : 'Teachers';

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
          <Text style={styles.errorText}>Failed to load teachers.</Text>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={filteredTeachers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.sectionLabel}>Teachers Assigned To This Class</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No teachers found for this class.</Text>
            </View>
          }
          renderItem={({ item }) => <TeacherRow item={item} />}
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
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
  },
  teacherIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.principal + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherName: { ...(typography.body as object), color: colors.textPrimary, fontWeight: '700' },
  teacherMeta: { ...(typography.caption as object), color: colors.textSecondary, marginTop: 2 },
  teacherSections: { ...(typography.caption as object), color: colors.textMuted, marginTop: 4 },
});
