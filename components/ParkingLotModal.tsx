import React, { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useParkingLotStore } from '../store/parkingLotStore';
import type { ParkingLotItem } from '../store/parkingLotStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  sessionAccent: string;
}

export default function ParkingLotModal({ visible, onClose, sessionAccent }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const items = useParkingLotStore((state) => state.items);
  const addItem = useParkingLotStore((state) => state.addItem);
  const removeItem = useParkingLotStore((state) => state.removeItem);
  const clearAll = useParkingLotStore((state) => state.clearAll);
  const [input, setInput] = useState('');
  const canAdd = input.trim().length > 0;

  function handleAdd() {
    if (!canAdd) return;
    addItem(input);
    setInput('');
  }

  function renderItem({ item }: { item: ParkingLotItem }) {
    return (
      <View style={[styles.item, { borderBottomColor: t.borderSubtle }]}>
        <Text style={[styles.itemText, { color: t.textPrimary }]}>{item.text}</Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => removeItem(item.id)}
          hitSlop={10}
          activeOpacity={0.7}
          accessibilityLabel={`Delete note: ${item.text}`}
          accessibilityRole="button"
        >
          <Ionicons name="close-circle" size={22} color={t.textMuted} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
          accessibilityLabel="Close parking lot"
          accessibilityRole="button"
        />

        <KeyboardAvoidingView style={styles.keyboardView} behavior="height" pointerEvents="box-none">
          <View
            style={[
              styles.card,
              {
                backgroundColor: t.surface,
                borderColor: t.border,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
            importantForAccessibility="yes"
          >
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: t.textPrimary }]}>Parking Lot</Text>
                <View style={[styles.countBadge, { backgroundColor: t.surfaceRaised }]}>
                  <Text style={[styles.countText, { color: sessionAccent }]}>{items.length}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={10}
                activeOpacity={0.7}
                accessibilityLabel="Close parking lot"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color={t.textMuted} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={items}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={items.length === 0 ? styles.emptyList : undefined}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={(
                <Text style={[styles.emptyText, { color: t.textMuted }]}>
                  Park a thought here and get back to focusing.
                </Text>
              )}
            />

            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: t.surfaceRaised,
                    borderColor: t.border,
                    color: t.textPrimary,
                  },
                ]}
                value={input}
                onChangeText={setInput}
                placeholder="What popped into your head?"
                placeholderTextColor={t.textMuted}
                returnKeyType="done"
                onSubmitEditing={handleAdd}
                autoCorrect
                spellCheck
                autoCapitalize="sentences"
                accessibilityLabel="New parking lot note"
              />
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: sessionAccent }, !canAdd && styles.addBtnDisabled]}
                onPress={handleAdd}
                disabled={!canAdd}
                activeOpacity={0.8}
                accessibilityLabel="Add note"
                accessibilityRole="button"
                accessibilityState={{ disabled: !canAdd }}
              >
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {items.length > 0 && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={clearAll}
                activeOpacity={0.7}
                accessibilityLabel="Clear all parking lot notes"
                accessibilityRole="button"
              >
                <Text style={[styles.clearText, { color: t.textMuted }]}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '70%',
    alignSelf: 'center',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 13,
    fontWeight: '800',
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flexShrink: 1,
  },
  emptyList: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  item: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  addBtn: {
    minWidth: 68,
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  clearBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
