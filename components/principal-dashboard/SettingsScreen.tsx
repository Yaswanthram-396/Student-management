import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Modal, TextInput, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { HeaderBar, ToggleSwitch, SegmentedControl, BottomSheet } from '../shared';

// ─── Local sub-components ─────────────────────────────────────────────────────

function SettingsSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{label}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function SettingsRow({
  label, right, noBorder,
}: {
  label: string;
  right: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <View style={[styles.row, !noBorder && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      {right}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function SettingsScreen() {
  const [attFreq, setAttFreq]         = useState<'once' | 'twice'>('twice');
  const [whatsapp, setWhatsapp]       = useState(true);
  const [parentQuery, setParentQuery] = useState(true);
  const [showLogout, setShowLogout]   = useState(false);

  // School edit
  const [showEditSchool, setShowEditSchool] = useState(false);
  const [schoolName, setSchoolName]         = useState('Delhi Public School');
  const [schoolUrl, setSchoolUrl]           = useState('dps.schoolapp.in');

  // Student onboarding
  const [showStudentSheet, setShowStudentSheet] = useState(false);
  const [studentName, setStudentName]           = useState('');
  const [studentClass, setStudentClass]         = useState('');
  const [studentSection, setStudentSection]     = useState('');
  const [parentName, setParentName]             = useState('');
  const [parentMobile, setParentMobile]         = useState('');
  const [addingStudent, setAddingStudent]       = useState(false);
  const [studentSuccess, setStudentSuccess]     = useState(false);

  // Teacher onboarding
  const [showTeacherSheet, setShowTeacherSheet] = useState(false);
  const [teacherName, setTeacherName]           = useState('');
  const [teacherMobile, setTeacherMobile]       = useState('');
  const [teacherSubject, setTeacherSubject]     = useState('');
  const [teacherClass, setTeacherClass]         = useState('');
  const [teacherSection, setTeacherSection]     = useState('');
  const [addingTeacher, setAddingTeacher]       = useState(false);
  const [teacherSuccess, setTeacherSuccess]     = useState(false);

  function handleAddStudent() {
    setAddingStudent(true);
    setTimeout(() => {
      setAddingStudent(false);
      setStudentSuccess(true);
      setTimeout(() => {
        setStudentSuccess(false);
        setStudentName(''); setStudentClass(''); setStudentSection('');
        setParentName(''); setParentMobile('');
        setShowStudentSheet(false);
      }, 1500);
    }, 700);
  }

  function handleAddTeacher() {
    setAddingTeacher(true);
    setTimeout(() => {
      setAddingTeacher(false);
      setTeacherSuccess(true);
      setTimeout(() => {
        setTeacherSuccess(false);
        setTeacherName(''); setTeacherMobile(''); setTeacherSubject('');
        setTeacherClass(''); setTeacherSection('');
        setShowTeacherSheet(false);
      }, 1500);
    }, 700);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar center={<Text style={styles.headerTitle}>School Settings</Text>} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* School info card */}
        <View style={styles.schoolCard}>
          <View style={styles.schoolInfo}>
            <Text style={styles.schoolName}>{schoolName}</Text>
            <Text style={styles.schoolUrl}>{schoolUrl}</Text>
          </View>
          <Pressable style={styles.editBtn} onPress={() => setShowEditSchool(true)}>
            <Text style={styles.editBtnText}>Edit</Text>
          </Pressable>
        </View>

        {/* Attendance */}
        <SettingsSection label="Attendance">
          <View style={[styles.row, styles.rowBorder, { flexDirection: 'column', alignItems: 'flex-start' }]}>
            <Text style={[styles.rowLabel, { marginBottom: spacing.sm }]}>
              Attendance Frequency
            </Text>
            <SegmentedControl
              options={['Once a day', 'Twice a day']}
              activeIndex={attFreq === 'once' ? 0 : 1}
              onChange={i => setAttFreq(i === 0 ? 'once' : 'twice')}
              accentColor={colors.principal}
            />
          </View>
          <SettingsRow
            label="Absent WhatsApp Alert"
            noBorder
            right={
              <ToggleSwitch
                value={whatsapp}
                onChange={() => setWhatsapp(v => !v)}
                accentColor={colors.principal}
              />
            }
          />
        </SettingsSection>

        {/* Communication */}
        <SettingsSection label="Communication">
          <SettingsRow
            label="Parent Query to Teacher"
            noBorder
            right={
              <ToggleSwitch
                value={parentQuery}
                onChange={() => setParentQuery(v => !v)}
                accentColor={colors.principal}
              />
            }
          />
        </SettingsSection>

        {/* Manage School */}
        <SettingsSection label="Manage School">
          <Pressable
            style={[styles.row, styles.rowBorder]}
            onPress={() => setShowStudentSheet(true)}
          >
            <View style={styles.rowIconLabel}>
              <Ionicons name="person-add-outline" size={16} color={colors.principal} style={{ marginRight: spacing.sm }} />
              <Text style={styles.rowLabel}>Student Onboarding</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
          <Pressable
            style={styles.row}
            onPress={() => setShowTeacherSheet(true)}
          >
            <View style={styles.rowIconLabel}>
              <Ionicons name="person-outline" size={16} color={colors.principal} style={{ marginRight: spacing.sm }} />
              <Text style={styles.rowLabel}>Add Teacher</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </SettingsSection>

        {/* Academic */}
        <SettingsSection label="Academic">
          <SettingsRow
            label="Current Academic Year"
            right={<Text style={styles.rowValue}>2025 – 2026</Text>}
          />
          <SettingsRow
            label="Term Structure"
            noBorder
            right={<Text style={styles.rowValue}>2 Terms</Text>}
          />
        </SettingsSection>

        {/* Account */}
        <SettingsSection label="Account">
          <View style={[styles.row, styles.rowBorder, { flexDirection: 'column', alignItems: 'flex-start' }]}>
            <Text style={styles.rowLabel}>App Coordinator</Text>
            <Text style={[styles.rowValue, { marginTop: spacing.xs }]}>rekha@dps.in</Text>
          </View>
          <View style={[styles.row, { paddingBottom: spacing.md }]}>
            <Text style={[styles.rowLabel, { fontWeight: '500' }]}>Mrs. Rekha Nair</Text>
          </View>
        </SettingsSection>

        {/* Logout */}
        <Pressable style={styles.logoutBtn} onPress={() => setShowLogout(true)}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </Pressable>
      </ScrollView>

      {/* Edit School BottomSheet */}
      <BottomSheet visible={showEditSchool} onClose={() => setShowEditSchool(false)}>
        <Text style={styles.sheetTitle}>Edit School Info</Text>

        <Text style={styles.sheetFieldLabel}>School Name</Text>
        <TextInput
          style={styles.textInput}
          value={schoolName}
          onChangeText={setSchoolName}
          placeholder="School name"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.sheetFieldLabel}>School URL</Text>
        <TextInput
          style={styles.textInput}
          value={schoolUrl}
          onChangeText={setSchoolUrl}
          placeholder="e.g. dps.schoolapp.in"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />

        <View style={styles.sheetBtns}>
          <Pressable style={styles.cancelBtn} onPress={() => setShowEditSchool(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.saveBtn} onPress={() => setShowEditSchool(false)}>
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* Student Onboarding BottomSheet */}
      <BottomSheet visible={showStudentSheet} onClose={() => setShowStudentSheet(false)}>
        <Text style={styles.sheetTitle}>Bulk Upload Students</Text>
        <Text style={styles.sheetSubtext}>
          Upload a CSV with columns: Name, Class, Section, Parent Name, Parent Mobile
        </Text>

        <Pressable>
          <Text style={styles.downloadLink}>Download Sample CSV</Text>
        </Pressable>

        <Pressable style={styles.uploadBtn}>
          <Ionicons name="cloud-upload-outline" size={18} color={colors.surface} style={{ marginRight: spacing.sm }} />
          <Text style={styles.uploadBtnText}>Upload CSV File</Text>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.sheetSubheading}>Add Single Student</Text>

        <Text style={styles.sheetFieldLabel}>Student Name</Text>
        <TextInput style={styles.textInput} value={studentName} onChangeText={setStudentName}
          placeholder="e.g. Riya Sharma" placeholderTextColor={colors.textMuted} />

        <Text style={styles.sheetFieldLabel}>Class</Text>
        <TextInput style={styles.textInput} value={studentClass} onChangeText={setStudentClass}
          placeholder="e.g. Class 7" placeholderTextColor={colors.textMuted} />

        <Text style={styles.sheetFieldLabel}>Section</Text>
        <TextInput style={styles.textInput} value={studentSection} onChangeText={setStudentSection}
          placeholder="e.g. B" placeholderTextColor={colors.textMuted} />

        <Text style={styles.sheetFieldLabel}>Parent Name</Text>
        <TextInput style={styles.textInput} value={parentName} onChangeText={setParentName}
          placeholder="e.g. Mr. Suresh Sharma" placeholderTextColor={colors.textMuted} />

        <Text style={styles.sheetFieldLabel}>Parent Mobile</Text>
        <TextInput style={styles.textInput} value={parentMobile} onChangeText={setParentMobile}
          placeholder="e.g. 9876543210" placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad" />

        {studentSuccess ? (
          <View style={styles.successRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.successText}>Student added successfully</Text>
          </View>
        ) : (
          <Pressable
            style={[styles.saveBtn, addingStudent && { backgroundColor: colors.success }]}
            onPress={handleAddStudent}
          >
            <Text style={styles.saveBtnText}>{addingStudent ? 'Adding...' : 'Add Student'}</Text>
          </Pressable>
        )}
      </BottomSheet>

      {/* Teacher Onboarding BottomSheet */}
      <BottomSheet visible={showTeacherSheet} onClose={() => setShowTeacherSheet(false)}>
        <Text style={styles.sheetTitle}>Add Teacher</Text>

        <Text style={styles.sheetFieldLabel}>Teacher Name</Text>
        <TextInput style={styles.textInput} value={teacherName} onChangeText={setTeacherName}
          placeholder="e.g. Mrs. Sunita Rao" placeholderTextColor={colors.textMuted} />

        <Text style={styles.sheetFieldLabel}>Mobile Number</Text>
        <TextInput style={styles.textInput} value={teacherMobile} onChangeText={setTeacherMobile}
          placeholder="e.g. 9876543210" placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad" />

        <Text style={styles.sheetFieldLabel}>Subject</Text>
        <TextInput style={styles.textInput} value={teacherSubject} onChangeText={setTeacherSubject}
          placeholder="e.g. Mathematics" placeholderTextColor={colors.textMuted} />

        <Text style={styles.sheetFieldLabel}>Assigned Class</Text>
        <TextInput style={styles.textInput} value={teacherClass} onChangeText={setTeacherClass}
          placeholder="e.g. Class 7" placeholderTextColor={colors.textMuted} />

        <Text style={styles.sheetFieldLabel}>Assigned Section</Text>
        <TextInput style={styles.textInput} value={teacherSection} onChangeText={setTeacherSection}
          placeholder="e.g. B" placeholderTextColor={colors.textMuted} />

        {teacherSuccess ? (
          <View style={styles.successRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.successText}>Teacher added successfully</Text>
          </View>
        ) : (
          <Pressable
            style={[styles.saveBtn, addingTeacher && { backgroundColor: colors.success }]}
            onPress={handleAddTeacher}
          >
            <Text style={styles.saveBtnText}>{addingTeacher ? 'Adding...' : 'Add Teacher'}</Text>
          </Pressable>
        )}
      </BottomSheet>

      {/* Logout confirm dialog */}
      <Modal
        visible={showLogout}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogout(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Logout</Text>
            <Text style={styles.dialogBody}>Are you sure you want to logout?</Text>
            <View style={styles.dialogBtns}>
              <Pressable
                style={styles.dialogCancelBtn}
                onPress={() => setShowLogout(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.dialogLogoutBtn}
                onPress={() => { setShowLogout(false); router.replace('/'); }}
              >
                <Text style={styles.dialogLogoutText}>Logout</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  scrollContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  // School card
  schoolCard: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, padding: spacing.lg,
  },
  schoolInfo: { flex: 1 },
  schoolName: { ...(typography.h2 as object), fontWeight: '600', color: colors.textPrimary },
  schoolUrl:  { ...(typography.caption as object), color: colors.textMuted, fontFamily: 'monospace', marginTop: spacing.xs },
  editBtn: {
    borderWidth: 1.5, borderColor: colors.principal,
    borderRadius: 8, paddingVertical: 5, paddingHorizontal: 12,
  },
  editBtnText: { ...(typography.caption as object), fontWeight: '500', color: colors.principal },
  // Settings section
  section: {
    backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, overflow: 'hidden',
  },
  sectionHeader: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  sectionHeaderText: { ...(typography.label as object), color: colors.textMuted },
  sectionBody: { paddingHorizontal: spacing.lg },
  // Settings row
  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  rowBorder:    { borderBottomWidth: 0.5, borderBottomColor: colors.border },
  rowLabel:     { ...(typography.body as object), color: colors.textPrimary, flex: 1 },
  rowValue:     { ...(typography.body as object), color: colors.textMuted },
  rowIconLabel: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  // Logout
  logoutBtn: {
    height: 48, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.sm,
  },
  logoutBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.danger },
  // Dialog
  dialogOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
    padding: spacing.xxl,
  },
  dialogCard: {
    backgroundColor: colors.surface,
    borderRadius: 20, padding: spacing.xxl, width: '100%',
  },
  dialogTitle: {
    ...(typography.h2 as object), fontWeight: '600',
    color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm,
  },
  dialogBody: {
    ...(typography.body as object), color: colors.textSecondary,
    textAlign: 'center', marginBottom: spacing.xl,
  },
  dialogBtns:      { flexDirection: 'row', gap: spacing.md },
  dialogCancelBtn: {
    flex: 1, height: 48, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dialogCancelText:  { ...(typography.h3 as object), fontWeight: '500', color: colors.textSecondary },
  dialogLogoutBtn:   { flex: 1, height: 48, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  dialogLogoutText:  { ...(typography.h3 as object), fontWeight: '500', color: colors.surface },
  // Shared sheet styles
  sheetTitle:      { ...(typography.h3 as object), fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.xs },
  sheetSubtext:    { ...(typography.caption as object), color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 18 },
  sheetSubheading: { ...(typography.body as object), fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  sheetFieldLabel: {
    ...(typography.caption as object), fontWeight: '500',
    color: colors.textSecondary, marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: '#F5F5F5', borderRadius: 10,
    padding: spacing.md, ...(typography.body as object),
    color: colors.textPrimary, marginBottom: spacing.md,
  },
  downloadLink: {
    ...(typography.body as object), color: colors.principal,
    fontWeight: '500', textDecorationLine: 'underline',
    marginBottom: spacing.md,
  },
  uploadBtn: {
    flexDirection: 'row', height: 48, borderRadius: 10,
    backgroundColor: colors.principal,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  uploadBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.surface },
  dividerRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.sm },
  dividerLine:   { flex: 1, height: 0.5, backgroundColor: colors.border },
  dividerText:   { ...(typography.caption as object), color: colors.textMuted, fontWeight: '500' },
  sheetBtns:     { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.textSecondary },
  saveBtn:       { height: 48, borderRadius: 10, backgroundColor: colors.principal, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  saveBtnText:   { ...(typography.h3 as object), fontWeight: '500', color: colors.surface },
  successRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  successText:   { ...(typography.body as object), color: colors.success, fontWeight: '500' },
});
