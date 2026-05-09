import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList, Pressable,
  ScrollView, StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { teacherApi } from '../../services/teacher';
import { useTeacherStore } from '../../store/teacher-store';
import { GetHomeworkParams } from '../../types/teacher';
import { BottomSheet, StatusPill } from '../shared';
import { TeacherTopBar } from './TeacherTopBar';

type TabKey = 'week' | 'prev';

interface HWItem {
  id: string;
  subject: string; subjectBg: string; subjectText: string;
  statusVariant: 'warning' | 'info' | 'success';
  statusLabel: string;
  desc: string; due: string;
}

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
  const { selectedSection } = useTeacherStore();
  const [tab, setTab] = useState<TabKey>('week');
  const [showSheet, setShowSheet] = useState(false);

  const [subjects, setSubjects] = useState<Array<{ id: string, name: string }>>([]);
  const [subjectId, setSubjectId] = useState('');

  const [desc, setDesc] = useState('');
  const [posted, setPosted] = useState(false);

  const [homeworkItems, setHomeworkItems] = useState<HWItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deadline, setDeadline] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchHomework = useCallback(async () => {
    if (!selectedSection?.id) return;
    setLoading(true);
    try {
      const now = new Date();
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(now.setDate(diffToMonday));
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const params: GetHomeworkParams = { section_id: selectedSection.id };
      if (tab === 'week') {
        params.deadline_from = startOfWeek.toISOString();
        params.deadline_to = endOfWeek.toISOString();
      } else {
        params.deadline_to = startOfWeek.toISOString();
      }

      const res = await teacherApi.getHomework(params);

      const mapped: HWItem[] = (res.results || []).map(hw => ({
        id: hw.id,
        subject: hw.subject?.name || 'Unknown',
        subjectBg: '#DBEAFE',
        subjectText: colors.teacher,
        statusVariant: 'info',
        statusLabel: 'Posted',
        desc: hw.description,
        due: new Date(hw.deadline).toLocaleDateString(),
      }));
      setHomeworkItems(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedSection?.id, tab]);

  useEffect(() => {
    async function loadSubjects() {
      try {
        const res = await teacherApi.getSubjects();
        setSubjects(res.results || []);
        console.log("Subjects: ", res.results);
        if (res.results && res.results.length > 0) {
          setSubjectId(res.results[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    void loadSubjects();
  }, []);

  useEffect(() => {
    setTab('week');
    setShowSheet(false);
    setDesc('');
    setPosted(false);
    if (subjects.length > 0) {
      setSubjectId(subjects[0].id);
    }
  }, [selectedSection?.id, subjects]);

  useEffect(() => {
    void fetchHomework();
  }, [fetchHomework]);

  async function handlePost() {
    if (!selectedSection?.id || !subjectId) return;
    setPosted(true);
    console.log(deadline.toISOString())
    try {
      await teacherApi.createHomework({
        section_id: selectedSection.id,
        subject_id: subjectId,
        description: desc,
        deadline: deadline.toISOString(),
      });


      setShowSheet(false);
      setDesc('');
      setDeadline(new Date());
      void fetchHomework();
    } catch (err) {
      console.error(err);
    } finally {
      setPosted(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TeacherTopBar />

      {!selectedSection ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Select a section first</Text>
          <Text style={styles.emptySub}>
            Use the header dropdown to switch class/section.
          </Text>
        </View>
      ) : (
        <>

          <View style={styles.actionRow}>
            <Text style={styles.headerTitle}>Homework</Text>
            <Pressable onPress={() => setShowSheet(true)}>
              <Ionicons name="add-circle-outline" size={24} color={colors.teacher} />
            </Pressable>
          </View>

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

          {loading ? (
            <ActivityIndicator size="large" color={colors.teacher} style={{ marginTop: spacing.xl }} />
          ) : (
            <FlatList
              data={homeworkItems}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <HWCard item={item} />}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyTitle}>No homework found</Text>
                  <Text style={styles.emptySub}>
                    {tab === 'week' ? "No homework assigned for this week yet." : "No previous homework found."}
                  </Text>
                </View>
              )}
            />
          )}

          <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)}>
            <Text style={styles.sheetTitle}>Add Homework</Text>

            <Text style={styles.fieldLabel}>Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectScroll}>
              {subjects.map(s => (
                <Pressable
                  key={s.id}
                  style={[styles.subjectOption, subjectId === s.id && styles.subjectOptionActive]}
                  onPress={() => setSubjectId(s.id)}
                >
                  <Text style={[styles.subjectOptionText, subjectId === s.id && styles.subjectOptionTextActive]}>
                    {s.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

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
            <Pressable style={styles.staticField} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.staticFieldText}>{deadline.toLocaleDateString()}</Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={deadline}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDeadline(selectedDate);
                }}
              />
            )}

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
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  emptyWrap: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  emptyTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  emptySub: { ...(typography.caption as object), color: colors.textSecondary },
  actionRow: {
    height: 52,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
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
