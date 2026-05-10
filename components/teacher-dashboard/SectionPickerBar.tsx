import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setSelectedSection, useTeacherStore } from '../../store/teacher-store';

const ACCENT = '#185FA5';
const BAR_HEIGHT = 52;

export function SectionPickerBar() {
  const { selectedSection, sections } = useTeacherStore();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  function openDropdown() {
    setOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function closeDropdown() {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => setOpen(false));
  }

  function handleSelect(section: typeof selectedSection) {
    if (!section) return;
    setSelectedSection(section);
    closeDropdown();
  }

  const barTop = insets.top;
  const dropdownTop = barTop + BAR_HEIGHT;

  return (
    <>
      {/* Fixed top bar */}
      <View style={[styles.bar, { paddingTop: barTop }]}>
        <View style={styles.barInner}>
          <View style={styles.barLeft}>
            <Ionicons name="school-outline" size={16} color={ACCENT} />
            <Text style={styles.barLabel}>Class</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.selector, pressed && styles.selectorPressed]}
            onPress={open ? closeDropdown : openDropdown}
          >
            <Text style={styles.selectorText} numberOfLines={1}>
              {selectedSection
                ? `${selectedSection.class_name} – ${selectedSection.section_name}`
                : 'Select Class'}
            </Text>
            <Ionicons
              name={open ? 'chevron-up' : 'chevron-down'}
              size={15}
              color={ACCENT}
            />
          </Pressable>
        </View>
      </View>

      {/* Dropdown modal */}
      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeDropdown}
      >
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDropdown} />
        </Animated.View>

        {/* Dropdown panel */}
        <Animated.View
          style={[
            styles.dropdown,
            { top: dropdownTop },
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.dropdownHandle} />

          <Text style={styles.dropdownTitle}>Switch Class</Text>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            style={styles.dropdownScroll}
          >
            {sections.map((section) => {
              const isActive = section.id === selectedSection?.id;
              return (
                <Pressable
                  key={section.id}
                  style={({ pressed }) => [
                    styles.item,
                    isActive && styles.itemActive,
                    pressed && styles.itemPressed,
                  ]}
                  onPress={() => handleSelect(section)}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.itemDot, isActive && styles.itemDotActive]} />
                    <View>
                      <Text style={[styles.itemTitle, isActive && styles.itemTitleActive]}>
                        {section.class_name} – {section.section_name}
                      </Text>
                      <View style={styles.itemMeta}>
                        <Ionicons name="people-outline" size={11} color="#AAAAAA" />
                        <Text style={styles.itemSub}>{section.student_count} students</Text>
                        {section.is_class_teacher && (
                          <>
                            <Text style={styles.itemDivider}>·</Text>
                            <Text style={styles.itemCT}>Class Teacher</Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={20} color={ACCENT} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Top bar
  bar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    zIndex: 10,
  },
  barInner: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  barLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444444',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF2FB',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    maxWidth: 220,
  },
  selectorPressed: { opacity: 0.75 },
  selectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
    flexShrink: 1,
  },

  // Backdrop
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  // Dropdown panel
  dropdown: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: 10,
    paddingBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  dropdownHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#DDDDDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  dropdownTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#AAAAAA',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  dropdownScroll: { maxHeight: 300 },

  // Dropdown items
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 12,
  },
  itemActive: { backgroundColor: '#EBF2FB' },
  itemPressed: { backgroundColor: '#F5F5F5' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DDDDDD',
  },
  itemDotActive: { backgroundColor: ACCENT },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#111111', marginBottom: 2 },
  itemTitleActive: { color: ACCENT },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemSub: { fontSize: 11, color: '#AAAAAA' },
  itemDivider: { fontSize: 11, color: '#CCCCCC' },
  itemCT: { fontSize: 11, color: ACCENT, fontWeight: '500' },
});
