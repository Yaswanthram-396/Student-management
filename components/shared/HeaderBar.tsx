import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

interface HeaderBarProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}

export function HeaderBar({ left, center, right }: HeaderBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.slot}>{left}</View>
      <View style={styles.centerSlot}>{center}</View>
      <View style={[styles.slot, styles.slotRight]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  slot: {
    minWidth: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  slotRight: {
    alignItems: 'flex-end',
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
