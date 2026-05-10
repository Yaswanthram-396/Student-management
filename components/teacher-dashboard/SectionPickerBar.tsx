import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }

  function closeDropdown() {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -20, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => setOpen(false));
  }

  function handleSelect(section: typeof selectedSection) {
    if (!section) return;
    setSelectedSection(section);
    closeDropdown();
  }

  function handleBack() {
    router.replace('/teacher-sections');
  }

  const dropdownTop = insets.top + BAR_HEIGHT;

  return (
    <>
      {/* Fixed top bar */}
      <View style={[styles.bar, { paddingTop: insets.top }]}>
        <View style={styles.barInner}>
          {/* Back button */}
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            onPress={handleBack}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color="#444444" />
          </Pressable>

          {/* Class label */}
          <View style={styles.barLabel}>
            <Ionicons name="school-outline" size={14} color={ACCENT} />
            <Text style={styles.barLabelText}>Class</Text>
          </View>

          {/* Section selector pill */}
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
              size={14}
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

        {/* Dropdown panel — narrower with horizontal margins */}
        <Animated.View
          style={[
            styles.dropdown,
            { top: dropdownTop },
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.dropdownHandle} />
          <Text style={styles.dropdownTitle}>Switch Class</Text>

          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {sections.map((section) => {
              const isActive = section.id === selectedSection?.id;
              return (
                <Pressable
                  key={section.id}
                  style={({ pressed }) => [
                    styles.item,
                    isActive && styles.itemActive,
                    pressed && !isActive && styles.itemPressed,
                  ]}
                  onPress={() => handleSelect(section)}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.itemDot, isActive && styles.itemDotActive]} />
                    <View style={{ flex: 1 }}>
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
                  {isActive && <Ionicons name="checkmark-circle" size={20} color={ACCENT} />}
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
  bar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  barInner: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: { backgroundColor: '#F0F0F0' },
  barLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  barLabelText: { fontSize: 13, fontWeight: '600', color: '#444444' },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EBF2FB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    maxWidth: 180,
  },
  selectorPressed: { opacity: 0.7 },
  selectorText: { fontSize: 13, fontWeight: '600', color: ACCENT, flexShrink: 1 },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  // Narrower dropdown with horizontal margins
  dropdown: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingTop: 10,
    paddingBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 12,
  },
  dropdownHandle: {
    width: 32,
    height: 4,
    backgroundColor: '#DDDDDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  dropdownTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#AAAAAA',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 14,
    marginBottom: 4,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginHorizontal: 6,
    borderRadius: 10,
  },
  itemActive: { backgroundColor: '#EBF2FB' },
  itemPressed: { backgroundColor: '#F5F5F5' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  itemDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#DDDDDD' },
  itemDotActive: { backgroundColor: ACCENT },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#111111', marginBottom: 2 },
  itemTitleActive: { color: ACCENT },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemSub: { fontSize: 11, color: '#AAAAAA' },
  itemDivider: { fontSize: 11, color: '#CCCCCC' },
  itemCT: { fontSize: 11, color: ACCENT, fontWeight: '500' },
});
