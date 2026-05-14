import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput, Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { HeaderBar, BottomSheet } from '../shared';
import { principalApi } from '../../services/principal';
import type { AcademicClassResponse, AnnouncementResponse, SectionResponse } from '../../types/principal';

interface AnnItem {
  id: string;
  barColor: string;
  title: string;
  body: string;
  audience: string;
  audienceBg: string;
  audienceText: string;
  date: string;
}

const AUDIENCE_DISPLAY: Record<string, { barColor: string; audienceBg: string; audienceText: string }> = {
  SCHOOL: { barColor: colors.principal, audienceBg: '#EDEDFA', audienceText: colors.principal },
  CLASS: { barColor: colors.warning, audienceBg: colors.warningBg, audienceText: '#92400E' },
  SECTION: { barColor: colors.warning, audienceBg: colors.warningBg, audienceText: '#92400E' },
};

const AUDIENCE_LABEL: Record<string, string> = {
  SCHOOL: 'Entire School',
  CLASS: 'Specific Class',
  SECTION: 'Specific Section',
};

const SEND_TO_OPTIONS = ['Entire School', 'Specific Class', 'Specific Section'] as const;
const SEND_TO_API: Record<(typeof SEND_TO_OPTIONS)[number], 'SCHOOL' | 'CLASS' | 'SECTION'> = {
  'Entire School': 'SCHOOL',
  'Specific Class': 'CLASS',
  'Specific Section': 'SECTION',
};

function deriveClassesFromSections(sectionItems: SectionResponse[]): AcademicClassResponse[] {
  const unique = new Map<string, AcademicClassResponse>();
  sectionItems.forEach((section) => {
    if (!unique.has(section.academic_class.id)) {
      unique.set(section.academic_class.id, {
        id: section.academic_class.id,
        name: section.academic_class.name,
        display_order: 0,
      });
    }
  });
  return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function mapApiAnn(a: AnnouncementResponse): AnnItem {
  const cfg = AUDIENCE_DISPLAY[a.audience] ?? AUDIENCE_DISPLAY.SCHOOL;
  return {
    id: String(a.id),
    barColor: cfg.barColor,
    title: a.title,
    body: a.body,
    audience: AUDIENCE_LABEL[a.audience] ?? 'Entire School',
    audienceBg: cfg.audienceBg,
    audienceText: cfg.audienceText,
    date: new Date(a.published_at).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    }),
  };
}

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
  const [announcements, setAnnouncements] = useState<AnnItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annMsg, setAnnMsg] = useState('');
  const [sendTo, setSendTo] = useState<(typeof SEND_TO_OPTIONS)[number]>('Entire School');
  const [classes, setClasses] = useState<AcademicClassResponse[]>([]);
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      principalApi.getAnnouncements(),
      principalApi.getClasses(),
      principalApi.getSections(),
    ])
      .then(([annResult, classResult, sectionResult]) => {
        const sectionResults = sectionResult.status === 'fulfilled'
          ? sectionResult.value.results
          : [];
        const classResults = classResult.status === 'fulfilled'
          ? classResult.value.results
          : deriveClassesFromSections(sectionResults);

        if (annResult.status === 'fulfilled') {
          setAnnouncements(annResult.value.results.map(mapApiAnn));
        }
        setClasses(classResults);
        setSections(sectionResults);
        setSelectedClassId(classResults[0]?.id ?? '');
        setSelectedSectionId(sectionResults[0]?.id ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredSections = useMemo(
    () => (selectedClassId
      ? sections.filter((item) => item.academic_class.id === selectedClassId)
      : sections),
    [sections, selectedClassId],
  );

  useEffect(() => {
    if (filteredSections.length === 0) return;
    if (!filteredSections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(filteredSections[0].id);
    }
  }, [filteredSections, selectedSectionId]);

  async function handlePost() {
    const audience = SEND_TO_API[sendTo];
    if (!annTitle.trim() || !annMsg.trim()) {
      Alert.alert('Missing fields', 'Title and message are required.');
      return;
    }
    if (audience === 'CLASS' && !selectedClassId) {
      Alert.alert('Missing class', 'Choose a class before posting a class announcement.');
      return;
    }
    if (audience === 'SECTION' && !selectedSectionId) {
      Alert.alert('Missing section', 'Choose a section before posting a section announcement.');
      return;
    }

    setPosting(true);
    try {
      const created = await principalApi.createAnnouncement({
        title: annTitle.trim(),
        body: annMsg.trim(),
        audience,
        class_ids: audience === 'CLASS' ? [selectedClassId] : undefined,
        section_ids: audience === 'SECTION' ? [selectedSectionId] : undefined,
        publish_now: true,
      });
      setAnnouncements((prev) => [mapApiAnn(created), ...prev]);
      setShowSheet(false);
      setAnnTitle('');
      setAnnMsg('');
      setSendTo('Entire School');
      setSelectedClassId(classes[0]?.id ?? '');
      setSelectedSectionId(sections[0]?.id ?? '');
    } catch (err: any) {
      Alert.alert('Error', err.details ?? 'Failed to post announcement.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        center={<Text style={styles.headerTitle}>Announcements</Text>}
        right={
          <Pressable onPress={() => setShowSheet(true)}>
            <Ionicons name="add-circle-outline" size={24} color={colors.principal} />
          </Pressable>
        }
      />

      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AnnCard item={item} />}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading
            ? <ActivityIndicator color={colors.principal} style={{ marginTop: spacing.xxl }} />
            : <Text style={styles.emptyText}>No announcements yet.</Text>
        }
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

        <Text style={styles.fieldLabel}>Audience</Text>
        <View style={styles.sendToRow}>
          {SEND_TO_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              style={[styles.sendToOption, sendTo === opt && styles.sendToOptionActive]}
              onPress={() => setSendTo(opt)}
            >
              {sendTo === opt && (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={colors.principal}
                  style={{ marginRight: 6 }}
                />
              )}
              <Text style={[styles.sendToText, sendTo === opt && styles.sendToTextActive]}>
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.helperText}>
          Parents can raise queries only when both the school-level and section-level parent query settings are enabled.
        </Text>

        {sendTo !== 'Entire School' && (
          <>
            <Text style={styles.fieldLabel}>Class</Text>
            <View style={styles.classPicker}>
              {classes.map((cls) => (
                <Pressable
                  key={cls.id}
                  style={[styles.classChip, selectedClassId === cls.id && styles.classChipActive]}
                  onPress={() => setSelectedClassId(cls.id)}
                >
                  <Text
                    style={[styles.classChipText, selectedClassId === cls.id && styles.classChipTextActive]}
                  >
                    {cls.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            {classes.length === 0 && (
              <Text style={styles.helperText}>
                No classes are available yet. Create classes in school settings before targeting a class announcement.
              </Text>
            )}
          </>
        )}

        {sendTo === 'Specific Section' && (
          <>
            <Text style={styles.fieldLabel}>Section</Text>
            <View style={styles.classPicker}>
              {filteredSections.map((section) => (
                <Pressable
                  key={section.id}
                  style={[styles.classChip, selectedSectionId === section.id && styles.classChipActive]}
                  onPress={() => setSelectedSectionId(section.id)}
                >
                  <Text
                    style={[
                      styles.classChipText,
                      selectedSectionId === section.id && styles.classChipTextActive,
                    ]}
                  >
                    {section.academic_class.name} · {section.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            {filteredSections.length === 0 && (
              <Text style={styles.helperText}>
                No sections are available for the selected class.
              </Text>
            )}
          </>
        )}

        <View style={styles.sheetBtns}>
          <Pressable style={styles.cancelBtn} onPress={() => setShowSheet(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.postBtn, posting && styles.postBtnPosting]}
            onPress={handlePost}
            disabled={posting}
          >
            <Text style={styles.postBtnText}>{posting ? 'Posting...' : 'Post Announcement'}</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  listContent: { padding: spacing.lg },
  emptyText: { ...(typography.body as object), color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl },
  annCard: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border, borderRadius: 14, overflow: 'hidden',
  },
  annAccent: { width: 3 },
  annBody: { flex: 1, padding: spacing.md, paddingLeft: spacing.lg },
  annTitle: { ...(typography.body as object), fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.xs },
  annBodyText: { ...(typography.caption as object), color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.sm },
  annMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  audiencePill: { borderRadius: 999, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  audienceLabel: { ...(typography.label as object) },
  annDate: { ...(typography.caption as object), color: colors.textMuted },
  sheetTitle: { ...(typography.h3 as object), fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.md },
  fieldLabel: { ...(typography.caption as object), fontWeight: '500', color: colors.textSecondary, marginBottom: spacing.xs },
  textInput: {
    backgroundColor: '#F5F5F5', borderRadius: 10,
    padding: spacing.md, ...(typography.body as object),
    color: colors.textPrimary, marginBottom: spacing.md,
  },
  textArea: { height: 110 },
  sendToRow: { gap: spacing.xs, marginBottom: spacing.sm },
  sendToOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.background,
  },
  sendToOptionActive: { borderColor: colors.principal, backgroundColor: '#EDEDFA' },
  sendToText: { ...(typography.body as object), color: colors.textSecondary },
  sendToTextActive: { color: colors.principal, fontWeight: '500' },
  classPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs, marginBottom: spacing.lg },
  classChip: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999,
    borderWidth: 0.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  classChipActive: { backgroundColor: colors.principal, borderColor: colors.principal },
  classChipText: { ...(typography.caption as object), fontWeight: '500', color: colors.textSecondary },
  classChipTextActive: { color: colors.surface },
  helperText: { ...(typography.caption as object), color: colors.textMuted, lineHeight: 18, marginBottom: spacing.md },
  sheetBtns: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.textSecondary },
  postBtn: { flex: 1, height: 48, borderRadius: 10, backgroundColor: colors.principal, alignItems: 'center', justifyContent: 'center' },
  postBtnPosting: { backgroundColor: colors.success },
  postBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.surface },
});
