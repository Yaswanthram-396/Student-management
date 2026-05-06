import React from 'react';
import { Switch, View, StyleSheet, Platform } from 'react-native';
import { colors } from '../../constants/colors';

interface ToggleSwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  accentColor: string;
}

export function ToggleSwitch({ value, onChange, accentColor }: ToggleSwitchProps) {
  return (
    <View style={styles.container}>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: accentColor + '66' }}
        thumbColor={value ? accentColor : colors.textMuted}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
});
