import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { teacherApi } from '../../services/teacher';
import { useTeacherStore } from '../../store/teacher-store';
import { GetStudyMaterialParams, StudyMaterialResponse } from '../../types/teacher';
import { BottomSheet } from '../shared';
import { TeacherTopBar } from './TeacherTopBar';

// No mock data needed anymore

const FILE_TYPE_CFG: Record<string, { bg: string; color: string; label: string }> = {
  PDF:   { bg: colors.dangerBg,  color: '#991B1B', label: 'PDF' },
  Image: { bg: '#DBEAFE',        color: colors.teacher,  label: 'IMG' },
  Video: { bg: '#F3E8FF',        color: '#7C3AED',  label: 'VID' },
};

function FileTypeBox({ type }: { type: string }) {
  const cfg = FILE_TYPE_CFG[type] ?? { bg: colors.background, color: colors.textMuted, label: '?' };
  return (
    <View style={[styles.fileTypeBox, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.fileTypeLabel, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function MaterialRow({ item }: { item: StudyMaterialResponse }) {
  let fileType = 'Unknown';
  if (item.file_url) {
    if (item.file_url.endsWith('.pdf')) fileType = 'PDF';
    else if (item.file_url.match(/\.(jpeg|jpg|png|gif|webp)$/i)) fileType = 'Image';
    else if (item.file_url.match(/\.(mp4|mov|avi)$/i)) fileType = 'Video';
  }

  return (
    <View style={styles.materialCard}>
      <FileTypeBox type={fileType} />
      <View style={styles.materialInfo}>
        <Text style={styles.materialTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.materialMeta}>{item.subject.name} · {new Date(item.material_date).toLocaleDateString()}</Text>
        {item.description ? <Text style={[styles.materialMeta, { marginTop: 2 }]} numberOfLines={1}>{item.description}</Text> : null}
      </View>
      <Ionicons name="download-outline" size={18} color={colors.textMuted} />
    </View>
  );
}

export function ContentScreen() {
  const { selectedSection } = useTeacherStore();
  const [activeSubjectId, setActiveSubjectId] = useState<string>('All');
  
  const [subjects, setSubjects] = useState<Array<{ id: string, name: string }>>([]);
  const [materials, setMaterials] = useState<StudyMaterialResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const [showSheet, setShowSheet]         = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [uploadSubjectId, setUploadSubjectId] = useState('');
  const [matTitle, setMatTitle]           = useState('');
  const [matDesc, setMatDesc]             = useState('');
  const [file, setFile]                   = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  useEffect(() => {
    async function loadSubjects() {
      try {
        const res = await teacherApi.getSubjects();
        setSubjects(res.results || []);
        if (res.results && res.results.length > 0) {
          setUploadSubjectId(res.results[0].id);
        }
      } catch (err) {
        console.error("Failed to load subjects", err);
      }
    }
    void loadSubjects();
  }, []);

  const fetchMaterials = useCallback(async () => {
    if (!selectedSection?.id) return;
    setLoading(true);
    try {
      const params: GetStudyMaterialParams = { section_id: selectedSection.id };
      if (activeSubjectId !== 'All') {
        params.subject_id = activeSubjectId;
      }
      const res = await teacherApi.getStudyMaterials(params);
      setMaterials(res.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedSection?.id, activeSubjectId]);

  useEffect(() => {
    setActiveSubjectId('All');
    setShowSheet(false);
    setUploading(false);
    setMatTitle('');
    setMatDesc('');
    setFile(null);
  }, [selectedSection?.id]);

  useEffect(() => {
    void fetchMaterials();
  }, [fetchMaterials]);

  async function handlePickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFile(result.assets[0]);
      }
    } catch (err) {
      console.error("File picking failed", err);
    }
  }

  async function handleUpload() {
    if (!selectedSection?.id || !uploadSubjectId || !matTitle.trim() || !file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('section_id', selectedSection.id);
      formData.append('subject_id', uploadSubjectId);
      formData.append('title', matTitle.trim());
      formData.append('description', matDesc.trim());
      formData.append('material_date', new Date().toISOString().split('T')[0]); // YYYY-MM-DD
      
      // Append file
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as any);

      await teacherApi.createStudyMaterial(formData);
      
      setShowSheet(false);
      setMatTitle('');
      setMatDesc('');
      setFile(null);
      void fetchMaterials();
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
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
            <Text style={styles.headerTitle}>Study Materials</Text>
            <Pressable onPress={() => setShowSheet(true)}>
              <Ionicons name="add-circle-outline" size={24} color={colors.teacher} />
            </Pressable>
          </View>

      {/* Subject filter pills */}
          <View style={styles.filterBar}>
        <FlatList
          data={[{ id: 'All', name: 'All' }, ...subjects]}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.filterPill, activeSubjectId === item.id && styles.filterPillActive]}
              onPress={() => setActiveSubjectId(item.id)}
            >
              <Text style={[styles.filterLabel, activeSubjectId === item.id && styles.filterLabelActive]}>
                {item.name}
              </Text>
            </Pressable>
          )}
        />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.teacher} style={{ marginTop: spacing.xl }} />
          ) : (
            <FlatList
              data={materials}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <MaterialRow item={item} />}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyTitle}>No materials found</Text>
                  <Text style={styles.emptySub}>
                    No study materials have been uploaded for this subject.
                  </Text>
                </View>
              )}
            />
          )}

          <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)}>
        <Text style={styles.sheetTitle}>Upload Material</Text>

        <Text style={styles.fieldLabel}>Subject</Text>
        <View style={styles.optionRow}>
          {subjects.map(s => (
            <Pressable
              key={s.id}
              style={[styles.optionPill, uploadSubjectId === s.id && styles.optionPillActive]}
              onPress={() => setUploadSubjectId(s.id)}
            >
              <Text style={[styles.optionText, uploadSubjectId === s.id && styles.optionTextActive]}>
                {s.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Material Title</Text>
        <TextInput
          style={styles.textInput}
          value={matTitle}
          onChangeText={setMatTitle}
          placeholder="Enter title..."
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.fieldLabel}>Description (Optional)</Text>
        <TextInput
          style={styles.textInput}
          value={matDesc}
          onChangeText={setMatDesc}
          placeholder="Brief description..."
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.fieldLabel}>File</Text>
        <Pressable style={styles.staticField} onPress={handlePickFile}>
          <Text style={styles.staticFieldText} numberOfLines={1}>
            {file ? file.name : 'Tap to select a file...'}
          </Text>
        </Pressable>

        <View style={styles.sheetBtns}>
          <Pressable style={styles.cancelBtn} onPress={() => setShowSheet(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.uploadBtn, uploading && styles.uploadBtnDone, (!file || !matTitle.trim()) && { opacity: 0.5 }]}
            onPress={handleUpload}
            disabled={!file || !matTitle.trim() || uploading}
          >
            <Text style={styles.uploadBtnText}>{uploading ? 'Uploading...' : 'Upload'}</Text>
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
  // Filter bar
  filterBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  filterList: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  filterPill: {
    paddingVertical: 5, paddingHorizontal: 14,
    borderRadius: 999, backgroundColor: colors.background,
  },
  filterPillActive: { backgroundColor: colors.teacher },
  filterLabel:       { ...(typography.caption as object), fontWeight: '500', color: colors.textSecondary },
  filterLabelActive: { color: colors.surface },
  // List
  listContent: { padding: spacing.lg },
  // Material card
  materialCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, padding: spacing.md, paddingHorizontal: spacing.lg,
  },
  fileTypeBox: {
    width: 42, height: 42, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  fileTypeLabel: { ...(typography.label as object), fontWeight: '700' },
  materialInfo: { flex: 1, minWidth: 0 },
  materialTitle: { ...(typography.body as object), fontWeight: '500', color: colors.textPrimary },
  materialMeta:  { ...(typography.caption as object), color: colors.textMuted, marginTop: spacing.xs },
  // Sheet
  sheetTitle: { ...(typography.h3 as object), fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.md },
  fieldLabel: {
    ...(typography.caption as object), fontWeight: '500',
    color: colors.textSecondary, marginBottom: spacing.xs,
  },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  optionPill: {
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md,
    borderRadius: 999, backgroundColor: colors.background,
    borderWidth: 0.5, borderColor: colors.border,
  },
  optionPillActive: { backgroundColor: colors.teacher, borderColor: colors.teacher },
  optionText:       { ...(typography.caption as object), fontWeight: '500', color: colors.textSecondary },
  optionTextActive: { color: colors.surface },
  textInput: {
    backgroundColor: '#F5F5F5', borderRadius: 10,
    padding: spacing.md, ...(typography.body as object),
    color: colors.textPrimary, marginBottom: spacing.md,
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
  uploadBtn:     { flex: 1, height: 48, borderRadius: 10, backgroundColor: colors.teacher, alignItems: 'center', justifyContent: 'center' },
  uploadBtnDone: { backgroundColor: colors.success },
  uploadBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.surface },
});
