import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { HeaderBar, BottomSheet, StatusPill } from '../shared';
import {
  teacherApi,
  type HomeworkItem,
  type Section,
  type SubjectItem,
} from '../../services/teacher';

const COLOR_PALETTE = [
  { bg: '#DBEAFE', text: '#1D4ED8' },
  { bg: '#D1FAE5', text: '#065F46' },
  { bg: '#F3E8FF', text: '#7C3AED' },
  { bg: '#FEF3C7', text: '#92400E' },
  { bg: '#FCE7F3', text: '#9D174D' },
  { bg: '#E0F2FE', text: '#0369A1' },
];

function subjectColor(id: string) {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COLOR_PALETTE[hash % COLOR_PALETTE.length];
}

function formatDeadline(iso: string | null): string {
  if (!iso) return 'No deadline';
  try {
    const d = new Date(iso.split('T')[0]);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const DEADLINE_OPTS = [
  { label: 'Tomorrow', days: 1 },
  { label: '+3 Days', days: 3 },
  { label: '+7 Days', days: 7 },
  { label: '+14 Days', days: 14 },
];

function HWCard({ item }: { item: HomeworkItem }) {
  const clr = subjectColor(item.subject.id);
  const isOverdue = item.deadline ? new Date(item.deadline) < new Date() : false;

  return (
    <View style={st.hwCard}>
      <View style={st.hwTop}>
        <View style={[st.subjectPill, { backgroundColor: clr.bg }]}>
          <Text style={[st.subjectPillText, { color: clr.text }]}>
            {item.subject.name}
          </Text>
        </View>
        <StatusPill
          variant={isOverdue ? 'warning' : 'info'}
          label={isOverdue ? 'Overdue' : 'Active'}
        />
      </View>
      <Text style={st.hwDesc}>{item.description}</Text>
      {item.deadline && (
        <View style={st.dueRow}>
          <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
          <Text style={st.hwDue}>Due: {formatDeadline(item.deadline)}</Text>
        </View>
      )}
    </View>
  );
}

export function HomeworkScreen() {
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);

  const [formSectionId, setFormSectionId] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [desc, setDesc] = useState('');
  const [deadlineDays, setDeadlineDays] = useState(7);
  const [posting, setPosting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [hwRes, sectRes, subRes] = await Promise.all([
        teacherApi.getHomework(),
        teacherApi.getSections(),
        teacherApi.getSubjects(),
      ]);
      setHomework(hwRes.results);
      setSections(sectRes.results);
      const active = subRes.results.filter((s) => s.is_active);
      setSubjects(active);
      if (sectRes.results.length > 0) setFormSectionId(sectRes.results[0].id);
      if (active.length > 0) setFormSubjectId(active[0].id);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handlePost() {
    if (!formSectionId || !formSubjectId || !desc.trim()) {
      Alert.alert('Validation', 'Please fill in all fields.');
      return;
    }
    setPosting(true);
    try {
      const res = await teacherApi.createHomework({
        section_id: formSectionId,
        subject_id: formSubjectId,
        description: desc.trim(),
        deadline: addDays(deadlineDays),
      });
      setHomework((prev) => [res, ...prev]);
      setShowSheet(false);
      setDesc('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to post homework.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <HeaderBar
        center={<Text style={st.headerTitle}>Homework</Text>}
        right={
          <Pressable onPress={() => setShowSheet(true)}>
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={colors.teacher}
            />
          </Pressable>
        }
      />

      {loading ? (
        <View style={st.centered}>
          <ActivityIndicator size="large" color={colors.teacher} />
        </View>
      ) : homework.length === 0 ? (
        <View style={st.centered}>
          <Ionicons name="book-outline" size={52} color={colors.textMuted} />
          <Text style={st.emptyTitle}>No Homework Yet</Text>
          <Text style={st.emptyBody}>
            Tap + to assign homework to your students.
          </Text>
        </View>
      ) : (
        <FlatList
          data={homework}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <HWCard item={item} />}
          contentContainerStyle={st.listContent}
          ItemSeparatorComponent={() => (
            <View style={{ height: spacing.sm }} />
          )}
          showsVerticalScrollIndicator={false}
          onRefresh={loadData}
          refreshing={loading}
        />
      )}

      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={st.sheetTitle}>Add Homework</Text>

          {sections.length > 0 && (
            <>
              <Text style={st.fieldLabel}>Section</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={st.hScroll}
                contentContainerStyle={st.hScrollContent}
              >
                {sections.map((sec) => (
                  <Pressable
                    key={sec.id}
                    style={[st.chip, formSectionId === sec.id && st.chipOn]}
                    onPress={() => setFormSectionId(sec.id)}
                  >
                    <Text
                      style={[
                        st.chipText,
                        formSectionId === sec.id && st.chipTextOn,
                      ]}
                    >
                      {sec.class_name} {sec.section_name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          <Text style={st.fieldLabel}>Subject</Text>
          <View style={st.wrapRow}>
            {subjects.map((sub) => (
              <Pressable
                key={sub.id}
                style={[st.chip, formSubjectId === sub.id && st.chipOn]}
                onPress={() => setFormSubjectId(sub.id)}
              >
                <Text
                  style={[
                    st.chipText,
                    formSubjectId === sub.id && st.chipTextOn,
                  ]}
                >
                  {sub.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={st.fieldLabel}>Description</Text>
          <TextInput
            style={st.descInput}
            value={desc}
            onChangeText={setDesc}
            placeholder="Describe the homework task…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={st.fieldLabel}>Deadline</Text>
          <View style={st.deadlineRow}>
            {DEADLINE_OPTS.map((opt) => (
              <Pressable
                key={opt.days}
                style={[st.chip, deadlineDays === opt.days && st.chipOn]}
                onPress={() => setDeadlineDays(opt.days)}
              >
                <Text
                  style={[
                    st.chipText,
                    deadlineDays === opt.days && st.chipTextOn,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={st.deadlinePreview}>
            <Ionicons name="calendar-outline" size={13} color={colors.teacher} />
            <Text style={st.deadlinePreviewText}>
              {formatDeadline(addDays(deadlineDays))}
            </Text>
          </View>

          <View style={st.sheetBtns}>
            <Pressable
              style={st.cancelBtn}
              onPress={() => setShowSheet(false)}
            >
              <Text style={st.cancelTxt}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[st.postBtn, posting && st.postBtnBusy]}
              onPress={handlePost}
              disabled={posting}
            >
              {posting ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Text style={st.postTxt}>Post Homework</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
  },
  emptyTitle: { ...(typography.h2 as object), color: colors.textPrimary },
  emptyBody: {
    ...(typography.body as object),
    color: colors.textMuted,
    textAlign: 'center',
  },
  listContent: { padding: spacing.lg },

  hwCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
  },
  hwTop: {
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
  subjectPillText: { ...(typography.label as object) },
  hwDesc: {
    ...(typography.body as object),
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hwDue: { ...(typography.caption as object), color: colors.textMuted },

  sheetTitle: {
    ...(typography.h3 as object),
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...(typography.caption as object),
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  hScroll: { marginBottom: spacing.md },
  hScrollContent: { gap: spacing.xs, paddingRight: spacing.md },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  deadlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  chip: {
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipOn: { backgroundColor: colors.teacher, borderColor: colors.teacher },
  chipText: {
    ...(typography.caption as object),
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextOn: { color: colors.surface },
  deadlinePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    paddingVertical: spacing.xs,
  },
  deadlinePreviewText: {
    ...(typography.body as object),
    color: colors.teacher,
    fontWeight: '500',
  },
  descInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: spacing.md,
    ...(typography.body as object),
    color: colors.textPrimary,
    height: 100,
    marginBottom: spacing.md,
    textAlignVertical: 'top',
  },
  sheetBtns: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelTxt: {
    ...(typography.h3 as object),
    fontWeight: '500',
    color: colors.textSecondary,
  },
  postBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.teacher,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnBusy: { backgroundColor: colors.success },
  postTxt: {
    ...(typography.h3 as object),
    fontWeight: '500',
    color: colors.surface,
  },
});
