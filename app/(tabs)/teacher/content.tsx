import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { teacherMaterialsApi, type StudyMaterial } from '../../../services/teacher-materials';
import { subjectsApi, type Subject } from '../../../services/subjects';
import { useTeacherStore } from '../../../store/teacher-store';

const ACCENT = '#185FA5';

// File type → icon + color
function fileConfig(url: string | null): { icon: string; color: string; bg: string; label: string } {
  if (!url) return { icon: 'document-outline', color: '#888888', bg: '#F5F5F5', label: 'File' };
  const u = url.toLowerCase();
  if (u.match(/\.(jpg|jpeg|png|gif|webp)$/)) return { icon: 'image', color: '#1D9E75', bg: '#E1F5EE', label: 'Image' };
  if (u.match(/\.(mp4|mov|avi|mkv)$/)) return { icon: 'videocam', color: '#534AB7', bg: '#F3F0FF', label: 'Video' };
  if (u.match(/\.pdf$/)) return { icon: 'document-text', color: '#DC2626', bg: '#FEE2E2', label: 'PDF' };
  if (u.match(/\.(doc|docx)$/)) return { icon: 'document-text', color: '#185FA5', bg: '#EBF2FB', label: 'Word' };
  if (u.match(/\.(xls|xlsx)$/)) return { icon: 'grid', color: '#1D9E75', bg: '#E1F5EE', label: 'Excel' };
  if (u.match(/\.(ppt|pptx)$/)) return { icon: 'easel', color: '#D97706', bg: '#FEF3C7', label: 'PPT' };
  return { icon: 'document-outline', color: '#888888', bg: '#F5F5F5', label: 'File' };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Subject color palette (same as homework)
const SUBJECT_COLORS = [
  { bg: '#EBF2FB', text: '#185FA5' }, { bg: '#E1F5EE', text: '#1D9E75' },
  { bg: '#F3F0FF', text: '#534AB7' }, { bg: '#FEF3C7', text: '#D97706' },
  { bg: '#FFE4E6', text: '#E11D48' }, { bg: '#E0F2FE', text: '#0369A1' },
];
function subjectColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return SUBJECT_COLORS[Math.abs(h) % SUBJECT_COLORS.length];
}

export default function ContentScreen() {
  const { selectedSection } = useTeacherStore();

  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [filterSubject, setFilterSubject] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Create sheet
  const [sheetVisible, setSheetVisible] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [selSubject, setSelSubject] = useState<Subject | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [matDate, setMatDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mime: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  async function fetchMaterials(isRefresh = false) {
    if (!selectedSection) return;
    if (!isRefresh) setLoading(true);
    setFetchError('');
    try {
      const data = await teacherMaterialsApi.getAll({ section_id: selectedSection.id });
      setMaterials(data.results);
    } catch (err: any) {
      setFetchError(err.details ?? 'Failed to load materials.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchMaterials(); }, [selectedSection?.id]));

  async function handleDownload(mat: StudyMaterial) {
    if (!mat.file_url) return;
    setDownloadingId(mat.id);
    try {
      // Build clean filename preserving original extension
      const urlParts = mat.file_url.split('/');
      const rawName = urlParts[urlParts.length - 1].split('?')[0];
      const ext = rawName.includes('.') ? rawName.substring(rawName.lastIndexOf('.')) : '';
      const fileName = `${mat.title.replace(/[^a-zA-Z0-9]/g, '_')}${ext}`;

      // Step 1: Download to cache
      const cacheUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.downloadAsync(mat.file_url, cacheUri);

      if (Platform.OS === 'android') {
        // Android: ask user to pick a save folder via Storage Access Framework
        const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (perm.granted) {
          // Determine MIME from extension
          const mimeMap: Record<string, string> = {
            pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg',
            png: 'image/png', mp4: 'video/mp4', doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            xls: 'application/vnd.ms-excel',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ppt: 'application/vnd.ms-powerpoint',
            pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          };
          const extKey = ext.replace('.', '').toLowerCase();
          const mime = mimeMap[extKey] ?? 'application/octet-stream';

          // Read cached file as base64 and write to chosen directory
          const base64 = await FileSystem.readAsStringAsync(cacheUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
            perm.directoryUri, fileName, mime,
          );
          await FileSystem.writeAsStringAsync(destUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          Alert.alert('Saved ✓', `"${fileName}" has been saved to the selected folder.`);
        }
        // If user cancelled the folder picker — do nothing
      } else {
        // iOS: share sheet has "Save to Files" prominently
        await Sharing.shareAsync(cacheUri, { dialogTitle: mat.title, UTI: 'public.item' });
      }
    } catch {
      Alert.alert('Download failed', 'Could not download the file. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  }

  async function openSheet() {
    setTitle('');
    setDescription('');
    setMatDate(new Date());
    setSelSubject(null);
    setPickedFile(null);
    setFormError('');
    setSheetVisible(true);
    if (subjects.length === 0) {
      setSubjectsLoading(true);
      try {
        const data = await subjectsApi.getAll();
        setSubjects(data.results);
      } catch { /* non-fatal */ }
      finally { setSubjectsLoading(false); }
    }
  }

  async function pickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'video/*',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setPickedFile({
          uri: asset.uri,
          name: asset.name ?? 'file',
          mime: asset.mimeType ?? 'application/octet-stream',
        });
        setFormError('');
      }
    } catch {
      Alert.alert('Error', 'Could not open file picker.');
    }
  }

  async function handleCreate() {
    if (!selectedSection) return;
    if (!selSubject) { setFormError('Please select a subject.'); return; }
    if (!title.trim()) { setFormError('Title is required.'); return; }
    if (!pickedFile) { setFormError('Please attach a file.'); return; }

    setFormError('');
    setSubmitting(true);
    try {
      const created = await teacherMaterialsApi.create({
        section_id: selectedSection.id,
        subject_id: selSubject.id,
        title: title.trim(),
        description: description.trim(),
        material_date: toDateString(matDate),
        fileUri: pickedFile.uri,
        fileName: pickedFile.name,
        fileMime: pickedFile.mime,
      });
      setMaterials(prev => [created, ...prev]);
      setSheetVisible(false);
    } catch (err: any) {
      setFormError(err.details ?? 'Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Unique subjects from loaded materials (for filter chips)
  const availableSubjects = Array.from(
    new Map(materials.map(m => [m.subject.id, m.subject])).values()
  );
  const filtered = filterSubject
    ? materials.filter(m => m.subject.id === filterSubject)
    : materials;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Study Materials</Text>
          {selectedSection && (
            <Text style={styles.headerSub}>
              {selectedSection.class_name} – {selectedSection.section_name}
            </Text>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          onPress={openSheet}
        >
          <Ionicons name="add" size={22} color={ACCENT} />
        </Pressable>
      </View>

      {/* Subject filter chips */}
      {availableSubjects.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          <Pressable
            style={[styles.filterChip, !filterSubject && styles.filterChipActive]}
            onPress={() => setFilterSubject(null)}
          >
            <Text style={[styles.filterChipText, !filterSubject && styles.filterChipTextActive]}>
              All
            </Text>
          </Pressable>
          {availableSubjects.map(sub => {
            const sc = subjectColor(sub.name);
            const active = filterSubject === sub.id;
            return (
              <Pressable
                key={sub.id}
                style={[styles.filterChip, active && { backgroundColor: sc.text, borderColor: sc.text }]}
                onPress={() => setFilterSubject(active ? null : sub.id)}
              >
                <Text style={[styles.filterChipText, active && { color: '#FFFFFF' }]}>
                  {sub.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchMaterials(true); }}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
      >
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.stateText}>Loading materials…</Text>
          </View>
        )}

        {!loading && !!fetchError && (
          <View style={styles.errorCard}>
            <View style={styles.errorIconWrap}>
              <Ionicons name="cloud-offline-outline" size={28} color="#DC2626" />
            </View>
            <Text style={styles.errorTitle}>Couldn't load materials</Text>
            <Text style={styles.errorBody}>{fetchError}</Text>
            <Pressable style={styles.retryBtn} onPress={() => fetchMaterials()}>
              <Ionicons name="refresh-outline" size={15} color="#FFFFFF" />
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {!loading && !fetchError && filtered.length === 0 && (
          <View style={styles.centered}>
            <View style={styles.emptyIcon}>
              <Ionicons name="documents-outline" size={36} color="#CCCCCC" />
            </View>
            <Text style={styles.emptyTitle}>
              {filterSubject ? 'No materials for this subject' : 'No materials uploaded yet'}
            </Text>
            <Text style={styles.emptyBody}>
              Tap + to upload a study material for this class.
            </Text>
          </View>
        )}

        {!loading && !fetchError && filtered.map(mat => {
          const fc = fileConfig(mat.file_url);
          const sc = subjectColor(mat.subject.name);
          return (
            <View key={mat.id} style={styles.card}>
              {/* File type icon */}
              <View style={[styles.fileIcon, { backgroundColor: fc.bg }]}>
                <Ionicons name={fc.icon as any} size={22} color={fc.color} />
              </View>

              <View style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                  <View style={[styles.subjectBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.subjectText, { color: sc.text }]}>
                      {mat.subject.name}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(mat.material_date)}</Text>
                </View>

                <Text style={styles.cardTitle} numberOfLines={2}>{mat.title}</Text>

                {!!mat.description && (
                  <Text style={styles.cardDesc} numberOfLines={2}>{mat.description}</Text>
                )}

                <View style={styles.cardFooter}>
                  <View style={[styles.fileTypePill, { backgroundColor: fc.bg }]}>
                    <Text style={[styles.fileTypeText, { color: fc.color }]}>{fc.label}</Text>
                  </View>
                  <Text style={styles.uploadedBy}>by {mat.uploaded_by.name}</Text>
                  {mat.file_url && (
                    <Pressable
                      style={({ pressed }) => [styles.downloadBtn, pressed && styles.downloadBtnPressed, downloadingId === mat.id && styles.downloadBtnDisabled]}
                      onPress={() => handleDownload(mat)}
                      disabled={downloadingId === mat.id}
                      hitSlop={6}
                    >
                      {downloadingId === mat.id ? (
                        <ActivityIndicator size="small" color={ACCENT} />
                      ) : (
                        <Ionicons name="download-outline" size={15} color={ACCENT} />
                      )}
                      <Text style={styles.downloadText}>
                        {downloadingId === mat.id ? 'Downloading…' : 'Download'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Create sheet */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !submitting && setSheetVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.backdrop} onPress={() => !submitting && setSheetVisible(false)} />

          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Upload Material</Text>
                {selectedSection && (
                  <Text style={styles.sheetSub}>
                    {selectedSection.class_name} – {selectedSection.section_name}
                  </Text>
                )}
              </View>
              <Pressable onPress={() => !submitting && setSheetVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#666666" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Subject */}
              <Text style={styles.fieldLabel}>Subject</Text>
              {subjectsLoading ? (
                <View style={styles.subjectsLoading}>
                  <ActivityIndicator size="small" color={ACCENT} />
                  <Text style={styles.subjectsLoadingText}>Loading subjects…</Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.subjectScroll}
                  contentContainerStyle={styles.subjectScrollContent}
                >
                  {subjects.map(sub => {
                    const sc = subjectColor(sub.name);
                    const active = selSubject?.id === sub.id;
                    return (
                      <Pressable
                        key={sub.id}
                        style={[
                          styles.subjectChip,
                          { borderColor: sc.text, backgroundColor: active ? sc.text : 'transparent' },
                        ]}
                        onPress={() => { setSelSubject(sub); setFormError(''); }}
                      >
                        <Text style={[styles.subjectChipText, { color: active ? '#FFFFFF' : sc.text }]}>
                          {sub.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              {/* Title */}
              <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={v => { setTitle(v); setFormError(''); }}
                placeholder="e.g. Chapter 5 Notes"
                placeholderTextColor="#AAAAAA"
                maxLength={255}
              />

              {/* Description */}
              <Text style={styles.fieldLabel}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={description}
                onChangeText={setDescription}
                placeholder="Add a short note about this material…"
                placeholderTextColor="#AAAAAA"
                multiline
                textAlignVertical="top"
              />

              {/* Date */}
              <Text style={styles.fieldLabel}>Material Date</Text>
              <Pressable
                style={({ pressed }) => [styles.datePickerBtn, pressed && styles.datePickerBtnPressed]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={16} color={ACCENT} />
                <Text style={styles.datePickerText}>
                  {matDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={matDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, d) => { setShowDatePicker(false); if (d) setMatDate(d); }}
                />
              )}

              {/* File picker */}
              <Text style={[styles.fieldLabel, { marginTop: 18 }]}>File</Text>
              <Pressable
                style={({ pressed }) => [styles.filePicker, !!pickedFile && styles.filePickerActive, pressed && styles.filePickerPressed]}
                onPress={pickFile}
              >
                {pickedFile ? (
                  <>
                    <View style={[styles.filePickerIcon, { backgroundColor: '#EBF2FB' }]}>
                      <Ionicons name="document-attach" size={20} color={ACCENT} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.filePickerName} numberOfLines={1}>{pickedFile.name}</Text>
                      <Text style={styles.filePickerHint}>Tap to change file</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={20} color="#1D9E75" />
                  </>
                ) : (
                  <>
                    <View style={styles.filePickerIcon}>
                      <Ionicons name="cloud-upload-outline" size={22} color="#AAAAAA" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.filePickerPlaceholder}>Tap to select a file</Text>
                      <Text style={styles.filePickerHint}>PDF, Word, Excel, PPT, Images, Videos (max 50 MB)</Text>
                    </View>
                  </>
                )}
              </Pressable>

              {/* Error */}
              {!!formError && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                  <Text style={styles.errorRowText}>{formError}</Text>
                </View>
              )}

              {/* Submit */}
              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && styles.submitBtnPressed,
                  submitting && styles.submitBtnDisabled,
                ]}
                onPress={handleCreate}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Upload Material</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F4F8' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111111' },
  headerSub: { fontSize: 12, color: '#AAAAAA', marginTop: 2 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EBF2FB', alignItems: 'center', justifyContent: 'center',
  },
  addBtnPressed: { opacity: 0.7 },

  // Filter chips
  filterScroll: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE', flexGrow: 0 },
  filterContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#DDDDDD',
    backgroundColor: 'transparent',
  },
  filterChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  filterChipText: { fontSize: 12, fontWeight: '500', color: '#888888' },
  filterChipTextActive: { color: '#FFFFFF' },

  scroll: { flex: 1 },
  scrollContent: { padding: 14, gap: 10 },

  centered: { alignItems: 'center', paddingVertical: 64, gap: 12 },
  stateText: { fontSize: 14, color: '#888888' },
  errorCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 28,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#FFCDD2',
  },
  errorIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  errorTitle: { fontSize: 15, fontWeight: '600', color: '#111111' },
  errorBody: { fontSize: 13, color: '#888888', textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DC2626', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9, marginTop: 4 },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#444444' },
  emptyBody: { fontSize: 13, color: '#AAAAAA', textAlign: 'center', lineHeight: 20 },

  // Material card
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 0.5,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  fileIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardBody: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  subjectBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  subjectText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  dateText: { fontSize: 11, color: '#AAAAAA' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111111', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#666666', lineHeight: 17, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fileTypePill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  fileTypeText: { fontSize: 10, fontWeight: '700' },
  uploadedBy: { fontSize: 11, color: '#AAAAAA', flex: 1 },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF2FB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  downloadBtnPressed: { opacity: 0.7 },
  downloadBtnDisabled: { opacity: 0.6 },
  downloadText: { fontSize: 12, fontWeight: '600', color: ACCENT },

  // Modal
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, maxHeight: '92%' },
  sheetHandle: { width: 36, height: 4, backgroundColor: '#DDDDDD', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#111111' },
  sheetSub: { fontSize: 12, color: ACCENT, fontWeight: '500', marginTop: 2 },
  sheetScroll: { paddingHorizontal: 20 },

  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#666666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },

  subjectsLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  subjectsLoadingText: { fontSize: 13, color: '#888888' },
  subjectScroll: { marginHorizontal: -20 },
  subjectScrollContent: { paddingHorizontal: 20, gap: 8 },
  subjectChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  subjectChipText: { fontSize: 13, fontWeight: '600' },

  input: { backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111111', marginBottom: 16 },
  inputMulti: { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' },

  datePickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EBF2FB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4 },
  datePickerBtnPressed: { opacity: 0.75 },
  datePickerText: { fontSize: 14, fontWeight: '600', color: ACCENT },

  filePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: '#DDDDDD', borderStyle: 'dashed',
    borderRadius: 14, padding: 14, marginBottom: 16,
  },
  filePickerActive: { borderColor: ACCENT, borderStyle: 'solid' },
  filePickerPressed: { opacity: 0.75 },
  filePickerIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  filePickerName: { fontSize: 13, fontWeight: '600', color: '#111111' },
  filePickerPlaceholder: { fontSize: 13, fontWeight: '500', color: '#888888' },
  filePickerHint: { fontSize: 11, color: '#AAAAAA', marginTop: 2 },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  errorRowText: { fontSize: 13, color: '#DC2626', flex: 1 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 14, marginBottom: 32 },
  submitBtnPressed: { opacity: 0.85 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
