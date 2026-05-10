import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  teacherAnnouncementsApi,
  type Announcement,
} from '../../../services/teacher-announcements';
import { useTeacherStore } from '../../../store/teacher-store';

const ACCENT = '#185FA5';

export default function AnnounceScreen() {
  const { selectedSection } = useTeacherStore();
  const isClassTeacher = selectedSection?.is_class_teacher ?? false;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [publishNow, setPublishNow] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  function openModal() {
    setTitle('');
    setBody('');
    setPublishNow(true);
    setFormError('');
    setModalVisible(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalVisible(false);
  }

  async function handlePost() {
    if (!selectedSection) return;
    const t = title.trim();
    const b = body.trim();
    if (!t) { setFormError('Title is required.'); return; }
    if (!b) { setFormError('Body is required.'); return; }

    setFormError('');
    setSubmitting(true);
    try {
      const created = await teacherAnnouncementsApi.create({
        section_id: selectedSection.id,
        title: t,
        body: b,
        publish_now: publishNow,
      });
      setAnnouncements((prev) => [created, ...prev]);
      setModalVisible(false);
    } catch (err: any) {
      setFormError(err.details ?? 'Failed to post announcement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Announcements</Text>
        {selectedSection && (
          <Text style={styles.headerSub}>
            {selectedSection.class_name} – {selectedSection.section_name}
          </Text>
        )}
      </View>

      {/* Not a class teacher banner */}
      {!isClassTeacher && (
        <View style={styles.lockedBanner}>
          <Ionicons name="lock-closed-outline" size={16} color="#D97706" />
          <Text style={styles.lockedText}>
            Only the class teacher can post announcements for this section.
          </Text>
        </View>
      )}

      {/* Announcement list */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {announcements.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="megaphone-outline" size={52} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No announcements yet</Text>
            {isClassTeacher && (
              <Text style={styles.emptyHint}>
                Tap the button below to post your first announcement.
              </Text>
            )}
          </View>
        ) : (
          announcements.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Ionicons name="megaphone" size={16} color={ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardMeta}>
                    {item.published_at
                      ? `Published · ${new Date(item.published_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : 'Draft · Not published'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: item.published_at ? '#1D9E75' : '#D97706' },
                  ]}
                />
              </View>
              <Text style={styles.cardBody}>{item.body}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* FAB — only for class teacher */}
      {isClassTeacher && (
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={openModal}
        >
          <Ionicons name="add" size={26} color="#FFFFFF" />
          <Text style={styles.fabText}>New Announcement</Text>
        </Pressable>
      )}

      {/* Create announcement modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />

          <View style={styles.sheet}>
            {/* Sheet header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Announcement</Text>
              <Pressable onPress={closeModal} hitSlop={8}>
                <Ionicons name="close" size={22} color="#666666" />
              </Pressable>
            </View>

            <Text style={styles.sheetSub}>
              {selectedSection?.class_name} – {selectedSection?.section_name}
            </Text>

            <ScrollView
              style={styles.sheetScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Title */}
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={(t) => { setTitle(t); setFormError(''); }}
                placeholder="e.g. Parent-Teacher Meeting"
                placeholderTextColor="#AAAAAA"
                returnKeyType="next"
                maxLength={255}
              />

              {/* Body */}
              <Text style={styles.fieldLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={body}
                onChangeText={(t) => { setBody(t); setFormError(''); }}
                placeholder="Write your announcement here…"
                placeholderTextColor="#AAAAAA"
                multiline
                textAlignVertical="top"
              />

              {/* Publish now toggle */}
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Publish immediately</Text>
                  <Text style={styles.toggleHint}>
                    {publishNow ? 'Will be visible to parents now' : 'Saved as draft'}
                  </Text>
                </View>
                <Switch
                  value={publishNow}
                  onValueChange={setPublishNow}
                  trackColor={{ false: '#DDDDDD', true: '#93C5FD' }}
                  thumbColor={publishNow ? ACCENT : '#FFFFFF'}
                />
              </View>

              {/* Error */}
              {!!formError && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              )}

              {/* Submit */}
              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && styles.submitBtnPressed,
                  submitting && styles.submitBtnDisabled,
                ]}
                onPress={handlePost}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="megaphone-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>
                      {publishNow ? 'Post Announcement' : 'Save as Draft'}
                    </Text>
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111111' },
  headerSub: { fontSize: 12, color: '#AAAAAA', marginTop: 2 },

  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  lockedText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#444444' },
  emptyHint: { fontSize: 13, color: '#AAAAAA', textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EBF2FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111111', marginBottom: 2 },
  cardMeta: { fontSize: 11, color: '#AAAAAA' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  cardBody: { fontSize: 14, color: '#444444', lineHeight: 20 },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  fabPressed: { opacity: 0.85 },
  fabText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  // Modal / sheet
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#111111' },
  sheetSub: { fontSize: 12, color: ACCENT, fontWeight: '500', paddingHorizontal: 20, marginBottom: 16 },
  sheetScroll: { paddingHorizontal: 20 },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111111',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputMulti: { minHeight: 110, paddingTop: 12 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#111111', marginBottom: 2 },
  toggleHint: { fontSize: 12, color: '#AAAAAA' },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  errorText: { fontSize: 13, color: '#DC2626', flex: 1 },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 32,
  },
  submitBtnPressed: { opacity: 0.85 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
