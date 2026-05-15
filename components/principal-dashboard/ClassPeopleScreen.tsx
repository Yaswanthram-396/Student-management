import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { HeaderBar } from '../shared';

function ActionCard({
  icon,
  title,
  meta,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  meta: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionCard} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={20} color={colors.principal} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionMeta}>{meta}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

export function ClassPeopleScreen() {
  const { class_id, class_name } = useLocalSearchParams<{
    class_id: string;
    class_name?: string;
  }>();

  const title = class_name ?? 'Class';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        left={
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
        }
        center={
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        }
      />

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Choose what you want to view</Text>

        <ActionCard
          icon="people-outline"
          title="Teachers"
          meta="See all teachers assigned to sections in this class"
          onPress={() =>
            router.push(
              `/(tabs)/principal/class-teachers?class_id=${class_id}&class_name=${encodeURIComponent(class_name ?? '')}` as any,
            )
          }
        />

        <ActionCard
          icon="person-circle-outline"
          title="Students"
          meta="See all students across every section in this class"
          onPress={() =>
            router.push(
              `/(tabs)/principal/class-students?class_id=${class_id}&class_name=${encodeURIComponent(class_name ?? '')}` as any,
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backBtn: { padding: 4 },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  content: { padding: spacing.lg, gap: spacing.md },
  sectionLabel: { ...(typography.label as object), color: colors.textMuted },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.principal + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    ...(typography.body as object),
    color: colors.textPrimary,
    fontWeight: '700',
  },
  actionMeta: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: 2,
  },
});
