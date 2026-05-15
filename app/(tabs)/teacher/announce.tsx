import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  teacherAnnouncementsApi,
  type Announcement,
} from "../../../services/teacher-announcements";
import { useTeacherStore } from "../../../store/teacher-store";
import type { UploadAsset } from "../../../services/upload";

const ACCENT = "#185FA5";

const AUDIENCE_COLORS: Record<string, string> = {
  SCHOOL: "#534AB7",
  CLASS: "#1D9E75",
  SECTION: "#185FA5",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function attachmentUrl(attachment: Announcement["attachments"][number]) {
  return attachment.url ?? attachment.file_url ?? "";
}

export default function AnnounceScreen() {
  const { selectedSection } = useTeacherStore();
  const isClassTeacher = selectedSection?.is_class_teacher ?? false;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<UploadAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [formError, setFormError] = useState("");

  async function fetchAnnouncements(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    setFetchError("");
    try {
      const data = await teacherAnnouncementsApi.getAll();
      setAnnouncements(data.results);
    } catch (err: any) {
      setFetchError(err.details ?? "Failed to load announcements.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchAnnouncements();
    }, []),
  );

  function openModal() {
    setEditingAnnouncement(null);
    setTitle("");
    setBody("");
    setSelectedFiles([]);
    setFormError("");
    setActionError("");
    setModalVisible(true);
  }

  function openEditModal(item: Announcement) {
    setEditingAnnouncement(item);
    setTitle(item.title);
    setBody(item.body);
    setSelectedFiles([]);
    setFormError("");
    setActionError("");
    setModalVisible(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalVisible(false);
  }

  async function pickFiles() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      setSelectedFiles((prev) => {
        const existing = new Set(prev.map((file) => `${file.name}:${file.uri}`));
        const next = result.assets
          .map((asset) => ({
            uri: asset.uri,
            name: asset.name,
            mimeType: asset.mimeType ?? null,
            file: asset.file,
          }))
          .filter((file) => !existing.has(`${file.name}:${file.uri}`));
        return [...prev, ...next];
      });
      setFormError("");
    } catch {
      setFormError("Could not open file picker. Please try again.");
    }
  }

  function removeFile(uri: string) {
    setSelectedFiles((prev) => prev.filter((file) => file.uri !== uri));
  }

  async function handleSubmit() {
    if (!selectedSection) return;
    const t = title.trim();
    const b = body.trim();
    if (!t) {
      setFormError("Title is required.");
      return;
    }
    if (!b) {
      setFormError("Message is required.");
      return;
    }

    setFormError("");
    setSubmitting(true);
    try {
      if (editingAnnouncement) {
        const updated = await teacherAnnouncementsApi.update(editingAnnouncement.id, {
          section_id: selectedSection.id,
          title: t,
          body: b,
          publish_now: true,
          attachments: selectedFiles,
        });
        const normalized = { ...updated, body: updated.body ?? b };
        setAnnouncements((prev) =>
          prev.map((item) => item.id === normalized.id ? normalized : item),
        );
      } else {
        const created = await teacherAnnouncementsApi.create({
          section_id: selectedSection.id,
          title: t,
          body: b,
          publish_now: true,
          attachments: selectedFiles,
        });
        setAnnouncements((prev) => [{ ...created, body: created.body ?? b }, ...prev]);
      }
      setModalVisible(false);
    } catch (err: any) {
      setFormError(
        err.details ?? `Failed to ${editingAnnouncement ? "update" : "post"} announcement. Please try again.`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDelete(item: Announcement) {
    Alert.alert(
      "Delete Announcement",
      "This announcement will be removed for this section.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteAnnouncement(item.id),
        },
      ],
    );
  }

  async function deleteAnnouncement(id: string) {
    setDeletingId(id);
    setActionError("");
    try {
      await teacherAnnouncementsApi.delete(id);
      setAnnouncements((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      setActionError(err.details ?? "Failed to delete announcement. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Announcements</Text>
          {selectedSection && (
            <Text style={styles.headerSub}>
              {selectedSection.class_name} – {selectedSection.section_name}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {!loading && (
            <Text style={styles.headerCount}>{announcements.length} total</Text>
          )}
          {isClassTeacher && (
            <Pressable
              style={({ pressed }) => [
                styles.addBtn,
                pressed && styles.addBtnPressed,
              ]}
              onPress={openModal}
              hitSlop={6}
            >
              <Ionicons name="add" size={20} color={ACCENT} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Not a class teacher banner */}
      {!isClassTeacher && (
        <View style={styles.lockedBanner}>
          <Ionicons name="lock-closed-outline" size={15} color="#D97706" />
          <Text style={styles.lockedText}>
            Only the class teacher can post announcements for this section.
          </Text>
        </View>
      )}

      {/* List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchAnnouncements(true);
            }}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
      >
        {/* Loading */}
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.loadingText}>Loading announcements…</Text>
          </View>
        )}

        {/* Error */}
        {!loading && !!fetchError && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={32} color="#DC2626" />
            <Text style={styles.errorText}>{fetchError}</Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() => fetchAnnouncements()}
            >
              <Text style={styles.retryBtnText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* Empty */}
        {!loading && !fetchError && announcements.length === 0 && (
          <View style={styles.centered}>
            <Ionicons name="megaphone-outline" size={52} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No announcements yet</Text>
            {isClassTeacher && (
              <Text style={styles.emptyHint}>
                Tap the + icon above to post your first announcement.
              </Text>
            )}
          </View>
        )}

        {!loading && !fetchError && !!actionError && (
          <View style={styles.inlineError}>
            <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
            <Text style={styles.inlineErrorText}>{actionError}</Text>
          </View>
        )}

        {/* Cards */}
        {!loading &&
          !fetchError &&
          announcements.map((item) => {
            const accentColor = AUDIENCE_COLORS[item.audience] ?? ACCENT;
            return (
              <View key={item.id} style={styles.card}>
                <View
                  style={[styles.cardStripe, { backgroundColor: accentColor }]}
                />
                <View style={styles.cardContent}>
                  <View style={styles.cardTopRow}>
                    <View
                      style={[
                        styles.audienceBadge,
                        { backgroundColor: accentColor + "18" },
                      ]}
                    >
                      <Text
                        style={[styles.audienceText, { color: accentColor }]}
                      >
                        {item.audience}
                      </Text>
                    </View>
                    <View style={styles.cardTopRight}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: item.published_at
                              ? "#1D9E75"
                              : "#D97706",
                          },
                        ]}
                      />
                      {isClassTeacher && (
                        <>
                          <Pressable
                            style={({ pressed }) => [styles.cardIconBtn, pressed && styles.cardIconBtnPressed]}
                            onPress={() => openEditModal(item)}
                            disabled={deletingId === item.id}
                            hitSlop={6}
                          >
                            <Ionicons name="create-outline" size={16} color={ACCENT} />
                          </Pressable>
                          <Pressable
                            style={({ pressed }) => [styles.cardIconBtn, pressed && styles.cardIconBtnPressed]}
                            onPress={() => confirmDelete(item)}
                            disabled={deletingId === item.id}
                            hitSlop={6}
                          >
                            {deletingId === item.id ? (
                              <ActivityIndicator size="small" color="#DC2626" />
                            ) : (
                              <Ionicons name="trash-outline" size={16} color="#DC2626" />
                            )}
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>

                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardBody} numberOfLines={3}>
                    {item.body ?? ""}
                  </Text>

                  <View style={styles.cardFooter}>
                    <Ionicons name="person-outline" size={11} color="#AAAAAA" />
                    <Text style={styles.cardMeta}>
                      {item.author_role
                        ? item.author_role.charAt(0) +
                          item.author_role.slice(1).toLowerCase()
                        : "Teacher"}
                      {item.published_at
                        ? ` · ${formatDate(item.published_at)}`
                        : " · Draft"}
                    </Text>
                  </View>

                  {item.attachments.length > 0 && (
                    <View style={styles.attachList}>
                      {item.attachments.map((attachment) => {
                        const url = attachmentUrl(attachment);
                        return (
                          <Pressable
                            key={`${item.id}-${attachment.id ?? attachment.filename}`}
                            style={({ pressed }) => [styles.attachChip, pressed && styles.attachChipPressed]}
                            disabled={!url}
                            onPress={() => url && Linking.openURL(url)}
                          >
                            <Ionicons name="attach-outline" size={13} color={ACCENT} />
                            <Text style={styles.attachText} numberOfLines={1}>
                              {attachment.filename}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
      </ScrollView>

      {/* Create modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />

          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {editingAnnouncement ? "Edit Announcement" : "New Announcement"}
              </Text>
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
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={(v) => {
                  setTitle(v);
                  setFormError("");
                }}
                placeholder="e.g. Parent-Teacher Meeting"
                placeholderTextColor="#AAAAAA"
                returnKeyType="next"
                maxLength={255}
              />

              <Text style={styles.fieldLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={body}
                onChangeText={(v) => {
                  setBody(v);
                  setFormError("");
                }}
                placeholder="Write your announcement here…"
                placeholderTextColor="#AAAAAA"
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.fieldLabel}>Attachments</Text>
              <Pressable
                style={({ pressed }) => [styles.attachBtn, pressed && styles.attachBtnPressed]}
                onPress={pickFiles}
              >
                <Ionicons name="attach-outline" size={18} color={ACCENT} />
                <Text style={styles.attachBtnText}>
                  {selectedFiles.length ? "Add more files" : editingAnnouncement ? "Append attachments" : "Add attachments"}
                </Text>
              </Pressable>

              {selectedFiles.length > 0 && (
                <View style={styles.selectedFileList}>
                  {selectedFiles.map((file) => (
                    <View key={file.uri} style={styles.selectedFileRow}>
                      <View style={styles.selectedFileIcon}>
                        <Ionicons name="document-outline" size={16} color={ACCENT} />
                      </View>
                      <Text style={styles.selectedFileName} numberOfLines={1}>{file.name}</Text>
                      <Pressable onPress={() => removeFile(file.uri)} hitSlop={8}>
                        <Ionicons name="close-circle" size={18} color="#AAAAAA" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {editingAnnouncement && editingAnnouncement.attachments.length > 0 && (
                <Text style={styles.existingAttachHint}>
                  New files will be appended to the existing {editingAnnouncement.attachments.length} attachment
                  {editingAnnouncement.attachments.length > 1 ? "s" : ""}.
                </Text>
              )}

              {!!formError && (
                <View style={styles.errorRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={14}
                    color="#DC2626"
                  />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && styles.submitBtnPressed,
                  submitting && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="megaphone-outline"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.submitBtnText}>
                      {editingAnnouncement ? "Save Changes" : "Post Announcement"}
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
  safe: { flex: 1, backgroundColor: "#F4F4F8" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111111" },
  headerSub: { fontSize: 12, color: "#AAAAAA", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerCount: { fontSize: 12, color: "#AAAAAA" },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EBF2FB",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnPressed: { opacity: 0.7 },

  lockedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  lockedText: { flex: 1, fontSize: 13, color: "#92400E", lineHeight: 18 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },

  centered: { alignItems: "center", paddingVertical: 60, gap: 10 },
  loadingText: { fontSize: 14, color: "#888888" },

  errorCard: {
    backgroundColor: "#FFF5F5",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  errorText: { fontSize: 13, color: "#888888", textAlign: "center" },
  retryBtn: {
    marginTop: 4,
    backgroundColor: "#DC2626",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  retryBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  inlineError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FFCDD2",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  inlineErrorText: { flex: 1, fontSize: 13, color: "#DC2626", lineHeight: 18 },

  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#444444" },
  emptyHint: {
    fontSize: 13,
    color: "#AAAAAA",
    textAlign: "center",
    lineHeight: 20,
  },

  // Card
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#EEEEEE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardStripe: { width: 4 },
  cardContent: { flex: 1, padding: 14 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTopRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconBtnPressed: { opacity: 0.68 },
  audienceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  audienceText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 5,
  },
  cardBody: {
    fontSize: 13,
    color: "#555555",
    lineHeight: 19,
    marginBottom: 10,
  },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMeta: { fontSize: 11, color: "#AAAAAA" },
  attachList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  attachChip: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EBF2FB",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  attachChipPressed: { opacity: 0.72 },
  attachText: { maxWidth: 210, fontSize: 11, color: ACCENT, fontWeight: "600" },

  // Modal
  modalWrap: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: "88%",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#DDDDDD",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: "#111111" },
  sheetSub: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: "500",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sheetScroll: { paddingHorizontal: 20 },

  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666666",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111111",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputMulti: { minHeight: 110, paddingTop: 12 },

  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#D5E7F8",
    backgroundColor: "#F3F8FE",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  attachBtnPressed: { opacity: 0.75 },
  attachBtnText: { color: ACCENT, fontSize: 14, fontWeight: "700" },
  selectedFileList: { gap: 8, marginBottom: 14 },
  selectedFileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EEEEEE",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedFileIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#EBF2FB",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedFileName: { flex: 1, color: "#333333", fontSize: 13, fontWeight: "600" },
  existingAttachHint: {
    color: "#888888",
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
    marginBottom: 14,
  },

  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 32,
  },
  submitBtnPressed: { opacity: 0.85 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
});
