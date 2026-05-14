import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { principalApi } from '../../services/principal';
import type { AnalyticsResponse } from '../../types/principal';
import { HeaderBar } from '../shared';

type AnalyticsCard = {
  id: string;
  title: string;
  items: any[];
  emptyMessage: string;
};

export function AnalyticsScreen() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    principalApi.getAnalytics()
      .then(setData)
      .catch((err: any) => setError(err.details ?? 'Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  const cards: AnalyticsCard[] = [
    {
      id: 'class_performance_trends',
      title: 'Class Performance Trends',
      items: data?.class_performance_trends ?? [],
      emptyMessage: 'No class performance trend data is available yet.',
    },
    {
      id: 'subject_wise_analysis',
      title: 'Subject-wise Analysis',
      items: data?.subject_wise_analysis ?? [],
      emptyMessage: 'No subject-wise analysis is available yet.',
    },
    {
      id: 'teacher_effectiveness',
      title: 'Teacher Effectiveness',
      items: data?.teacher_effectiveness ?? [],
      emptyMessage: 'No teacher effectiveness analytics is available yet.',
    },
    {
      id: 'student_growth_tracking',
      title: 'Student Growth Tracking',
      items: data?.student_growth_tracking ?? [],
      emptyMessage: 'No student growth tracking data is available yet.',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        left={
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
        }
        center={<Text style={styles.headerTitle}>Analytics</Text>}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.principal} />
          <Text style={styles.helperText}>Loading principal analytics...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.items.length === 0 ? (
                <Text style={styles.emptyText}>{item.emptyMessage}</Text>
              ) : (
                item.items.slice(0, 3).map((entry, index) => (
                  <Text key={index} style={styles.dataText}>
                    {JSON.stringify(entry)}
                  </Text>
                ))
              )}
            </View>
          )}
          ListHeaderComponent={
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color={colors.principal} />
              <Text style={styles.infoText}>
                The current principal analytics endpoint returns category arrays. Empty arrays are shown as a valid
                backend state.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBtn: { padding: 4 },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  helperText: { ...(typography.caption as object), color: colors.textMuted, textAlign: 'center' },
  errorText: { ...(typography.body as object), color: colors.danger, textAlign: 'center' },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoText: { ...(typography.caption as object), color: colors.textSecondary, flex: 1, lineHeight: 18 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
  },
  cardTitle: { ...(typography.body as object), fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs },
  emptyText: { ...(typography.caption as object), color: colors.textMuted, lineHeight: 18 },
  dataText: { ...(typography.caption as object), color: colors.textSecondary, lineHeight: 18, marginTop: spacing.xs },
});
