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
import type { AcademicClassResponse } from '../../types/principal';
import { HeaderBar } from '../shared';

function ClassRow({
  item,
  onPress,
}: {
  item: AcademicClassResponse;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.classRow} onPress={onPress}>
      <View style={styles.classBadge}>
        <Text style={styles.classBadgeText}>{item.display_order}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.className}>{item.name}</Text>
        <Text style={styles.classMeta}>Class directory entry</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

export function ClassesDirectoryScreen() {
  const [classes, setClasses] = useState<AcademicClassResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    principalApi
      .getClasses()
      .then((res) => {
        setClasses(
          res.results
            .slice()
            .sort(
              (a, b) =>
                a.display_order - b.display_order || a.name.localeCompare(b.name),
            ),
        );
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        center={<Text style={styles.headerTitle}>Classes</Text>}
        right={
          <Pressable onPress={() => router.push('/(tabs)/principal/settings' as any)}>
            <Ionicons name="settings-outline" size={22} color={colors.textPrimary} />
          </Pressable>
        }
      />

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.principal} />
        </View>
      )}

      {error && !loading && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load classes.</Text>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.sectionLabel}>All Classes</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No classes available.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ClassRow
              item={item}
              onPress={() =>
                router.push(
                  `/(tabs)/principal/class-people?class_id=${item.id}&class_name=${encodeURIComponent(item.name)}` as any,
                )
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...(typography.body as object), color: colors.textMuted },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  listHeader: { marginBottom: spacing.md },
  sectionLabel: { ...(typography.label as object), color: colors.textMuted },
  emptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: { ...(typography.body as object), color: colors.textMuted },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
  },
  classBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.principal + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  classBadgeText: {
    ...(typography.label as object),
    color: colors.principal,
    fontWeight: '700',
  },
  className: {
    ...(typography.body as object),
    color: colors.textPrimary,
    fontWeight: '600',
  },
  classMeta: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: 2,
  },
});
