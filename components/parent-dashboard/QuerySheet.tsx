import React from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import type { ParentProfile } from "../../types/parent";
import { BottomSheet } from "../shared";
import type {
    UseParentQueryActions,
    UseParentQueryState,
} from "./hooks/useParentQuery";

export interface QuerySheetProps {
  visible: boolean;
  onClose: () => void;
  profile: ParentProfile;
  state: UseParentQueryState;
  actions: UseParentQueryActions;
}

export function QuerySheet({
  visible,
  onClose,
  profile,
  state,
  actions,
}: QuerySheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sheetTitle}>Raise a Query</Text>
        <Text style={styles.sheetSubtitle}>
          Your query will be sent to the class teacher
        </Text>

        {/* Student selector (only when multiple students) */}
        {profile.students.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}
            contentContainerStyle={{ gap: spacing.sm }}
          >
            {profile.students.map((s) => (
              <Pressable
                key={s.id}
                style={[
                  styles.studentPill,
                  state.queryStudent === s.id && styles.studentPillActive,
                ]}
                onPress={() => actions.setQueryStudent(s.id)}
              >
                <Text
                  style={[
                    styles.studentPillText,
                    state.queryStudent === s.id && styles.studentPillTextActive,
                  ]}
                >
                  {s?.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Subject field */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Subject</Text>
          <TextInput
            style={[
              styles.textInput,
              state.subjectError && styles.textInputError,
            ]}
            placeholder="e.g. Homework doubt, Exam clarification"
            placeholderTextColor={colors.textMuted}
            value={state.querySubject}
            onChangeText={(t) => {
              actions.setQuerySubject(t);
            }}
            maxLength={100}
          />
          <View style={styles.charCountRow}>
            {state.subjectError && (
              <Text style={styles.fieldError}>Subject is required</Text>
            )}
            <Text style={styles.charCount}>
              {state.querySubject.length}/100
            </Text>
          </View>
        </View>

        {/* Message field */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Message</Text>
          <TextInput
            style={[
              styles.textInput,
              styles.textArea,
              state.messageError && styles.textInputError,
            ]}
            placeholder="Describe your query in detail..."
            placeholderTextColor={colors.textMuted}
            value={state.queryMessage}
            onChangeText={(t) => {
              actions.setQueryMessage(t);
            }}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
          <View style={styles.charCountRow}>
            {state.messageError && (
              <Text style={styles.fieldError}>Message is required</Text>
            )}
            <Text style={styles.charCount}>
              {state.queryMessage.length}/500
            </Text>
          </View>
        </View>

        {state.queryError && (
          <Text style={styles.submitError}>{state.queryError}</Text>
        )}

        <Pressable
          style={[
            styles.sendQueryBtn,
            state.queryLoading && styles.sendQueryBtnDisabled,
          ]}
          onPress={actions.handleSendQuery}
          disabled={state.queryLoading}
        >
          {state.queryLoading ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.sendQueryBtnText}>Send Query</Text>
          )}
        </Pressable>
        <View style={{ height: spacing.lg }} />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  studentPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  studentPillActive: {
    backgroundColor: colors.parent,
    borderColor: colors.parent,
  },
  studentPillText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
  },
  studentPillTextActive: {
    color: colors.surface,
  },
  fieldWrap: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  textInputError: {
    borderColor: "#e53935",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: spacing.md,
  },
  charCountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  charCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  fieldError: {
    fontSize: 12,
    color: "#e53935",
  },
  sendQueryBtn: {
    backgroundColor: colors.parent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  sendQueryBtnDisabled: {
    opacity: 0.6,
  },
  sendQueryBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.surface,
  },
  submitError: {
    fontSize: 13,
    color: "#e53935",
    marginTop: spacing.md,
  },
  placeholder: {
    color: colors.textMuted,
  },
});
