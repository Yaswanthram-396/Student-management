import { Ionicons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import { parentApi } from "../../services/parent";
import type { ParentStudent } from "../../types/parent";
import {
  getStudentExamsTimeline,
  getStudentSummary,
  getSubjectDrilldown,
} from "../../src/lib/analyticsApi";
import { BottomSheet, HeaderBar, MetricCard, StatusPill } from "../shared";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const CARD_INNER_WIDTH = CARD_WIDTH - spacing.lg * 2;
const GRID_GAP = spacing.sm;
const GRID_PADDING = spacing.lg * 2;
const GRID_TILE_SIZE = (SCREEN_WIDTH - GRID_PADDING - GRID_GAP * 5) / 6;

interface ExamOption {
  id: string;
  exam_name: string;
  exam_date: string;
  analytics_status: string;
}

interface TimelineSubject {
  subject_id: string;
  subject_name: string;
  marks: number;
  max_marks: number;
  risk_label: "SAFE" | "WATCH" | "ALERT";
}

interface ExamTimelineEntry {
  id: string;
  exam_name: string;
  exam_date: string;
  total_marks: number;
  overall_risk: "SAFE" | "WATCH" | "ALERT";
  subjects: TimelineSubject[];
}

interface SubjectResult {
  subject_name: string;
  total_marks: number;
  max_marks: number;
  percentage: number;
  exam_rank: number;
  correct: number;
  wrong: number;
  unattempted: number;
  risk_label: "SAFE" | "WATCH" | "AT_RISK";
  performance_label:
    | "EXCEPTIONAL"
    | "ABOVE_AVERAGE"
    | "AVERAGE"
    | "BELOW_AVERAGE"
    | "NEEDS_ATTENTION";
  z_score: number;
}

interface StudentSummaryResponse {
  success: boolean;
  student: {
    student_id: string;
    student_ref_id: string;
    name: string;
    class_name: string;
    section_name: string;
  };
  exam: ExamOption;
  exams: ExamOption[];
  subjects: SubjectResult[];
  overall_risk: "SAFE" | "WATCH" | "AT_RISK";
}

interface StudentTimelineResponse {
  success: boolean;
  student: {
    student_id: string;
    student_ref_id: string;
    name: string;
    class_name: string;
    section_name: string;
  };
  exams: ExamTimelineEntry[];
}

interface QuestionResult {
  q_no: number;
  status: "C" | "W" | "U";
}

interface SubjectDrilldownResponse {
  success: boolean;
  student: {
    student_id: string;
    name: string;
    class_name: string;
    section_name: string;
  };
  exam: ExamOption;
  subject_name: string;
  result: SubjectResult;
  questions: QuestionResult[];
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function toTitleCase(name: string): string {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.toLowerCase())
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function getPercentageColor(pct: number): string {
  if (pct >= 75) return colors.primary;
  if (pct >= 50) return colors.amber;
  return colors.red;
}

function getZScoreLabel(z: number): string {
  if (z > 0.2) return "above class average";
  if (z < -0.2) return "below class average";
  return "at class average";
}

function getZScorePosition(z: number): number {
  const mapped = (z + 3) / 6;
  return Math.min(0.95, Math.max(0.05, mapped));
}

type IoniconName = keyof typeof Ionicons.glyphMap;

function mapPerformanceLabel(label: SubjectResult["performance_label"]) {
  switch (label) {
    case "EXCEPTIONAL":
      return {
        icon: "star" as IoniconName,
        bgColor: colors.primaryLight,
        textColor: colors.primary,
        display: "Exceptional",
      };
    case "ABOVE_AVERAGE":
      return {
        icon: "trending-up" as IoniconName,
        bgColor: colors.primaryLight,
        textColor: colors.primaryDark,
        display: "Above Avg",
      };
    case "AVERAGE":
      return {
        icon: "remove" as IoniconName,
        bgColor: colors.surface2,
        textColor: colors.textSecondary,
        display: "Average",
      };
    case "BELOW_AVERAGE":
      return {
        icon: "trending-down" as IoniconName,
        bgColor: colors.warningBg,
        textColor: colors.warning,
        display: "Below Avg",
      };
    default:
      return {
        icon: "alert-circle" as IoniconName,
        bgColor: colors.dangerBg,
        textColor: colors.danger,
        display: "Needs Help",
      };
  }
}

function getRiskColor(risk: SubjectResult["risk_label"]): string {
  if (risk === "SAFE") return colors.primary;
  if (risk === "WATCH") return colors.warning;
  return colors.danger;
}

function riskVariant(
  risk: SubjectResult["risk_label"],
): "success" | "warning" | "danger" {
  if (risk === "SAFE") return "success";
  if (risk === "WATCH") return "warning";
  return "danger";
}

function formatFirstName(name: string): string {
  const first = name.trim().split(" ")[0] ?? name;
  return toTitleCase(first);
}

function formatClassBadge(className: string): string {
  const match = className.match(/\d+/);
  if (match?.[0]) return `Cl.${match[0]}`;
  return `Cl.${className.replace("Class", "").trim() || className}`;
}

function truncateExamName(name: string): string {
  if (name.length <= 14) return name;
  return `${name.slice(0, 14)}...`;
}

function SkeletonBlock({
  height,
  width = CARD_WIDTH,
  radius,
  opacity,
}: {
  height: number;
  width?: number;
  radius: number;
  opacity: number;
}) {
  return (
    <View
      style={[
        styles.skeletonBlock,
        {
          height,
          width,
          borderRadius: radius,
          opacity,
        },
      ]}
    />
  );
}

export function ResultsScreen() {
  // Fetch real students from the dedicated parent/students/ endpoint
  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStudentsLoading(true);
    setStudentsError(null);
    parentApi
      .getStudents()
      .then((res) => {
        if (!cancelled) {
          setStudents(res.results ?? []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setStudentsError(
            err instanceof Error ? err.message : "Failed to load students",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setStudentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const listRef = useRef<FlatList<SubjectResult>>(null);
  const [activeScreen, setActiveScreen] = useState<"summary" | "drilldown">(
    "summary",
  );
  // Start empty — auto-selected via useEffect once students load
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<SubjectResult | null>(
    null,
  );
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<StudentSummaryResponse | null>(
    null,
  );
  const [examTimeline, setExamTimeline] = useState<ExamTimelineEntry[]>([]);
  const [drilldownData, setDrilldownData] =
    useState<SubjectDrilldownResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [examsLoading, setExamsLoading] = useState(false);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [drilldownError, setDrilldownError] = useState<string | null>(null);
  const [showExamPicker, setShowExamPicker] = useState(false);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [pulseOpacity, setPulseOpacity] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseOpacity((prev) => (prev === 1 ? 0.4 : 1));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const activeStudent = useMemo(
    () => students.find((entry) => entry.id === selectedStudentId),
    [students, selectedStudentId],
  );

  const loadSummary = useCallback(async () => {
    if (!selectedStudentId || !selectedExamId) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const response = (await getStudentSummary(
        selectedStudentId,
        selectedExamId,
      )) as StudentSummaryResponse;

      setSummaryData(response);
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedStudentId, selectedExamId]);

  const loadExamTimeline = useCallback(async () => {
    if (!selectedStudentId) return;
    setExamsLoading(true);
    setSummaryError(null);
    try {
      const response = (await getStudentExamsTimeline(
        selectedStudentId,
      )) as StudentTimelineResponse;
      const timeline = response.exams ?? [];
      setSelectedExamId(timeline[0]?.id ?? "");
      setSummaryData(null);
      setDrilldownData(null);
      setExpandedSubject(null);
      setSelectedSubject(null);
      setActiveScreen("summary");
      setExamTimeline(timeline);
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Unknown error");
      setExamTimeline([]);
      setSelectedExamId("");
    } finally {
      setExamsLoading(false);
    }
  }, [selectedStudentId]);

  const loadDrilldown = useCallback(async () => {
    if (!selectedSubject || !summaryData) return;
    setDrilldownLoading(true);
    setDrilldownError(null);
    try {
      const response = (await getSubjectDrilldown(
        selectedStudentId,
        // TODO: Screen 6 API should return subject_id per subject
        // Currently using subject_name as temporary identifier
        selectedSubject.subject_name,
        selectedExamId,
      )) as SubjectDrilldownResponse;

      setDrilldownData(response);
    } catch (error) {
      setDrilldownError(
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setDrilldownLoading(false);
    }
  }, [selectedSubject, summaryData, selectedStudentId, selectedExamId]);

  // Auto-select the first student once the auth store resolves linked_students.
  // Also handles the edge case where currentUser changes (e.g. re-login).
  useEffect(() => {
    if (students.length === 0) return; // still loading or no students linked
    setSelectedStudentId((prev) => {
      // Keep current selection if it's still valid, otherwise pick first
      const stillValid = students.some((s) => s.id === prev);
      return stillValid ? prev : (students[0]?.id ?? "");
    });
  }, [students]);

  // Fetch exams timeline whenever the selected student changes
  useEffect(() => {
    loadExamTimeline();
  }, [loadExamTimeline]);

  useEffect(() => {
    loadSummary();
  }, [selectedExamId, loadSummary]);

  useEffect(() => {
    if (activeScreen === "drilldown") {
      loadDrilldown();
    }
  }, [activeScreen, loadDrilldown]);

  const exams = examTimeline;
  const activeExam = exams.find((exam) => exam.id === selectedExamId);

  const handleSubjectPress = (subject: SubjectResult) => {
    setExpandedSubject((prev) =>
      prev === subject.subject_name ? null : subject.subject_name,
    );
  };

  const handleViewDrilldown = (subject: SubjectResult) => {
    setSelectedSubject(subject);
    setActiveScreen("drilldown");
  };

  const handleStudentPress = (studentId: string) => {
    setSelectedStudentId(studentId);
    setSelectedExamId("");
    setActiveScreen("summary");
    setSelectedSubject(null);
    setExpandedSubject(null);
  };

  const handleScrollToRisk = () => {
    if (!summaryData?.subjects?.length) return;
    const index = summaryData.subjects.findIndex(
      (subject) => subject.risk_label !== "SAFE",
    );
    if (index >= 0) {
      listRef.current?.scrollToIndex({ index, animated: true });
    }
  };

  const summaryStudentName = summaryData?.student.name ?? activeStudent?.name;
  const summaryClass =
    summaryData?.student.class_name ??
    activeStudent?.academic_class?.name ??
    "";
  const summarySection =
    summaryData?.student.section_name ?? activeStudent?.section?.name ?? "";
  const summaryRef =
    summaryData?.student.student_ref_id ?? activeStudent?.roll_number ?? "";

  const renderRiskBanner = () => {
    if (!summaryData) return null;
    const risk = summaryData.overall_risk;
    const isSafe = risk === "SAFE";
    const bgColor =
      risk === "SAFE"
        ? colors.primaryLight
        : risk === "WATCH"
          ? colors.warningBg
          : colors.dangerBg;
    const textColor =
      risk === "SAFE"
        ? colors.primaryDark
        : risk === "WATCH"
          ? colors.warning
          : colors.danger;
    const title =
      risk === "SAFE"
        ? "All Good"
        : risk === "WATCH"
          ? "Needs Attention"
          : "At Risk";
    const subtitle =
      risk === "SAFE"
        ? "Performance is on track across all subjects"
        : risk === "WATCH"
          ? "One or more subjects need improvement"
          : "Immediate attention required in some subjects";
    const icon =
      risk === "SAFE"
        ? "shield-checkmark"
        : risk === "WATCH"
          ? "eye"
          : "alert-circle";

    return (
      <Pressable
        style={[
          styles.riskBanner,
          {
            backgroundColor: bgColor,
            borderBottomWidth: 2,
            borderBottomColor: textColor,
          },
        ]}
        onPress={!isSafe ? handleScrollToRisk : undefined}
      >
        <Ionicons name={icon} size={20} color={textColor} />
        <View style={styles.riskBannerText}>
          <Text style={[styles.riskBannerTitle, { color: textColor }]}>
            {title}
          </Text>
          <Text style={[styles.riskBannerSubtitle, { color: textColor }]}>
            {subtitle}
          </Text>
        </View>
        {!isSafe && (
          <Ionicons name="chevron-forward" size={16} color={textColor} />
        )}
      </Pressable>
    );
  };

  const renderSummaryHeader = () => (
    <View style={styles.summaryHeader}>{renderRiskBanner()}</View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="book-outline" size={60} color={colors.border} />
      <Text style={styles.emptyTitle}>No exam results yet</Text>
      <Text style={styles.emptySubtitle}>
        Results will appear here once an exam is completed
      </Text>
    </View>
  );

  const renderSummaryError = () => (
    <View style={styles.errorState}>
      <Ionicons name="warning-outline" size={32} color={colors.warning} />
      <Text style={styles.errorTitle}>Could not load results</Text>
      {!!summaryError && (
        <Text style={styles.errorMessage}>{summaryError}</Text>
      )}
      <Pressable style={styles.retryButton} onPress={loadSummary}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </Pressable>
    </View>
  );

  const renderDrilldownError = () => (
    <View style={styles.errorState}>
      <Ionicons name="warning-outline" size={32} color={colors.warning} />
      <Text style={styles.errorTitle}>Could not load breakdown</Text>
      {!!drilldownError && (
        <Text style={styles.errorMessage}>{drilldownError}</Text>
      )}
      <Pressable style={styles.retryButton} onPress={loadDrilldown}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </Pressable>
      <Pressable
        style={styles.backLink}
        onPress={() => {
          setActiveScreen("summary");
          setSelectedSubject(null);
        }}
      >
        <Text style={styles.backLinkText}>← Back to Summary</Text>
      </Pressable>
    </View>
  );

  const renderSummarySkeleton = () => (
    <View style={styles.skeletonWrapper}>
      <SkeletonBlock
        height={36}
        radius={18}
        opacity={pulseOpacity}
        width={CARD_WIDTH}
      />
      <SkeletonBlock
        height={52}
        radius={16}
        opacity={pulseOpacity}
        width={CARD_WIDTH}
      />
      {[0, 1, 2].map((index) => (
        <SkeletonBlock
          key={`summary-skel-${index}`}
          height={100}
          radius={16}
          opacity={pulseOpacity}
          width={CARD_WIDTH}
        />
      ))}
    </View>
  );

  const renderDrilldownSkeleton = () => (
    <View style={styles.skeletonWrapper}>
      <SkeletonBlock
        height={80}
        radius={16}
        opacity={pulseOpacity}
        width={CARD_WIDTH}
      />
      <View style={styles.skeletonRow}>
        {[0, 1, 2].map((index) => (
          <SkeletonBlock
            key={`metric-skel-${index}`}
            height={74}
            radius={12}
            opacity={pulseOpacity}
            width={(CARD_WIDTH - spacing.sm * 2) / 3}
          />
        ))}
      </View>
      <View style={styles.skeletonGrid}>
        {Array.from({ length: 20 }).map((_, idx) => (
          <SkeletonBlock
            key={`grid-skel-${idx}`}
            height={GRID_TILE_SIZE}
            width={GRID_TILE_SIZE}
            radius={10}
            opacity={pulseOpacity}
          />
        ))}
      </View>
    </View>
  );

  const renderSubjectCard = ({ item }: { item: SubjectResult }) => {
    const isExpanded = expandedSubject === item.subject_name;
    const performance = mapPerformanceLabel(item.performance_label);
    const pctColor = getPercentageColor(item.percentage);
    const totalQuestions = item.correct + item.wrong + item.unattempted;
    const zPosition = getZScorePosition(item.z_score) * CARD_INNER_WIDTH;

    return (
      <Pressable
        style={styles.subjectCard}
        onPress={() => handleSubjectPress(item)}
      >
        <View style={styles.subjectRowTop}>
          <Text style={styles.subjectTitle}>
            {item.subject_name.toUpperCase()}
          </Text>
          <View style={styles.rankBadge}>
            <Text style={styles.rankBadgeText}>Rank #{item.exam_rank}</Text>
          </View>
        </View>

        <View style={styles.subjectRowMid}>
          <View style={styles.subjectScoreBlock}>
            <Text style={[styles.subjectPct, { color: pctColor }]}>
              {Math.round(item.percentage)}%
            </Text>
            <Text style={styles.subjectMarks}>
              {item.total_marks} / {item.max_marks} marks
            </Text>
          </View>
          <View
            style={[
              styles.performancePill,
              { backgroundColor: performance.bgColor },
            ]}
          >
            <Ionicons
              name={performance.icon}
              size={12}
              color={performance.textColor}
            />
            <Text
              style={[styles.performanceText, { color: performance.textColor }]}
            >
              {performance.display}
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: (item.percentage / 100) * CARD_INNER_WIDTH,
                backgroundColor: pctColor,
              },
            ]}
          />
        </View>
        <View style={styles.riskRow}>
          <StatusPill
            variant={riskVariant(item.risk_label)}
            label={item.risk_label.replace("_", " ")}
          />
        </View>
        <View style={styles.tapHintRow}>
          <Text style={styles.tapHintText}>Tap to see details</Text>
          <Ionicons
            name="chevron-down"
            size={12}
            color={colors.textMuted}
            style={{
              transform: [{ rotate: isExpanded ? "180deg" : "0deg" }],
            }}
          />
        </View>

        {isExpanded && (
          <View style={styles.subjectExpanded}>
            <View style={styles.divider} />
            <View style={styles.segmentTrack}>
              {totalQuestions > 0 && (
                <>
                  <View style={[styles.segmentFill, { flex: item.correct }]}>
                    <View
                      style={[
                        styles.segmentColor,
                        { backgroundColor: colors.success },
                      ]}
                    />
                  </View>
                  <View style={[styles.segmentFill, { flex: item.wrong }]}>
                    <View
                      style={[
                        styles.segmentColor,
                        { backgroundColor: colors.danger },
                      ]}
                    />
                  </View>
                  <View
                    style={[styles.segmentFill, { flex: item.unattempted }]}
                  >
                    <View
                      style={[
                        styles.segmentColor,
                        { backgroundColor: colors.textMuted },
                      ]}
                    />
                  </View>
                </>
              )}
            </View>
            <View style={styles.segmentStatsRow}>
              <View style={styles.segmentStatItem}>
                <Text style={[styles.segmentValue, { color: colors.success }]}>
                  {item.correct}
                </Text>
                <Text style={styles.segmentLabel}>Correct</Text>
              </View>
              <View style={styles.segmentStatItem}>
                <Text style={[styles.segmentValue, { color: colors.danger }]}>
                  {item.wrong}
                </Text>
                <Text style={styles.segmentLabel}>Wrong</Text>
              </View>
              <View style={styles.segmentStatItem}>
                <Text
                  style={[styles.segmentValue, { color: colors.textMuted }]}
                >
                  {item.unattempted}
                </Text>
                <Text style={styles.segmentLabel}>Skipped</Text>
              </View>
            </View>

            <View style={styles.zScoreBlock}>
              <Text style={styles.zScoreLabel}>CLASS POSITION</Text>
              <View style={styles.zScoreTrack}>
                <View
                  style={[
                    styles.zScoreDot,
                    {
                      left: zPosition,
                      backgroundColor: getRiskColor(item.risk_label),
                    },
                  ]}
                />
              </View>
              <View style={styles.zScoreLegendRow}>
                <Text style={styles.zScoreLegend}>Below Avg</Text>
                <Text style={styles.zScoreLegend}>Class Avg</Text>
                <Text style={styles.zScoreLegend}>Above Avg</Text>
              </View>
              <Text
                style={[
                  styles.zScoreValue,
                  {
                    color:
                      item.z_score > 0.2
                        ? colors.primary
                        : item.z_score < -0.2
                          ? colors.warning
                          : colors.textSecondary,
                  },
                ]}
              >
                z = {item.z_score.toFixed(2)} ({getZScoreLabel(item.z_score)})
              </Text>
            </View>

            <Pressable
              style={styles.drilldownButton}
              onPress={() => handleViewDrilldown(item)}
            >
              <Text style={styles.drilldownButtonText}>
                View Question Breakdown
              </Text>
              <Ionicons name="arrow-forward" size={14} color={colors.parent} />
            </Pressable>
          </View>
        )}
      </Pressable>
    );
  };

  const renderDrilldownHeader = () => {
    if (!drilldownData) return null;
    const pctColor = getPercentageColor(drilldownData.result.percentage);
    const totalQuestions =
      drilldownData.result.correct +
      drilldownData.result.wrong +
      drilldownData.result.unattempted;
    const zPosition =
      getZScorePosition(drilldownData.result.z_score) * CARD_INNER_WIDTH;

    return (
      <View>
        <View style={styles.drilldownSummaryCard}>
          <View style={styles.drilldownSummaryTop}>
            <Text style={[styles.subjectPct, { color: pctColor }]}>
              {Math.round(drilldownData.result.percentage)}%
            </Text>
            <View style={styles.drilldownSummaryRight}>
              <Text style={styles.subjectMarks}>
                {drilldownData.result.total_marks} /{" "}
                {drilldownData.result.max_marks} marks
              </Text>
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>
                  Rank #{drilldownData.result.exam_rank}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.segmentTrack}>
            {totalQuestions > 0 && (
              <>
                <View
                  style={[
                    styles.segmentFill,
                    { flex: drilldownData.result.correct },
                  ]}
                >
                  <View
                    style={[
                      styles.segmentColor,
                      { backgroundColor: colors.success },
                    ]}
                  />
                </View>
                <View
                  style={[
                    styles.segmentFill,
                    { flex: drilldownData.result.wrong },
                  ]}
                >
                  <View
                    style={[
                      styles.segmentColor,
                      { backgroundColor: colors.danger },
                    ]}
                  />
                </View>
                <View
                  style={[
                    styles.segmentFill,
                    { flex: drilldownData.result.unattempted },
                  ]}
                >
                  <View
                    style={[
                      styles.segmentColor,
                      { backgroundColor: colors.textMuted },
                    ]}
                  />
                </View>
              </>
            )}
          </View>

          <View style={styles.zScoreBlock}>
            <Text style={styles.zScoreLabel}>CLASS POSITION</Text>
            <View style={styles.zScoreTrack}>
              <View
                style={[
                  styles.zScoreDot,
                  {
                    left: zPosition,
                    borderColor: colors.surface,
                    backgroundColor: getRiskColor(
                      drilldownData.result.risk_label,
                    ),
                  },
                ]}
              />
            </View>
            <View style={styles.zScoreLegendRow}>
              <Text style={styles.zScoreLegend}>Below Avg</Text>
              <Text style={styles.zScoreLegend}>Class Avg</Text>
              <Text style={styles.zScoreLegend}>Above Avg</Text>
            </View>
            <Text
              style={[
                styles.zScoreValue,
                {
                  color:
                    drilldownData.result.z_score > 0.2
                      ? colors.primary
                      : drilldownData.result.z_score < -0.2
                        ? colors.warning
                        : colors.textSecondary,
                },
              ]}
            >
              z = {drilldownData.result.z_score.toFixed(2)} (
              {getZScoreLabel(drilldownData.result.z_score)})
            </Text>
          </View>
        </View>

        <View style={styles.metricRow}>
          <MetricCard
            value={drilldownData.result.correct}
            label="Correct"
            accentColor={colors.success}
          />
          <MetricCard
            value={drilldownData.result.wrong}
            label="Wrong"
            accentColor={colors.danger}
          />
          <MetricCard
            value={drilldownData.result.unattempted}
            label="Unattempted"
            accentColor={colors.textMuted}
          />
        </View>

        <Text style={styles.gridLabel}>QUESTION BREAKDOWN</Text>
      </View>
    );
  };

  const renderQuestionItem = ({ item }: { item: QuestionResult }) => {
    const bgColor =
      item.status === "C"
        ? colors.primary
        : item.status === "W"
          ? colors.danger
          : colors.surface2;
    const textColor = item.status === "U" ? colors.textMuted : colors.surface;
    return (
      <View style={[styles.questionTile, { backgroundColor: bgColor }]}>
        <Text style={[styles.questionText, { color: textColor }]}>
          {item.q_no}
        </Text>
      </View>
    );
  };

  const renderDrilldownFooter = () => {
    if (!drilldownData) return null;
    const summaryText =
      `${drilldownData.result.correct} Correct  ·  ` +
      `${drilldownData.result.wrong} Wrong  ·  ` +
      `${drilldownData.result.unattempted} Unattempted`;
    return (
      <View style={styles.legendWrapper}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.primary }]}
            />
            <Text style={styles.legendText}>Correct</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.danger }]}
            />
            <Text style={styles.legendText}>Wrong</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.surface2 }]}
            />
            <Text style={styles.legendText}>Unattempted</Text>
          </View>
        </View>
        <Text style={styles.legendSummary}>{summaryText}</Text>
      </View>
    );
  };

  const renderSummaryContent = () => {
    // Students still loading from /parent/students/
    if (studentsLoading) return renderSummarySkeleton();
    // Students fetch failed
    if (studentsError) return (
      <View style={styles.errorState}>
        <Ionicons name="warning-outline" size={32} color={colors.warning} />
        <Text style={styles.errorTitle}>Could not load students</Text>
        <Text style={styles.errorMessage}>{studentsError}</Text>
      </View>
    );
    // No students linked to this parent account
    if (students.length === 0) return (
      <View style={styles.emptyState}>
        <Ionicons name="people-outline" size={60} color={colors.border} />
        <Text style={styles.emptyTitle}>No students linked</Text>
        <Text style={styles.emptySubtitle}>
          Contact your school to link a student to this account
        </Text>
      </View>
    );
    if (examsLoading || summaryLoading) return renderSummarySkeleton();
    if (summaryError) return renderSummaryError();
    if (exams.length === 0) return renderEmptyState();

    return (
      <FlatList
        key="summary-list"
        ref={listRef}
        data={summaryData?.subjects ?? []}
        keyExtractor={(item) => item.subject_name}
        renderItem={renderSubjectCard}
        ListHeaderComponent={renderSummaryHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        onScrollToIndexFailed={() => undefined}
      />
    );
  };

  const renderDrilldownContent = () => {
    if (drilldownLoading) return renderDrilldownSkeleton();
    if (drilldownError) return renderDrilldownError();
    if (!drilldownData) return null;

    return (
      <FlatList
        key="drilldown-list"
        data={drilldownData.questions}
        keyExtractor={(item) => item.q_no.toString()}
        renderItem={renderQuestionItem}
        numColumns={6}
        ListHeaderComponent={renderDrilldownHeader}
        ListFooterComponent={renderDrilldownFooter}
        contentContainerStyle={styles.drilldownListContent}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <HeaderBar
        left={
          activeScreen === "drilldown" ? (
            <Pressable
              onPress={() => {
                setActiveScreen("summary");
                setSelectedSubject(null);
              }}
            >
              <Ionicons name="chevron-back" size={20} color={colors.parent} />
            </Pressable>
          ) : undefined
        }
        center={
          <Text style={styles.headerTitle}>
            {activeScreen === "drilldown"
              ? selectedSubject?.subject_name
              : "Results"}
          </Text>
        }
        right={activeScreen === "drilldown" ? <View /> : undefined}
      />

      <View style={styles.studentSelector}>
        <Pressable
          style={styles.studentDropdownBtn}
          onPress={() => setShowStudentPicker(true)}
        >
          <View style={styles.studentDropdownLeft}>
            <View style={styles.studentDropdownAvatar}>
              <Text style={styles.studentDropdownAvatarText}>
                {getInitials(activeStudent?.name ?? "")}
              </Text>
            </View>
            <View>
              <Text style={styles.studentDropdownName}>
                {activeStudent ? toTitleCase(activeStudent.name) : "Select Student"}
              </Text>
              {activeStudent && (
                <Text style={styles.studentDropdownMeta}>
                  {formatClassBadge(activeStudent.academic_class.name)}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.studentDropdownChevron}>
            <Ionicons name="chevron-down" size={14} color={colors.parent} />
          </View>
        </Pressable>
      </View>

      <View style={styles.identityStrip}>
        <View style={styles.identityLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(summaryStudentName ?? "")}
            </Text>
          </View>
          <View style={styles.identityInfo}>
            <Text style={styles.identityName}>
              {toTitleCase(summaryStudentName ?? "")}
            </Text>
            <Text style={styles.identityMeta}>
              {summaryClass} · Section {summarySection} · Ref: {summaryRef}
            </Text>
          </View>
        </View>
        <Pressable
          style={styles.examPicker}
          onPress={() => setShowExamPicker(true)}
        >
          <Text style={styles.examPickerText}>
            {truncateExamName(activeExam?.exam_name ?? "Select Exam")}
          </Text>
          <Ionicons
            name="chevron-down"
            size={12}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>

      <View style={styles.content}>
        {activeScreen === "summary"
          ? renderSummaryContent()
          : renderDrilldownContent()}
      </View>

      <BottomSheet
        visible={showExamPicker}
        onClose={() => setShowExamPicker(false)}
        height="50%"
      >
        <Text style={styles.sheetTitle}>Select Exam</Text>
        <FlatList
          data={exams}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isActive = item.id === selectedExamId;
            return (
              <Pressable
                style={styles.examRowItem}
                onPress={() => {
                  setSelectedExamId(item.id);
                  setShowExamPicker(false);
                }}
              >
                <View>
                  <Text
                    style={[
                      styles.examRowTitle,
                      isActive && { color: colors.parent },
                    ]}
                  >
                    {item.exam_name}
                  </Text>
                </View>
                <View style={styles.examRowRight}>
                  <Text style={styles.examRowDate}>{item.exam_date}</Text>
                  {isActive && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={colors.parent}
                    />
                  )}
                </View>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.examRowDivider} />}
          showsVerticalScrollIndicator={false}
        />
      </BottomSheet>

      <BottomSheet
        visible={showStudentPicker}
        onClose={() => setShowStudentPicker(false)}
        height="50%"
      >
        <Text style={styles.sheetTitle}>Select Student</Text>
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isActive = item.id === selectedStudentId;
            return (
              <Pressable
                style={styles.examRowItem}
                onPress={() => {
                  handleStudentPress(item.id);
                  setShowStudentPicker(false);
                }}
              >
                <View style={styles.studentPickerRow}>
                  <View
                    style={[
                      styles.studentPickerAvatar,
                      isActive && styles.studentPickerAvatarActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.studentPickerAvatarText,
                        isActive && styles.studentPickerAvatarTextActive,
                      ]}
                    >
                      {getInitials(item.name)}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.examRowTitle,
                        isActive && { color: colors.parent },
                      ]}
                    >
                      {toTitleCase(item.name)}
                    </Text>
                    <Text style={styles.examRowDate}>
                      {item.academic_class.name}
                      {item.section?.name ? ` · Sec ${item.section.name}` : ""}
                    </Text>
                  </View>
                </View>
                {isActive && (
                  <Ionicons name="checkmark" size={16} color={colors.parent} />
                )}
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.examRowDivider} />}
          showsVerticalScrollIndicator={false}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  content: { flex: 1 },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  drilldownListContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  studentSelector: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  studentDropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface2,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  studentDropdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  studentDropdownAvatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.parent,
    alignItems: "center",
    justifyContent: "center",
  },
  studentDropdownAvatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.surface,
  },
  studentDropdownName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  studentDropdownMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  studentDropdownChevron: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  studentPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  studentPickerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  studentPickerAvatarActive: {
    backgroundColor: colors.parent,
  },
  studentPickerAvatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  studentPickerAvatarTextActive: {
    color: colors.surface,
  },

  identityStrip: {
    height: 56,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  identityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.parent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.surface,
  },
  identityInfo: { flex: 1 },
  identityName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  identityMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  examPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface2,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  examPickerText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },

  riskBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: 12,
  },
  summaryHeader: {
    marginBottom: spacing.lg,
    marginHorizontal: -spacing.lg,
  },
  riskBannerText: { flex: 1, marginLeft: spacing.sm },
  riskBannerTitle: { fontSize: 14, fontWeight: "600" },
  riskBannerSubtitle: { fontSize: 12, marginTop: 2 },

  subjectCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  subjectRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subjectTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  rankBadge: {
    backgroundColor: colors.surface2,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  subjectRowMid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  subjectScoreBlock: { flex: 1 },
  subjectPct: {
    fontSize: 32,
    fontWeight: "700",
  },
  subjectMarks: {
    fontSize: 12,
    color: colors.textMuted,
  },
  performancePill: {
    flexDirection: "column",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  performanceText: { fontSize: 11, fontWeight: "500" },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface2,
    marginTop: spacing.md,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  riskRow: {
    alignItems: "flex-end",
    marginTop: spacing.md,
  },
  tapHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    justifyContent: "space-between",
    marginTop: spacing.sm,
    alignSelf: "stretch",
  },
  tapHintText: {
    fontSize: 11,
    color: colors.textMuted,
  },

  subjectExpanded: { marginTop: spacing.md },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  segmentTrack: {
    flexDirection: "row",
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surface2,
    overflow: "hidden",
  },
  segmentFill: { flex: 1 },
  segmentColor: { flex: 1 },
  segmentStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  segmentStatItem: { alignItems: "center", flex: 1 },
  segmentValue: { fontSize: 14, fontWeight: "600" },
  segmentLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  zScoreBlock: { marginTop: spacing.lg },
  zScoreLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  zScoreTrack: {
    height: 4,
    backgroundColor: colors.surface2,
    borderRadius: 2,
    marginTop: spacing.sm,
    position: "relative",
  },
  zScoreDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.parent,
    position: "absolute",
    top: -4,
  },
  zScoreLegendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  zScoreLegend: { fontSize: 11, color: colors.textMuted },
  zScoreValue: { fontSize: 11, marginTop: spacing.xs },
  drilldownButton: {
    marginTop: spacing.lg,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  drilldownButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.parent,
  },

  drilldownSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginTop: spacing.lg,
  },
  drilldownSummaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  drilldownSummaryRight: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  gridLabel: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  gridRow: { justifyContent: "space-between" },
  questionTile: {
    width: GRID_TILE_SIZE,
    height: GRID_TILE_SIZE,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  questionText: { fontSize: 13, fontWeight: "600" },
  legendWrapper: { marginTop: spacing.md, alignItems: "center" },
  legendRow: { flexDirection: "row", gap: spacing.lg },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: colors.textMuted },
  legendSummary: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: "center",
  },

  sheetTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  examRowItem: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  examRowTitle: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
  examRowDate: { fontSize: 12, color: colors.textMuted },
  examRowRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  examRowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
  },

  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  errorMessage: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
    maxWidth: 280,
  },
  retryButton: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.parent,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.parent,
  },
  backLink: { marginTop: spacing.md },
  backLinkText: { fontSize: 13, color: colors.parent },

  skeletonWrapper: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  skeletonBlock: {
    backgroundColor: colors.surface2,
  },
  skeletonRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
