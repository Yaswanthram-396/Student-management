import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

interface MetricCardProps {
  value: string | number;
  label: string;
  accentColor: string;
}

export function MetricCard({ value, label, accentColor }: MetricCardProps) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  value: {
    ...typography.display,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
