import React, { useState } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { typography } from '../../../constants/typography';
import { HeaderBar, BottomSheet } from '../../shared';

type Material = { id: string; type: string; title: string; subject: string; date: string };

const MATERIALS: Material[] = [
  { id: '1', type: 'PDF',   title: 'Chapter 6 – Light and Reflection.pdf',        subject: 'Science',       date: '4 May 2026'  },
  { id: '2', type: 'PDF',   title: 'Algebra Formulas Sheet.pdf',                   subject: 'Math',          date: '3 May 2026'  },
  { id: '3', type: 'Image', title: 'Digestive System Diagram.jpg',                 subject: 'Science',       date: '2 May 2026'  },
  { id: '4', type: 'PDF',   title: 'Grammar Rules – Tenses.pdf',                   subject: 'English',       date: '1 May 2026'  },
  { id: '5', type: 'PDF',   title: 'Chapter 5 Notes – The French Revolution.pdf',  subject: 'Social Studies',date: '30 Apr 2026' },
];

const SUBJECT_FILTERS = ['All', 'Math', 'Science', 'English', 'Hindi', 'Social Studies'];
const SUBJECTS        = ['Math', 'Science', 'English', 'Hindi', 'Social Studies'];
const FILE_TYPES      = ['PDF', 'Image', 'Video'];

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

function MaterialRow({ item }: { item: Material }) {
  return (
    <View style={styles.materialCard}>
      <FileTypeBox type={item.type} />
      <View style={styles.materialInfo}>
        <Text style={styles.materialTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.materialMeta}>{item.subject} · {item.date}</Text>
      </View>
      <Ionicons name="download-outline" size={18} color={colors.textMuted} />
    </View>
  );
}

export function ContentScreen() {
  const [activeSubject, setActiveSubject] = useState('All');
  const [showSheet, setShowSheet]         = useState(false);
  const [uploaded, setUploaded]           = useState(false);
  const [uploadSubject, setUploadSubject] = useState('Math');
  const [fileType, setFileType]           = useState('PDF');
  const [matTitle, setMatTitle]           = useState('');

  const filtered = activeSubject === 'All'
    ? MATERIALS
    : MATERIALS.filter(m => m.subject === activeSubject);

  function handleUpload() {
    setUploaded(true);
    setTimeout(() => {
      setUploaded(false);
      setShowSheet(false);
      setMatTitle('');
    }, 1000);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        center={<Text style={styles.headerTitle}>Study Materials</Text>}
        right={
          <Pressable onPress={() => setShowSheet(true)}>
            <Ionicons name="add-circle-outline" size={24} color={colors.teacher} />
          </Pressable>
        }
      />

      {/* Subject filter pills */}
      <View style={styles.filterBar}>
        <FlatList
          data={SUBJECT_FILTERS}
          keyExtractor={item => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.filterPill, activeSubject === item && styles.filterPillActive]}
              onPress={() => setActiveSubject(item)}
            >
              <Text style={[styles.filterLabel, activeSubject === item && styles.filterLabelActive]}>
                {item}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Materials list */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <MaterialRow item={item} />}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        showsVerticalScrollIndicator={false}
      />

      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)}>
        <Text style={styles.sheetTitle}>Upload Material</Text>

        <Text style={styles.fieldLabel}>Subject</Text>
        <View style={styles.optionRow}>
          {SUBJECTS.map(s => (
            <Pressable
              key={s}
              style={[styles.optionPill, uploadSubject === s && styles.optionPillActive]}
              onPress={() => setUploadSubject(s)}
            >
              <Text style={[styles.optionText, uploadSubject === s && styles.optionTextActive]}>
                {s}
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

        <Text style={styles.fieldLabel}>File Type</Text>
        <View style={styles.optionRow}>
          {FILE_TYPES.map(t => (
            <Pressable
              key={t}
              style={[styles.optionPill, fileType === t && styles.optionPillActive]}
              onPress={() => setFileType(t)}
            >
              <Text style={[styles.optionText, fileType === t && styles.optionTextActive]}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Upload Date</Text>
        <View style={styles.staticField}>
          <Text style={styles.staticFieldText}>5 May 2026</Text>
        </View>

        <View style={styles.sheetBtns}>
          <Pressable style={styles.cancelBtn} onPress={() => setShowSheet(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.uploadBtn, uploaded && styles.uploadBtnDone]}
            onPress={handleUpload}
          >
            <Text style={styles.uploadBtnText}>{uploaded ? 'Uploaded!' : 'Upload'}</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
