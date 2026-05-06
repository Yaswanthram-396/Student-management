import React, { useState } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput,
  ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { typography } from '../../../constants/typography';
import { HeaderBar, StatusPill, BottomSheet } from '../../shared';

type TabKey = 'week' | 'prev';

interface HWItem {
  id: string;
  subject: string; subjectBg: string; subjectText: string;
  statusVariant: 'warning' | 'info' | 'success';
  statusLabel: string;
  desc: string; due: string;
}

const THIS_WEEK_HW: HWItem[] = [
  { id: '1', subject: 'Math', subjectBg: '#DBEAFE', subjectText: colors.teacher, statusVariant: 'warning', statusLabel: 'Pending', desc: 'Complete Exercise 5.3 from NCERT textbook, Page 102', due: '6 May 2026' },
  { id: '2', subject: 'Science', subjectBg: colors.successBg, subjectText: '#0F6E56', statusVariant: 'info', statusLabel: 'Posted', desc: 'Draw and label the diagram of human digestive system', due: '7 May 2026' },
  { id: '3', subject: 'English', subjectBg: '#F3E8FF', subjectText: '#7C3AED', statusVariant: 'info', statusLabel: 'Posted', desc: 'Write a short paragraph on My Best Friend (150 words)', due: '8 May 2026' },
];

const PREV_HW: HWItem[] = [
  { id: '4', subject: 'Hindi', subjectBg: colors.warningBg, subjectText: '#92400E', statusVariant: 'success', statusLabel: 'Completed', desc: 'Learn the poem on Page 45 by heart', due: '28 Apr 2026' },
  { id: '5', subject: 'Math', subjectBg: '#DBEAFE', subjectText: colors.teacher, statusVariant: 'success', statusLabel: 'Completed', desc: 'Solve all problems from Exercise 4.1', due: '25 Apr 2026' },
];

const HW_SUBJECTS = ['Math', 'Science', 'English', 'Hindi', 'Social Studies'];

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
        <StatusPill variant={item.statusVariant} label={item.statusLabel} />
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
  const [tab, setTab] = useState<TabKey>('week');
  const [showSheet, setShowSheet] = useState(false);
  const [subject, setSubject] = useState('Math');
  const [desc, setDesc] = useState('');
  const [posted, setPosted] = useState(false);

  const data = tab === 'week' ? THIS_WEEK_HW : PREV_HW;

  function handlePost() {
    setPosted(true);
    setTimeout(() => {
      setPosted(false);
      setShowSheet(false);
      setDesc('');
    }, 1000);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        center={<Text style={styles.headerTitle}>Homework</Text>}
        right={
          <Pressable onPress={() => setShowSheet(true)}>
            <Ionicons name="add-circle-outline" size={24} color={colors.teacher} />
          </Pressable>
        }
      />

      {/* Underline tab bar */}
      <View style={styles.tabBar}>
        {([{ key: 'week', label: 'This Week' }, { key: 'prev', label: 'Previous' }] as const).map(
          ({ key, label }) => (
            <Pressable
              key={key}
              style={[styles.tab, tab === key && styles.tabActive]}
              onPress={() => setTab(key)}
            >
              <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>
                {label}
              </Text>
            </Pressable>
          )
        )}
      </View>

      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <HWCard item={item} />}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        showsVerticalScrollIndicator={false}
      />

      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)}>
        <Text style={styles.sheetTitle}>Add Homework</Text>

        <Text style={styles.fieldLabel}>Subject</Text>
        {/* <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectScroll}>
          {HW_SUBJECTS.map(s => (
            <Pressable
              key={s}
              style={[styles.subjectOption, subject === s && styles.subjectOptionActive]}
              onPress={() => setSubject(s)}
            >
              <Text style={[styles.subjectOptionText, subject === s && styles.subjectOptionTextActive]}>
                {s}
              </Text>
            </Pressable>
          ))}
        </ScrollView> */}

        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={styles.descInput}
          value={desc}
          onChangeText={setDesc}
          placeholder="Describe the homework..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.fieldLabel}>Deadline</Text>
        <View style={styles.staticField}>
          <Text style={styles.staticFieldText}>6 May 2026</Text>
        </View>

        <View style={styles.sheetBtns}>
          <Pressable style={styles.cancelBtn} onPress={() => setShowSheet(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.postBtn, posted && styles.postBtnPosted]}
            onPress={handlePost}
          >
            <Text style={styles.postBtnText}>{posted ? 'Posted!' : 'Post Homework'}</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  tab: {
    flex: 1, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.teacher },
  tabLabel: { ...(typography.body as object), fontWeight: '500', color: colors.textMuted },
  tabLabelActive: { color: colors.textPrimary },
  // List
  listContent: { padding: spacing.lg },
  // HW card
  hwCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, padding: spacing.lg,
  },
  hwCardTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.sm,
  },
  subjectPill: {
    borderRadius: 999, paddingVertical: spacing.xs, paddingHorizontal: spacing.md,
  },
  subjectLabel: { ...(typography.label as object) },
  hwDesc: {
    ...(typography.body as object), color: colors.textSecondary,
    lineHeight: 22, marginBottom: spacing.sm,
  },
  hwDueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hwDue: { ...(typography.caption as object), color: colors.textMuted },
  // Sheet
  sheetTitle: { ...(typography.h3 as object), fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.md },
  fieldLabel: {
    ...(typography.caption as object), fontWeight: '500',
    color: colors.textSecondary, marginBottom: spacing.xs,
  },
  subjectScroll: { marginBottom: spacing.md },
  subjectOption: {
    paddingVertical: spacing.xs + 1, paddingHorizontal: 14,
    borderRadius: 999, backgroundColor: colors.background,
    marginRight: spacing.xs, borderWidth: 0.5, borderColor: colors.border,
  },
  subjectOptionActive: { backgroundColor: colors.teacher, borderColor: colors.teacher },
  subjectOptionText: { ...(typography.caption as object), fontWeight: '500', color: colors.textSecondary },
  subjectOptionTextActive: { color: colors.surface },
  descInput: {
    backgroundColor: '#F5F5F5', borderRadius: 10,
    padding: spacing.md, ...(typography.body as object),
    color: colors.textPrimary, height: 100,
    marginBottom: spacing.md,
  },
  staticField: {
    backgroundColor: '#F5F5F5', borderRadius: 10,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  staticFieldText: { ...(typography.body as object), color: colors.textMuted },
  sheetBtns: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.textSecondary },
  postBtn: {
    flex: 1, height: 48, borderRadius: 10,
    backgroundColor: colors.teacher,
    alignItems: 'center', justifyContent: 'center',
  },
  postBtnPosted: { backgroundColor: colors.success },
  postBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.surface },
});
