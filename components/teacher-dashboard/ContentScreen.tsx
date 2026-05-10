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
import { HeaderBar, BottomSheet } from '../shared';
import {
  teacherApi,
  type StudyMaterial,
  type Section,
  type SubjectItem,
} from '../../services/teacher';

const FILE_ICONS: Record<string, { icon: string; bg: string; color: string }> = {
  pdf:  { icon: 'document-text-outline', bg: colors.dangerBg,  color: '#991B1B' },
  img:  { icon: 'image-outline',          bg: '#DBEAFE',        color: colors.teacher },
  vid:  { icon: 'videocam-outline',       bg: '#F3E8FF',        color: '#7C3AED' },
  file: { icon: 'document-outline',       bg: colors.border,    color: colors.textMuted },
};

function fileIcon(url: string | null) {
  if (!url) return FILE_ICONS.file;
  const ext = url.split('.').pop()?.toLowerCase() ?? '';
  if (['pdf'].includes(ext)) return FILE_ICONS.pdf;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return FILE_ICONS.img;
  if (['mp4', 'mov', 'avi'].includes(ext)) return FILE_ICONS.vid;
  return FILE_ICONS.file;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function MaterialRow({ item }: { item: StudyMaterial }) {
  const cfg = fileIcon(item.file_url);
  return (
    <View style={st.materialCard}>
      <View style={[st.fileTypeBox, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
      </View>
      <View style={st.materialInfo}>
        <Text style={st.materialTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={st.materialMeta}>
          {item.subject.name} · {formatDate(item.material_date)}
        </Text>
      </View>
      <Ionicons
        name={item.file_url ? 'download-outline' : 'alert-circle-outline'}
        size={18}
        color={item.file_url ? colors.textMuted : colors.warning}
      />
    </View>
  );
}

export function ContentScreen() {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(false);

  const [formSectionId, setFormSectionId] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [matRes, sectRes, subRes] = await Promise.all([
        teacherApi.getStudyMaterials(),
        teacherApi.getSections(),
        teacherApi.getSubjects(),
      ]);
      setMaterials(matRes.results);
      setSections(sectRes.results);
      const active = subRes.results.filter((s) => s.is_active);
      setSubjects(active);
      if (sectRes.results.length > 0) setFormSectionId(sectRes.results[0].id);
      if (active.length > 0) setFormSubjectId(active[0].id);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load materials.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = activeSubjectId
    ? materials.filter((m) => m.subject.id === activeSubjectId)
    : materials;

  function handleUploadTap() {
    if (!formTitle.trim() || !formSectionId || !formSubjectId) {
      Alert.alert('Validation', 'Please fill in title, section, and subject.');
      return;
    }
    Alert.alert(
      'File Upload',
      'File upload requires expo-document-picker.\n\nInstall it with:\nnpx expo install expo-document-picker\n\nThen update ContentScreen to use DocumentPicker.getDocumentAsync().',
      [{ text: 'OK' }],
    );
  }

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <HeaderBar
        center={<Text style={st.headerTitle}>Study Materials</Text>}
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

      {/* Subject filter bar */}
      {subjects.length > 0 && (
        <View style={st.filterBar}>
          <FlatList
            data={[{ id: null as string | null, name: 'All' }, ...subjects.map(s => ({ id: s.id, name: s.name }))]}
            keyExtractor={(item) => item.id ?? 'all'}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.filterList}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  st.filterPill,
                  activeSubjectId === item.id && st.filterPillOn,
                ]}
                onPress={() => setActiveSubjectId(item.id)}
              >
                <Text
                  style={[
                    st.filterLabel,
                    activeSubjectId === item.id && st.filterLabelOn,
                  ]}
                >
                  {item.name}
                </Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => (
              <View style={{ width: spacing.sm }} />
            )}
          />
        </View>
      )}

      {loading ? (
        <View style={st.centered}>
          <ActivityIndicator size="large" color={colors.teacher} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={st.centered}>
          <Ionicons name="document-outline" size={52} color={colors.textMuted} />
          <Text style={st.emptyTitle}>No Materials Yet</Text>
          <Text style={st.emptyBody}>
            Tap + to upload study materials for your students.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MaterialRow item={item} />}
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
          <Text style={st.sheetTitle}>Upload Material</Text>

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

          <Text style={st.fieldLabel}>Title</Text>
          <TextInput
            style={st.textInput}
            value={formTitle}
            onChangeText={setFormTitle}
            placeholder="Material title…"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={st.fieldLabel}>Description (optional)</Text>
          <TextInput
            style={[st.textInput, st.textArea]}
            value={formDesc}
            onChangeText={setFormDesc}
            placeholder="Add a short description…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Text style={st.fieldLabel}>File</Text>
          <Pressable style={st.filePicker} onPress={handleUploadTap}>
            <Ionicons
              name="cloud-upload-outline"
              size={24}
              color={colors.teacher}
            />
            <Text style={st.filePickerTitle}>Tap to pick a file</Text>
            <Text style={st.filePickerSub}>PDF · Image · Video</Text>
          </Pressable>

          <View style={st.sheetBtns}>
            <Pressable
              style={st.cancelBtn}
              onPress={() => setShowSheet(false)}
            >
              <Text style={st.cancelTxt}>Cancel</Text>
            </Pressable>
            <Pressable style={st.uploadBtn} onPress={handleUploadTap}>
              <Text style={st.uploadTxt}>Upload</Text>
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

  filterBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  filterList: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  filterPill: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.background,
  },
  filterPillOn: { backgroundColor: colors.teacher },
  filterLabel: {
    ...(typography.caption as object),
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterLabelOn: { color: colors.surface },
  listContent: { padding: spacing.lg },

  materialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  fileTypeBox: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  materialInfo: { flex: 1, minWidth: 0 },
  materialTitle: {
    ...(typography.body as object),
    fontWeight: '500',
    color: colors.textPrimary,
  },
  materialMeta: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: spacing.xs,
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
  hScroll: { marginBottom: spacing.md },
  hScrollContent: { gap: spacing.xs, paddingRight: spacing.md },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
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
  textInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: spacing.md,
    ...(typography.body as object),
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  filePicker: {
    borderWidth: 1.5,
    borderColor: colors.teacher,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    backgroundColor: '#EFF6FF',
  },
  filePickerTitle: {
    ...(typography.body as object),
    fontWeight: '500',
    color: colors.teacher,
  },
  filePickerSub: { ...(typography.caption as object), color: colors.textMuted },
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
  uploadBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.teacher,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTxt: {
    ...(typography.h3 as object),
    fontWeight: '500',
    color: colors.surface,
  },
});
