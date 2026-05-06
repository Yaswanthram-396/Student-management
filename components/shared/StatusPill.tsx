import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

type Variant = 'success' | 'warning' | 'danger' | 'info';

interface StatusPillProps {
  variant: Variant;
  label: string;
}

const variantMap: Record<Variant, { bg: string; text: string }> = {
  success: { bg: colors.successBg, text: colors.success },
  warning: { bg: colors.warningBg, text: colors.warning },
  danger:  { bg: colors.dangerBg,  text: colors.danger  },
  info:    { bg: '#DBEAFE',        text: colors.teacher  },
};

export function StatusPill({ variant, label }: StatusPillProps) {
  const { bg, text } = variantMap[variant];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  label: {
    ...typography.label,
  },
});
