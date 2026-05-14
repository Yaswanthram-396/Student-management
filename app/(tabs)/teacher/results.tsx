import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  analyticsApi,
  type AnalyticsStatus,
  type ExamSummary,
} from "../../../services/analytics";
import { useTeacherStore } from "../../../store/teacher-store";

const ACCENT = "#185FA5";

const STATUS_CONFIG: Record<
  AnalyticsStatus,
  { color: string; bg: string; label: string }
> = {
  DONE: { color: "#1D9E75", bg: "#E1F5EE", label: "Results Ready" },
  RUNNING: { color: "#D97706", bg: "#FEF3C7", label: "Processing" },
  PENDING: { color: "#D97706", bg: "#FEF3C7", label: "Pending" },
  CREATED: { color: "#185FA5", bg: "#EBF2FB", label: "Created" },
  FAILED: { color: "#DC2626", bg: "#FEE2E2", label: "Failed" },
};

function formatDate(d: string | null) {
  if (!d) return "Date not set";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ResultsScreen() {
  const { selectedSection } = useTeacherStore();
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function fetchExams(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    setError("");
    try {
      const data = await analyticsApi.getExams();
      setExams(data.exams ?? []);
    } catch (err: any) {
      setError(err.details ?? "Failed to load exams.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchExams();
    }, []),
  );

  const doneExams = exams.filter((e) => e.analytics_status === "DONE");
  const otherExams = exams.filter((e) => e.analytics_status !== "DONE");

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Results</Text>
          {selectedSection && (
            <Text style={styles.headerSub}>
              {selectedSection.class_name} – {selectedSection.section_name}
            </Text>
          )}
        </View>
        {!loading && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{doneExams.length} ready</Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchExams(true);
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
            <Text style={styles.stateText}>Loading exams…</Text>
          </View>
        )}

        {/* Error */}
        {!loading && !!error && (
          <View style={styles.errorCard}>
            <View style={styles.errorIconWrap}>
              <Ionicons name="alert-circle-outline" size={28} color="#DC2626" />
            </View>
            <Text style={styles.errorTitle}>Couldn't load results</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => fetchExams()}>
              <Ionicons name="refresh-outline" size={15} color="#FFFFFF" />
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* Empty */}
        {!loading && !error && exams.length === 0 && (
          <View style={styles.centered}>
            <View style={styles.emptyIcon}>
              <Ionicons name="school-outline" size={36} color="#CCCCCC" />
            </View>
            <Text style={styles.emptyTitle}>No exams found</Text>
            <Text style={styles.emptyBody}>
              Exams are uploaded by the school administration. Check back later.
            </Text>
          </View>
        )}

        {/* Ready exams */}
        {!loading && !error && doneExams.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Results Available</Text>
            {doneExams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} />
            ))}
          </>
        )}

        {/* Other exams */}
        {!loading && !error && otherExams.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>In Progress</Text>
            {otherExams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} />
            ))}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ExamCard({ exam }: { exam: ExamSummary }) {
  const cfg = STATUS_CONFIG[exam.analytics_status];
  const isDone = exam.analytics_status === "DONE";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && isDone && styles.cardPressed,
      ]}
      onPress={() =>
        isDone &&
        router.push({
          pathname: "/teacher-exam-overview",
          params: { examId: exam.id },
        })
      }
      disabled={!isDone}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.cardIconWrap, { backgroundColor: cfg.bg }]}>
          <Ionicons name="document-text-outline" size={20} color={cfg.color} />
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {exam.exam_name}
        </Text>
        <View style={styles.cardMeta}>
          <Ionicons name="calendar-outline" size={12} color="#AAAAAA" />
          <Text style={styles.cardMetaText}>{formatDate(exam.exam_date)}</Text>
          <View style={[styles.typePill, { backgroundColor: "#F0F0F0" }]}>
            <Text style={styles.typePillText}>{exam.type}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>
            {cfg.label}
          </Text>
        </View>
        {isDone && (
          <Ionicons name="chevron-forward" size={16} color="#CCCCCC" />
        )}
      </View>
    </Pressable>
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
  countBadge: {
    backgroundColor: "#E1F5EE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  countBadgeText: { fontSize: 12, fontWeight: "600", color: "#1D9E75" },

  scrollContent: { padding: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#AAAAAA",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 8,
  },

  centered: { alignItems: "center", paddingVertical: 64, gap: 12 },
  stateText: { fontSize: 14, color: "#888888" },
  errorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  errorIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: { fontSize: 15, fontWeight: "600", color: "#111111" },
  errorBody: { fontSize: 13, color: "#888888", textAlign: "center" },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DC2626",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 9,
    marginTop: 4,
  },
  retryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#444444" },
  emptyBody: {
    fontSize: 13,
    color: "#AAAAAA",
    textAlign: "center",
    lineHeight: 20,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: "#EEEEEE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: { opacity: 0.85 },
  cardLeft: {},
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 5,
  },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  cardMetaText: { fontSize: 12, color: "#AAAAAA" },
  typePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  typePillText: { fontSize: 10, fontWeight: "600", color: "#888888" },
  cardRight: { alignItems: "flex-end", gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "700" },
});
