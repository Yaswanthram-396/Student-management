import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Modal, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { typography } from '../../../constants/typography';
import { HeaderBar, ToggleSwitch, SegmentedControl } from '../../shared';

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
  const [attFreq, setAttFreq]       = useState<'once' | 'twice'>('twice');
  const [whatsapp, setWhatsapp]     = useState(true);
  const [parentQuery, setParentQuery] = useState(true);
  const [showLogout, setShowLogout] = useState(false);

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
            <Text style={styles.schoolName}>Delhi Public School</Text>
            <Text style={styles.schoolUrl}>dps.schoolapp.in</Text>
          </View>
          <Pressable style={styles.editBtn}>
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
              <Pressable style={styles.dialogLogoutBtn}>
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
  schoolUrl: { ...(typography.caption as object), color: colors.textMuted, fontFamily: 'monospace', marginTop: spacing.xs },
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
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: colors.border },
  rowLabel: { ...(typography.body as object), color: colors.textPrimary, flex: 1 },
  rowValue: { ...(typography.body as object), color: colors.textMuted },
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
  dialogBtns: { flexDirection: 'row', gap: spacing.md },
  dialogCancelBtn: {
    flex: 1, height: 48, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dialogCancelText: { ...(typography.h3 as object), fontWeight: '500', color: colors.textSecondary },
  dialogLogoutBtn:  { flex: 1, height: 48, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  dialogLogoutText: { ...(typography.h3 as object), fontWeight: '500', color: colors.surface },
});
