import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { typography } from '../../../constants/typography';
import { analyticsApi } from '../../../services/analyticsApi';
import { principalApi } from '../../../services/principal';
import { appendAssetToFormData } from '../../../services/upload';
import type { AnalyticsExam, AnalyticsStatus } from '../../../types/analytics';
import { BottomSheet, HeaderBar } from '../../shared';

// ── Types ─────────────────────────────────────────────────────────────────────

type ClassOption = { id: string; name: string };
type SectionOption = { id: string; name: string; class_id: string };

// ── Status pill ───────────────────────────────────────────────────────────────

const STATUS_CFG: Record<AnalyticsStatus, { label: string; bg: string; color: string }> = {
  CREATED: { label: 'Created',  bg: colors.border,     color: colors.textSecondary },
  PENDING: { label: 'Pending',  bg: colors.warningBg,  color: colors.warning },
  RUNNING: { label: 'Running',  bg: colors.warningBg,  color: colors.warning },
  DONE:    { label: 'Done',     bg: colors.successBg,  color: colors.success },
  FAILED:  { label: 'Failed',   bg: colors.dangerBg,   color: colors.danger },
};

function StatusChip({ status }: { status: AnalyticsStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.CREATED;
  return (
    <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
      {(status === 'PENDING' || status === 'RUNNING') && (
        <ActivityIndicator size={10} color={cfg.color} style={{ marginRight: 4 }} />
      )}
      <Text style={[styles.statusChipText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ── Exam card ─────────────────────────────────────────────────────────────────

function ExamCard({ exam, onUpload }: { exam: AnalyticsExam; onUpload: (id: string) => void }) {
  const canView   = exam.analytics_status === 'DONE';
  const canUpload = exam.analytics_status === 'CREATED';

  function handlePress() {
    if (!canView) return;
    router.push(`/(tabs)/principal/exam-overview?exam_id=${exam.id}` as any);
  }

  return (
    <Pressable
      style={[styles.examCard, canView && styles.examCardTappable]}
      onPress={handlePress}
    >
      <View style={styles.examCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.examName}>{exam.exam_name}</Text>
          {exam.exam_date ? (
            <Text style={styles.examDate}>
              {new Date(exam.exam_date).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </Text>
          ) : null}
          <Text style={styles.examType}>
            {exam.type === 'CLASS' ? 'Whole Class Exam' : 'Section Exam'}
          </Text>
          {(exam.academic_class || exam.section) && (
            <Text style={styles.examDate}>
              {exam.academic_class?.name ?? exam.section?.name}
            </Text>
          )}
        </View>
        <StatusChip status={exam.analytics_status} />
      </View>

      <View style={styles.examCardActions}>
        {canUpload && (
          <Pressable style={styles.uploadBtn} onPress={() => onUpload(exam.id)}>
            <Ionicons name="cloud-upload-outline" size={14} color={colors.principal} />
            <Text style={styles.uploadBtnText}>Upload Results</Text>
          </Pressable>
        )}
        {canView && (
          <View style={styles.viewRow}>
            <Text style={styles.viewText}>View Analytics</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.principal} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function ExamListScreen() {
  const [exams, setExams]               = useState<AnalyticsExam[]>([]);
  const [loading, setLoading]           = useState(true);

  // Create exam sheet
  const [showCreate, setShowCreate]     = useState(false);
  const [examName, setExamName]         = useState('');
  const [scopeType, setScopeType]       = useState<'class' | 'section'>('class');
  const [classes, setClasses]           = useState<ClassOption[]>([]);
  const [sections, setSections]         = useState<SectionOption[]>([]);
  const [selectedClass, setSelectedClass]     = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [creating, setCreating]         = useState(false);

  // Upload sheet
  const [uploadExamId, setUploadExamId] = useState<string | null>(null);
  const [uploading, setUploading]       = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const filteredSections = sections.filter(s => s.class_id === selectedClass);

  // ── Load exams ──────────────────────────────────────────────────────────────

  const loadExams = useCallback(() => {
    setLoading(true);
    analyticsApi.listExams()
      .then(res => setExams(res.exams ?? res.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadExams(); }, [loadExams]);

  useEffect(() => {
    const hasActiveJobs = exams.some(
      (exam) => exam.analytics_status === 'PENDING' || exam.analytics_status === 'RUNNING',
    );
    if (!hasActiveJobs) return;

    const timeout = setTimeout(() => loadExams(), 7000);
    return () => clearTimeout(timeout);
  }, [exams, loadExams]);

  // ── Load classes/sections for create sheet ──────────────────────────────────

  useEffect(() => {
    if (!showCreate) return;
    principalApi.getSections()
      .then(res => {
        const classMap = new Map<string, ClassOption>();
        const secs: SectionOption[] = [];

        res.results.forEach(s => {
          classMap.set(s.academic_class.id, { id: s.academic_class.id, name: s.academic_class.name });
          secs.push({ id: s.id, name: s.name, class_id: s.academic_class.id });
        });

        const cls = Array.from(classMap.values());
        setClasses(cls);
        setSections(secs);
        if (cls.length > 0) setSelectedClass(cls[0].id);
        if (secs.length > 0) setSelectedSection(secs[0].id);
      })
      .catch(() => {});
  }, [showCreate]);

  useEffect(() => {
    if (scopeType !== 'section') return;
    if (filteredSections.length === 0) return;
    if (!filteredSections.some((section) => section.id === selectedSection)) {
      setSelectedSection(filteredSections[0].id);
    }
  }, [filteredSections, scopeType, selectedSection]);

  // ── Create exam ─────────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!examName.trim()) {
      Alert.alert('Validation', 'Please enter an exam name.');
      return;
    }
    if (scopeType === 'class' && !selectedClass) {
      Alert.alert('Validation', 'Please choose a class before creating the exam.');
      return;
    }
    if (scopeType === 'section' && !selectedSection) {
      Alert.alert('Validation', 'Please choose a section before creating the exam.');
      return;
    }
    const body =
      scopeType === 'class'
        ? { exam_name: examName.trim(), class_id: selectedClass }
        : { exam_name: examName.trim(), section_id: selectedSection };

    setCreating(true);
    try {
      await analyticsApi.createExam(body);
      setShowCreate(false);
      setExamName('');
      loadExams();
    } catch (err: any) {
      Alert.alert('Error', err.details ?? 'Failed to create exam.');
    } finally {
      setCreating(false);
    }
  }

  // ── Upload files ─────────────────────────────────────────────────────────────

  async function handleUpload() {
    if (!uploadExamId) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/pdf'],
        multiple: false,
      });

      if (result.canceled || result.assets.length === 0) return;

      const asset = result.assets[0];
      const formData = new FormData();

      const mimeType = asset.mimeType ?? 'application/octet-stream';
      const isCSV   = mimeType.includes('csv') || asset.name?.endsWith('.csv');
      const isExcel = mimeType.includes('excel') || mimeType.includes('spreadsheet');
      const isPDF   = mimeType.includes('pdf');

      const fieldName = isCSV ? 'csv_file' : isExcel ? 'excel_file' : isPDF ? 'pdf_file' : 'csv_file';

      await appendAssetToFormData(formData, fieldName, {
        ...asset,
        mimeType,
      }, asset.name ?? 'upload');

      setUploading(true);
      await analyticsApi.uploadExam(uploadExamId, formData);
      setUploadExamId(null);
      Alert.alert('Uploaded', 'File uploaded. Analytics is processing in the background.');
      loadExams();
    } catch (err: any) {
      Alert.alert('Upload Error', err.details ?? 'Failed to upload file.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownloadTemplate() {
    setDownloadingTemplate(true);
    try {
      const csv = await analyticsApi.getTemplate();
      const file = new File(Paths.cache, 'analytics_template.csv');
      file.create({ overwrite: true, intermediates: true });
      file.write(csv);

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Template Ready', 'CSV template downloaded to the app cache.');
        return;
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        UTI: 'public.comma-separated-values-text',
        dialogTitle: 'Analytics CSV Template',
      });
    } catch (err: any) {
      Alert.alert('Download Error', err.details ?? 'Failed to download template.');
    } finally {
      setDownloadingTemplate(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        center={<Text style={styles.headerTitle}>Exam Analytics</Text>}
        right={
          <View style={styles.headerActions}>
            {/* <Pressable
              onPress={() => router.push('/(tabs)/principal/analytics' as any)}
              style={styles.headerIconBtn}
            >
              <Ionicons name="grid-outline" size={22} color={colors.principal} />
            </Pressable> */}
            <Pressable
              onPress={handleDownloadTemplate}
              disabled={downloadingTemplate}
              style={styles.headerIconBtn}
            >
              {downloadingTemplate
                ? <ActivityIndicator size="small" color={colors.principal} />
                : <Ionicons name="download-outline" size={22} color={colors.principal} />}
            </Pressable>
            <Pressable onPress={() => setShowCreate(true)} style={styles.headerIconBtn}>
              <Ionicons name="add-circle-outline" size={24} color={colors.principal} />
            </Pressable>
          </View>
        }
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.principal} />
        </View>
      ) : exams.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="analytics-outline" size={48} color={colors.border} />
          <Text style={styles.emptyText}>No exams yet</Text>
          <Text style={styles.emptyHint}>Tap + to create your first exam</Text>
        </View>
      ) : (
        <FlatList
          data={exams}
          keyExtractor={e => e.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <ExamCard exam={item} onUpload={id => setUploadExamId(id)} />
          )}
          ListHeaderComponent={
            <View style={styles.listHeaderBlock}>
              <Text style={styles.sectionLabel}>
                {exams.length} exam{exams.length !== 1 ? 's' : ''}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Create Exam Sheet ── */}
      <BottomSheet visible={showCreate} onClose={() => setShowCreate(false)}>
        <Text style={styles.sheetTitle}>New Exam</Text>

        <Text style={styles.fieldLabel}>Exam Name</Text>
        <TextInput
          style={styles.textInput}
          value={examName}
          onChangeText={setExamName}
          placeholder="e.g. Unit Test 1"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.fieldLabel}>Scope</Text>
        <View style={styles.scopeRow}>
          {(['class', 'section'] as const).map(t => (
            <Pressable
              key={t}
              style={[styles.scopeBtn, scopeType === t && styles.scopeBtnActive]}
              onPress={() => setScopeType(t)}
            >
              <Text style={[styles.scopeBtnText, scopeType === t && styles.scopeBtnTextActive]}>
                {t === 'class' ? 'Whole Class' : 'One Section'}
              </Text>
            </Pressable>
          ))}
        </View>

        {scopeType === 'class' && classes.length > 0 && (
          <>
            <Text style={styles.fieldLabel}>Class</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={styles.chipRow}>
                {classes.map(c => (
                  <Pressable
                    key={c.id}
                    style={[styles.chip, selectedClass === c.id && styles.chipActive]}
                    onPress={() => setSelectedClass(c.id)}
                  >
                    <Text style={[styles.chipText, selectedClass === c.id && styles.chipTextActive]}>
                      {c.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        {scopeType === 'section' && (
          <>
            <Text style={styles.fieldLabel}>Class</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
              <View style={styles.chipRow}>
                {classes.map(c => (
                  <Pressable
                    key={c.id}
                    style={[styles.chip, selectedClass === c.id && styles.chipActive]}
                    onPress={() => setSelectedClass(c.id)}
                  >
                    <Text style={[styles.chipText, selectedClass === c.id && styles.chipTextActive]}>
                      {c.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>Section</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={styles.chipRow}>
                {filteredSections.map(s => (
                  <Pressable
                    key={s.id}
                    style={[styles.chip, selectedSection === s.id && styles.chipActive]}
                    onPress={() => setSelectedSection(s.id)}
                  >
                    <Text style={[styles.chipText, selectedSection === s.id && styles.chipTextActive]}>
                      Section {s.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        <View style={styles.sheetBtns}>
          <Pressable style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, (!examName.trim() || (scopeType === 'class' ? !selectedClass : !selectedSection) || creating) && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={creating || !examName.trim() || (scopeType === 'class' ? !selectedClass : !selectedSection)}
          >
            <Text style={styles.primaryBtnText}>{creating ? 'Creating…' : 'Create Exam'}</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* ── Upload Sheet ── */}
      <BottomSheet visible={!!uploadExamId} onClose={() => setUploadExamId(null)}>
        <Text style={styles.sheetTitle}>Upload Results</Text>
        <Text style={styles.uploadHint}>
          Select your CSV results file. Excel and PDF files are also accepted.
        </Text>

        <Pressable
          style={styles.templateBtn}
          onPress={handleDownloadTemplate}
          disabled={downloadingTemplate}
        >
          <Ionicons name="download-outline" size={16} color={colors.principal} />
          <Text style={styles.templateBtnText}>
            {downloadingTemplate ? 'Preparing Template...' : 'Download CSV Template'}
          </Text>
        </Pressable>

        <View style={styles.sheetBtns}>
          <Pressable style={styles.cancelBtn} onPress={() => setUploadExamId(null)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, uploading && { opacity: 0.6 }]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading
              ? <ActivityIndicator color={colors.surface} size="small" />
              : <Text style={styles.primaryBtnText}>Choose File</Text>}
          </Pressable>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  headerTitle:  { ...(typography.h3 as object), color: colors.textPrimary },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyText:    { ...(typography.h3 as object), color: colors.textSecondary },
  emptyHint:    { ...(typography.caption as object), color: colors.textMuted },
  listContent:  { padding: spacing.lg, paddingBottom: spacing.xxxl },
  listHeaderBlock: { marginBottom: spacing.sm, gap: spacing.sm },
  sectionLabel: { ...(typography.label as object), color: colors.textMuted, marginBottom: spacing.sm },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerIconBtn: { padding: 4, minWidth: 30, alignItems: 'center' },
  // Exam card
  examCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, padding: spacing.md,
  },
  examCardTappable: { borderColor: colors.principal + '44' },
  examCardTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  examName:         { ...(typography.body as object), fontWeight: '600', color: colors.textPrimary },
  examDate:         { ...(typography.caption as object), color: colors.textMuted, marginTop: 2 },
  examType:         { ...(typography.caption as object), color: colors.textSecondary, marginTop: 4 },
  examCardActions:  { marginTop: spacing.sm },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: 6, paddingHorizontal: spacing.md,
    borderRadius: 8, borderWidth: 1, borderColor: colors.principal,
  },
  uploadBtnText: { ...(typography.caption as object), fontWeight: '600', color: colors.principal },
  viewRow:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewText:      { ...(typography.caption as object), fontWeight: '600', color: colors.principal },

  // Status chip
  statusChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 3, paddingHorizontal: spacing.sm,
    borderRadius: 999,
  },
  statusChipText: { ...(typography.caption as object), fontWeight: '600' },

  // Sheet
  sheetTitle:  { ...(typography.h3 as object), fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.md },
  fieldLabel:  { ...(typography.caption as object), fontWeight: '500', color: colors.textSecondary, marginBottom: spacing.xs },
  textInput: {
    backgroundColor: '#F5F5F5', borderRadius: 10,
    padding: spacing.md, ...(typography.body as object),
    color: colors.textPrimary, marginBottom: spacing.md,
  },
  scopeRow:   { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  scopeBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  scopeBtnActive:     { backgroundColor: colors.principal, borderColor: colors.principal },
  scopeBtnText:       { ...(typography.body as object), fontWeight: '500', color: colors.textSecondary },
  scopeBtnTextActive: { color: colors.surface },
  chipRow:            { flexDirection: 'row', gap: spacing.xs },
  chip: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999,
    borderWidth: 0.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipActive:     { backgroundColor: colors.principal, borderColor: colors.principal },
  chipText:       { ...(typography.caption as object), fontWeight: '500', color: colors.textSecondary },
  chipTextActive: { color: colors.surface },
  uploadHint:     { ...(typography.body as object), color: colors.textSecondary, marginBottom: spacing.lg },
  templateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, height: 44, borderRadius: 10,
    borderWidth: 1, borderColor: colors.principal,
    marginBottom: spacing.md,
  },
  templateBtnText: { ...(typography.body as object), fontWeight: '600', color: colors.principal },
  sheetBtns:  { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.textSecondary },
  primaryBtn:    { flex: 1, height: 48, borderRadius: 10, backgroundColor: colors.principal, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.surface },
});
