import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { HeaderBar, StatusPill } from '../shared';

type FilterKey = 'All' | 'Today' | 'This Week' | 'Overdue';
const FILTERS: FilterKey[] = ['All', 'Today', 'This Week', 'Overdue'];

type HWItem = {
  id: string;
  subject: string;
  subjectBg: string;
  subjectText: string;
  desc: string;
  due: string;
  status: 'Pending' | 'Submitted';
};

const HOMEWORKS: HWItem[] = [
  {
    id: '1',
    subject: 'Math',
    subjectBg: '#DBEAFE',
    subjectText: colors.teacher,
    desc: 'Complete Exercise 5.3 from NCERT',
    due: '6 May 2026',
    status: 'Pending',
  },
  {
    id: '2',
    subject: 'Science',
    subjectBg: colors.successBg,
    subjectText: colors.success,
    desc: 'Draw the diagram of human digestive system',
    due: '5 May 2026',
    status: 'Submitted',
  },
  {
    id: '3',
    subject: 'English',
    subjectBg: '#F3E8FF',
    subjectText: '#7C3AED',
    desc: 'Write a paragraph on My Best Friend (150 words)',
    due: '7 May 2026',
    status: 'Pending',
  },
  {
    id: '4',
    subject: 'Hindi',
    subjectBg: '#FEF9C3',
    subjectText: '#A16207',
    desc: 'Learn poem on Page 45 by heart',
    due: '8 May 2026',
    status: 'Pending',
  },
];

function SubjectPill({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <View style={[styles.subjectPill, { backgroundColor: bg }]}>
      <Text style={[styles.subjectLabel, { color: text }]}>{label}</Text>
    </View>
  );
}

function HWCard({ item }: { item: HWItem }) {
  return (
    <View style={styles.hwCard}>
      <View style={styles.hwCardTop}>
        <SubjectPill label={item.subject} bg={item.subjectBg} text={item.subjectText} />
        <StatusPill
          variant={item.status === 'Submitted' ? 'success' : 'warning'}
          label={item.status}
        />
      </View>
      <Text style={styles.hwDesc}>{item.desc}</Text>
      <View style={styles.hwDueRow}>
        <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
        <Text style={styles.hwDue}>Due: {item.due}</Text>
      </View>
    </View>
  );
}

export function HomeworkScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('All');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar center={<Text style={styles.headerTitle}>Homework</Text>} />

      <View style={styles.filterBar}>
        <FlatList
          data={FILTERS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.filterPill, activeFilter === item && styles.filterPillActive]}
              onPress={() => setActiveFilter(item)}
            >
              <Text
                style={[styles.filterLabel, activeFilter === item && styles.filterLabelActive]}
              >
                {item}
              </Text>
            </Pressable>
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
        />
      </View>

      <FlatList
        data={HOMEWORKS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HWCard item={item} />}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  filterBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  filterList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterPill: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.background,
  },
  filterPillActive: { backgroundColor: colors.parent },
  filterLabel: {
    ...(typography.caption as object),
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterLabelActive: { color: colors.surface },
  listContent: { padding: spacing.lg },
  hwCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
  },
  hwCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  subjectPill: {
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  subjectLabel: { ...(typography.label as object) },
  hwDesc: {
    ...(typography.body as object),
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  hwDueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  hwDue: { ...(typography.caption as object), color: colors.textMuted },
});
