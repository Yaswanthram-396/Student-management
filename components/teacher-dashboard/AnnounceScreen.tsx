import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { HeaderBar, BottomSheet } from '../shared';
import {
  teacherApi,
  type AnnouncementItem,
  type Section,
} from '../../services/teacher';

interface LocalAnn {
  id: string;
  title: string;
  body: string;
  sectionLabel: string;
  dateLabel: string;
  accentColor: string;
}

function relativeTime(iso: string): string {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    const days = Math.floor(diff / 86400);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso;
  }
}

function AnnCard({ item }: { item: LocalAnn }) {
  return (
    <View style={st.annCard}>
      <View style={[st.annAccent, { backgroundColor: item.accentColor }]} />
      <View style={st.annBody}>
        <Text style={st.annTitle}>{item.title}</Text>
        <Text style={st.annBodyText} numberOfLines={2}>
          {item.body}
        </Text>
        <View style={st.annMeta}>
          <View style={st.sectionPill}>
            <Text style={st.sectionPillText}>{item.sectionLabel}</Text>
          </View>
          <Text style={st.annDate}>{item.dateLabel}</Text>
        </View>
      </View>
    </View>
  );
}

export function AnnounceScreen() {
  const [sections, setSections] = useState<Section[]>([]);
  const [classTSections, setClassTSections] = useState<Section[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);
  const [announcements, setAnnouncements] = useState<LocalAnn[]>([]);

  const [showSheet, setShowSheet] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annMsg, setAnnMsg] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await teacherApi.getSections();
        setSections(res.results);
        const ct = res.results.filter((s) => s.is_class_teacher);
        setClassTSections(ct);
        if (ct.length > 0) setSelectedSectionId(ct[0].id);
      } catch {}
      setLoadingSections(false);
    })();
  }, []);

  async function handlePost() {
    if (!annTitle.trim() || !annMsg.trim()) {
      Alert.alert('Validation', 'Please fill in title and message.');
      return;
    }
    if (!selectedSectionId) {
      Alert.alert('Validation', 'Please select a section.');
      return;
    }
    setPosting(true);
    try {
      const res = await teacherApi.createAnnouncement({
        section_id: selectedSectionId,
        title: annTitle.trim(),
        body: annMsg.trim(),
        publish_now: true,
      });
      const section = classTSections.find((s) => s.id === selectedSectionId);
      const newItem: LocalAnn = {
        id: res.id,
        title: res.title,
        body: annMsg.trim(),
        sectionLabel: section
          ? `${section.class_name} – ${section.section_name}`
          : 'Section',
        dateLabel: res.published_at ? relativeTime(res.published_at) : 'Just now',
        accentColor: colors.teacher,
      };
      setAnnouncements((prev) => [newItem, ...prev]);
      setShowSheet(false);
      setAnnTitle('');
      setAnnMsg('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to post announcement.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <HeaderBar
        center={<Text style={st.headerTitle}>Announcements</Text>}
        right={
          <Pressable
            onPress={() => setShowSheet(true)}
            disabled={loadingSections}
          >
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={loadingSections ? colors.textMuted : colors.teacher}
            />
          </Pressable>
        }
      />

      {announcements.length === 0 ? (
        <View style={st.empty}>
          <Ionicons name="megaphone-outline" size={52} color={colors.textMuted} />
          <Text style={st.emptyTitle}>No Announcements Yet</Text>
          <Text style={st.emptyBody}>
            Tap + to post an announcement to your class.
          </Text>
          {loadingSections && (
            <ActivityIndicator
              style={{ marginTop: spacing.sm }}
              color={colors.teacher}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AnnCard item={item} />}
          contentContainerStyle={st.listContent}
          ItemSeparatorComponent={() => (
            <View style={{ height: spacing.sm }} />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)}>
        <Text style={st.sheetTitle}>New Announcement</Text>

        {classTSections.length === 0 ? (
          <View style={st.noSections}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#92400E"
              style={{ marginBottom: spacing.xs }}
            />
            <Text style={st.noSectionsText}>
              Announcements can only be posted by the class teacher. You are not
              currently assigned as a class teacher to any section.
            </Text>
          </View>
        ) : (
          <>
            {/* Section picker (multiple class-teacher sections) */}
            {classTSections.length > 1 && (
              <>
                <Text style={st.fieldLabel}>Post To</Text>
                <View style={st.sectionOptions}>
                  {classTSections.map((sec) => (
                    <Pressable
                      key={sec.id}
                      style={[
                        st.sectionOption,
                        selectedSectionId === sec.id && st.sectionOptionOn,
                      ]}
                      onPress={() => setSelectedSectionId(sec.id)}
                    >
                      {selectedSectionId === sec.id && (
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={colors.teacher}
                          style={{ marginRight: 6 }}
                        />
                      )}
                      <Text
                        style={[
                          st.sectionOptionText,
                          selectedSectionId === sec.id &&
                            st.sectionOptionTextOn,
                        ]}
                      >
                        {sec.class_name} – Section {sec.section_name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* Auto-selected single section label */}
            {classTSections.length === 1 && (
              <View style={st.singleSectionBadge}>
                <Ionicons
                  name="people-outline"
                  size={14}
                  color={colors.teacher}
                />
                <Text style={st.singleSectionText}>
                  {classTSections[0].class_name} – Section{' '}
                  {classTSections[0].section_name}
                </Text>
              </View>
            )}

            <Text style={st.fieldLabel}>Title</Text>
            <TextInput
              style={st.textInput}
              value={annTitle}
              onChangeText={setAnnTitle}
              placeholder="Announcement title…"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={st.fieldLabel}>Message</Text>
            <TextInput
              style={[st.textInput, st.textArea]}
              value={annMsg}
              onChangeText={setAnnMsg}
              placeholder="Write your announcement…"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <View style={st.sheetBtns}>
              <Pressable
                style={st.cancelBtn}
                onPress={() => setShowSheet(false)}
              >
                <Text style={st.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[st.postBtn, posting && st.postBtnBusy]}
                onPress={handlePost}
                disabled={posting}
              >
                {posting ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text style={st.postBtnText}>Post Announcement</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  listContent: { padding: spacing.lg },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: { ...(typography.h2 as object), color: colors.textPrimary },
  emptyBody: {
    ...(typography.body as object),
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  annCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  annAccent: { width: 3 },
  annBody: { flex: 1, padding: spacing.md, paddingLeft: spacing.lg },
  annTitle: {
    ...(typography.body as object),
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  annBodyText: {
    ...(typography.caption as object),
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  annMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionPill: {
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: '#DBEAFE',
  },
  sectionPillText: { ...(typography.label as object), color: colors.teacher },
  annDate: { ...(typography.caption as object), color: colors.textMuted },

  noSections: {
    padding: spacing.lg,
    backgroundColor: colors.warningBg,
    borderRadius: 12,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  noSectionsText: {
    ...(typography.body as object),
    color: '#92400E',
    lineHeight: 22,
    textAlign: 'center',
  },

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

  sectionOptions: { gap: spacing.xs, marginBottom: spacing.md },
  sectionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  sectionOptionOn: { borderColor: colors.teacher, backgroundColor: '#EFF6FF' },
  sectionOptionText: {
    ...(typography.body as object),
    color: colors.textSecondary,
  },
  sectionOptionTextOn: { color: colors.teacher, fontWeight: '500' },

  singleSectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  singleSectionText: {
    ...(typography.body as object),
    color: colors.teacher,
    fontWeight: '500',
  },

  textInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: spacing.md,
    ...(typography.body as object),
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  textArea: { height: 110, textAlignVertical: 'top' },

  sheetBtns: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
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
  postBtnText: {
    ...(typography.h3 as object),
    fontWeight: '500',
    color: colors.surface,
  },
});
