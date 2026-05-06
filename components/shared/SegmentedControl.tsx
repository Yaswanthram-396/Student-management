import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

interface SegmentedControlProps {
  options: string[];
  activeIndex: number;
  onChange: (index: number) => void;
  accentColor: string;
}

export function SegmentedControl({
  options,
  activeIndex,
  onChange,
  accentColor,
}: SegmentedControlProps) {
  return (
    <View style={styles.track}>
      {options.map((option, index) => {
        const isActive = index === activeIndex;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.segment, isActive && styles.segmentActive]}
            onPress={() => onChange(index)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                { color: isActive ? accentColor : colors.textMuted },
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    ...typography.label,
  },
});
