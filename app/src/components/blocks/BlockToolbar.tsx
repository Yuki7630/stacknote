import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/constants/theme';
import type { BlockType } from '@/types/note';

type Option = { type: BlockType; label: string; icon: IoniconsIconName };

const OPTIONS: Option[] = [
  { type: 'text', label: 'Text', icon: 'text-outline' },
  { type: 'list', label: 'List', icon: 'list-outline' },
  { type: 'table', label: 'Table', icon: 'grid-outline' },
];

type Props = {
  onInsert: (type: BlockType) => void;
};

/** "+" button that expands into a menu of block types to insert. */
export function BlockToolbar({ onInsert }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close block menu' : 'Add block'}
        onPress={() => setOpen((o) => !o)}
        style={[styles.plus, { borderColor: theme.border }]}
        hitSlop={8}
      >
        <Ionicons name={open ? 'close' : 'add'} size={22} color={theme.accent} />
      </Pressable>

      {open &&
        OPTIONS.map((opt) => (
          <Pressable
            key={opt.type}
            accessibilityRole="button"
            onPress={() => {
              onInsert(opt.type);
              setOpen(false);
            }}
            style={[styles.option, { backgroundColor: theme.surface }]}
          >
            <Ionicons name={opt.icon} size={16} color={theme.text} />
            <Text style={[styles.optionLabel, { color: theme.text }]}>{opt.label}</Text>
          </Pressable>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  plus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  optionLabel: {
    fontSize: 14,
  },
});
