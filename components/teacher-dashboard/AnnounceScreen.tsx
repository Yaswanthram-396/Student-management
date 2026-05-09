import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  FlatList, Pressable,
  StyleSheet,
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
import { BottomSheet } from '../shared';
import { TeacherTopBar } from './TeacherTopBar';

interface AnnItem {
  id: string;
  barColor: string;
  title: string; body: string;
  audience: string; audienceBg: string; audienceText: string;
  date: string;
}

const INIT_ANNOUNCEMENTS: AnnItem[] = [
  {
    id: '1',
    barColor: '#7C3AED',
    title: 'PTM Scheduled for 10 May',
    body: 'Dear parents, the Parent-Teacher Meeting is scheduled for Saturday, 10th May from 9 AM to 12 PM. Kindly make arrangements to attend.',
    audience: 'Entire School', audienceBg: '#F3E8FF', audienceText: '#7C3AED',
    date: '3 May 2026',
  },
  {
    id: '2',
    barColor: colors.teacher,
    title: 'Mid-Term Exam Timetable Released',
    body: 'The mid-term examination timetable has been shared. Students must carry their hall tickets on all exam days.',
    audience: 'Class 6B', audienceBg: '#CCFBF1', audienceText: '#0F766E',
    date: '1 May 2026',
  },
  {
    id: '3',
    barColor: '#14B8A6',
    title: 'Science Project Submission Reminder',
    body: 'All students must submit their science projects by Friday. No submissions will be accepted after the deadline.',
    audience: 'Class 6B', audienceBg: '#CCFBF1', audienceText: '#0F766E',
    date: '28 Apr 2026',
  },
];

function AnnCard({ item }: { item: AnnItem }) {
  return (
    <View style={styles.annCard}>
      <View style={[styles.annAccent, { backgroundColor: item.barColor }]} />
      <View style={styles.annBody}>
        <Text style={styles.annTitle}>{item.title}</Text>
        <Text style={styles.annBodyText} numberOfLines={2}>{item.body}</Text>
        <View style={styles.annMeta}>
          <View style={[styles.audiencePill, { backgroundColor: item.audienceBg }]}>
            <Text style={[styles.audienceLabel, { color: item.audienceText }]}>
              {item.audience}
            </Text>
          </View>
          <Text style={styles.annDate}>{item.date}</Text>
        </View>
      </View>
    </View>
  );
}

export function AnnounceScreen() {
  const { selectedSection } = useTeacherStore();
  const sectionLabel = selectedSection ? `${selectedSection.class_name} ${selectedSection.section_name}` : 'Class';
  const sendToOptions = [`${sectionLabel} Only`, 'Entire School'];

  const [announcements, setAnnouncements] = useState<AnnItem[]>(INIT_ANNOUNCEMENTS);
  const [showSheet, setShowSheet] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annMsg, setAnnMsg] = useState('');
  const [sendTo, setSendTo] = useState(sendToOptions[0]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setShowSheet(false);
    setAnnTitle('');
    setAnnMsg('');
    setSendTo(sendToOptions[0]);
    setPosting(false);
    setError('');
    setAnnouncements(INIT_ANNOUNCEMENTS);
  }, [selectedSection?.id]);

  async function handlePost() {
    if (!selectedSection?.id || !selectedSection.is_class_teacher) return;
    setPosting(true);
    setError('');
    try {
      const isSchool = sendTo === 'Entire School';
      const reqTitle = annTitle.trim() || 'New Announcement';
      const reqBody = annMsg.trim() || 'No message body.';

      const res = await teacherApi.createAnnouncement({
        section_id: selectedSection.id,
        title: reqTitle,
        body: reqBody,
        publish_now: true,
      });

      console.log("Res: ", res)

      const newItem: AnnItem = {
        id: res.id,
        barColor: isSchool ? '#7C3AED' : colors.teacher,
        title: res.title,
        body: reqBody,
        audience: res.audience === 'SECTION' ? sectionLabel : 'Entire School',
        audienceBg: isSchool ? '#F3E8FF' : '#CCFBF1',
        audienceText: isSchool ? '#7C3AED' : '#0F766E',
        date: 'Just now',
      };
      setAnnouncements(prev => [newItem, ...prev]);
      setShowSheet(false);
      setAnnTitle('');
      setAnnMsg('');
    } catch (err) {
      console.error(err);
      setError('Failed to post announcement. Please try again.');
    } finally {
      setPosting(false);
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
            <Text style={styles.headerTitle}>Announcements</Text>
            {selectedSection.is_class_teacher && (
              <Pressable onPress={() => setShowSheet(true)}>
                <Ionicons name="add-circle-outline" size={24} color={colors.teacher} />
              </Pressable>
            )}
          </View>

          <FlatList
            data={announcements}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <AnnCard item={item} />}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            showsVerticalScrollIndicator={false}
          />

          <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)}>
            <Text style={styles.sheetTitle}>New Announcement</Text>

            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.textInput}
              value={annTitle}
              onChangeText={setAnnTitle}
              placeholder="Announcement title..."
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={annMsg}
              onChangeText={setAnnMsg}
              placeholder="Write your announcement..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <Text style={styles.fieldLabel}>Send To</Text>
            <View style={styles.sendToRow}>
              {sendToOptions.map(opt => (
                <Pressable
                  key={opt}
                  style={[styles.sendToOption, sendTo === opt && styles.sendToOptionActive]}
                  onPress={() => setSendTo(opt)}
                >
                  {sendTo === opt && (
                    <Ionicons name="checkmark-circle" size={16} color={colors.teacher} style={{ marginRight: 6 }} />
                  )}
                  <Text style={[styles.sendToText, sendTo === opt && styles.sendToTextActive]}>
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.sheetBtns}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowSheet(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.postBtn, posting && styles.postBtnPosting]}
                onPress={handlePost}
              >
                <Text style={styles.postBtnText}>{posting ? 'Posting...' : 'Post Announcement'}</Text>
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
  listContent: { padding: spacing.lg },
  // Announcement card
  annCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, overflow: 'hidden',
  },
  annAccent: { width: 3 },
  annBody: { flex: 1, padding: spacing.md, paddingLeft: spacing.lg },
  annTitle: {
    ...(typography.body as object), fontWeight: '500',
    color: colors.textPrimary, marginBottom: spacing.xs,
  },
  annBodyText: {
    ...(typography.caption as object), color: colors.textSecondary,
    lineHeight: 18, marginBottom: spacing.sm,
  },
  annMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  audiencePill: {
    borderRadius: 999, paddingVertical: spacing.xs, paddingHorizontal: spacing.md,
  },
  audienceLabel: { ...(typography.label as object) },
  annDate: { ...(typography.caption as object), color: colors.textMuted },
  // Sheet
  sheetTitle: { ...(typography.h3 as object), fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.md },
  fieldLabel: {
    ...(typography.caption as object), fontWeight: '500',
    color: colors.textSecondary, marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: '#F5F5F5', borderRadius: 10,
    padding: spacing.md, ...(typography.body as object),
    color: colors.textPrimary, marginBottom: spacing.md,
  },
  textArea: { height: 110 },
  sendToRow: { gap: spacing.xs, marginBottom: spacing.lg },
  sendToOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.background,
  },
  sendToOptionActive: { borderColor: colors.teacher, backgroundColor: '#EFF6FF' },
  sendToText: { ...(typography.body as object), color: colors.textSecondary },
  sendToTextActive: { color: colors.teacher, fontWeight: '500' },
  sheetBtns: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.textSecondary },
  postBtn: { flex: 1, height: 48, borderRadius: 10, backgroundColor: colors.teacher, alignItems: 'center', justifyContent: 'center' },
  postBtnPosting: { backgroundColor: colors.success },
  postBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.surface },
  errorText: { ...(typography.caption as object), color: colors.danger, marginBottom: spacing.md, textAlign: 'center' },
});
