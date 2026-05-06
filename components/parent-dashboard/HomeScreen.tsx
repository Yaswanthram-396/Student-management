import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { HeaderBar, StatusPill } from '../shared';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2;

type Child = { id: string; name: string; cls: string; present: boolean };
type Update = { id: string; color: string; title: string; sub: string; time: string };

const CHILDREN: Child[] = [
  { id: '1', name: 'Arjun Kumar',  cls: 'Class 6 – Section B', present: true  },
  { id: '2', name: 'Sneha Kumar',  cls: 'Class 3 – Section A', present: false },
];

const HOME_UPDATES: Update[] = [
  { id: '1', color: colors.teacher, title: 'Math Homework Due',       sub: 'Complete Ex 5.3 – Page 102',                  time: '2 hours ago' },
  { id: '2', color: colors.success, title: 'School Closed Tomorrow',  sub: 'Holiday declared for state elections',         time: '4 hours ago' },
  { id: '3', color: colors.warning, title: 'Science Exam on Friday',  sub: 'Chapters 4 and 5 — prepare well',             time: 'Yesterday'   },
];

function ChildCard({ item }: { item: Child }) {
  return (
    <View style={[styles.childCard, { width: CARD_WIDTH }]}>
      <View style={styles.childRow}>
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{item.name}</Text>
          <Text style={styles.childCls}>{item.cls}</Text>
        </View>
        <StatusPill
          variant={item.present ? 'success' : 'danger'}
          label={item.present ? 'Present Today' : 'Absent Today'}
        />
      </View>
    </View>
  );
}

function FeedCard({ item }: { item: Update }) {
  return (
    <View style={styles.feedCard}>
      <View style={[styles.feedAccent, { backgroundColor: item.color }]} />
      <View style={styles.feedBody}>
        <Text style={styles.feedTitle}>{item.title}</Text>
        <Text style={styles.feedSub}>{item.sub}</Text>
        <Text style={styles.feedTime}>{item.time}</Text>
      </View>
    </View>
  );
}

export function HomeScreen() {
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0);
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        left={
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>DPS</Text>
          </View>
        }
        center={
          <Text style={styles.greeting} numberOfLines={1}>Good morning, Priya</Text>
        }
        right={
          <View>
            <Ionicons name="notifications-outline" size={22} color={colors.textMuted} />
            <View style={styles.notifDot} />
          </View>
        }
      />

      <FlatList
        data={HOME_UPDATES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.feedWrapper}>
            <FeedCard item={item} />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <FlatList
              data={CHILDREN}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => <ChildCard item={item} />}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
            />
            <View style={styles.dots}>
              {CHILDREN.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      width: i === activeIndex ? 20 : 6,
                      backgroundColor: i === activeIndex ? colors.parent : colors.border,
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.sectionLabel}>Today's Updates</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  listContent: { paddingBottom: spacing.lg },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.parent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    ...(typography.label as object),
    color: colors.surface,
    fontWeight: '700',
  },
  greeting: { ...(typography.h3 as object), color: colors.textPrimary },
  notifDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  childCard: {
    backgroundColor: colors.successBg,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  childInfo: { flex: 1, marginRight: spacing.sm },
  childName: { ...(typography.h2 as object), color: colors.textPrimary },
  childCls: {
    ...(typography.caption as object),
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  dot: { height: 6, borderRadius: 999 },
  sectionLabel: {
    ...(typography.label as object),
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  feedWrapper: { paddingHorizontal: spacing.lg },
  feedCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  feedAccent: { width: 3 },
  feedBody: { flex: 1, padding: spacing.md, paddingLeft: spacing.lg },
  feedTitle: {
    ...(typography.body as object),
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  feedSub: {
    ...(typography.caption as object),
    color: colors.textSecondary,
    lineHeight: 18,
  },
  feedTime: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
