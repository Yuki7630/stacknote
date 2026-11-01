import { Ionicons } from '@react-native-vector-icons/ionicons';
import { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';

import { AutoGrowTextInput } from '@/components/AutoGrowTextInput';
import { useTheme, type Theme } from '@/constants/theme';
import type { ListBlock as ListBlockData, ListItem } from '@/types/note';
import { focusAt } from '@/utils/focusInput';
import { removeItem, setItemText, splitItem, toggleItemChecked, toggleListStyle } from '@/utils/listOps';

import { commitBlock, readBlock } from '@/store/blockActions';

type Props = {
  noteId: string;
  block: ListBlockData;
};

const ITEM_MIN_HEIGHT = 36;

export function ListBlock({ noteId, block }: Props) {
  const theme = useTheme();
  const blockId = block.id;
  const inputs = useRef(new Map<string, TextInput>());
  // Item to focus once it has rendered (a new item from Enter).
  const pendingFocus = useRef<{ id: string; position: number } | null>(null);

  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    const input = inputs.current.get(pending.id);
    if (!input) return;
    pendingFocus.current = null;
    focusAt(input, pending.position);
  }, [block.items]);

  // All handlers read the latest block from the store at event time (no stale closures) and
  // depend only on noteId/blockId, so the memoized rows below keep the same props.
  const readList = (): ListBlockData | undefined => {
    const current = readBlock(noteId, blockId);
    return current?.type === 'list' ? current : undefined;
  };

  const onItemChange = (itemId: string, text: string) => {
    const current = readList();
    if (!current) return;
    if (/\r?\n/.test(text)) {
      const result = splitItem(current, itemId, text);
      if (!result) return;
      pendingFocus.current = { id: result.focusId, position: 0 };
      commitBlock(noteId, current, result.block);
      return;
    }
    commitBlock(noteId, current, setItemText(current, itemId, text));
  };

  /** Removes an empty item and focuses the previous one. Returns true if it handled the key. */
  const onBackspace = (itemId: string): boolean => {
    const current = readList();
    const item = current?.items.find((i) => i.id === itemId);
    if (!current || !item || item.text !== '') return false;
    const result = removeItem(current, itemId);
    if (!result) return false;
    // Move focus before removing so the keyboard stays open.
    focusAt(inputs.current.get(result.previous.id), result.previous.text.length);
    commitBlock(noteId, current, result.block);
    return true;
  };

  const onToggleItem = (itemId: string) => {
    const current = readList();
    if (current) commitBlock(noteId, current, toggleItemChecked(current, itemId));
  };

  const onToggleStyle = () => {
    const current = readList();
    if (current) commitBlock(noteId, current, toggleListStyle(current));
  };

  const registerInput = (itemId: string, node: TextInput | null) => {
    if (node) inputs.current.set(itemId, node);
    else inputs.current.delete(itemId);
  };

  const isCheck = block.style === 'check';

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isCheck ? 'Switch to bullet list' : 'Switch to checklist'}
        onPress={onToggleStyle}
        style={[styles.styleToggle, { backgroundColor: theme.surface }]}
        hitSlop={6}
      >
        <Ionicons name={isCheck ? 'checkbox-outline' : 'list-outline'} size={14} color={theme.muted} />
        <Text style={[styles.styleToggleText, { color: theme.muted }]}>{isCheck ? 'Checklist' : 'Bullets'}</Text>
        <Ionicons name="swap-horizontal" size={14} color={theme.muted} />
      </Pressable>

      {block.items.map((item) => (
        <ListItemRow
          key={item.id}
          item={item}
          isCheck={isCheck}
          theme={theme}
          onChangeText={onItemChange}
          onBackspace={onBackspace}
          onToggle={onToggleItem}
          registerInput={registerInput}
        />
      ))}
    </View>
  );
}

type RowProps = {
  item: ListItem;
  isCheck: boolean;
  theme: Theme;
  onChangeText: (itemId: string, text: string) => void;
  onBackspace: (itemId: string) => boolean;
  onToggle: (itemId: string) => void;
  registerInput: (itemId: string, node: TextInput | null) => void;
};

/** One list item. Memoized: editing one item does not re-render the others. */
const ListItemRow = memo(function ListItemRow({
  item,
  isCheck,
  theme,
  onChangeText,
  onBackspace,
  onToggle,
  registerInput,
}: RowProps) {
  const done = isCheck && item.checked === true;
  const itemId = item.id;

  return (
    <View style={styles.item}>
      {isCheck ? (
        <Pressable
          accessibilityRole="checkbox"
          aria-checked={done}
          onPress={() => onToggle(itemId)}
          hitSlop={8}
          style={styles.marker}
        >
          <Ionicons name={done ? 'checkbox' : 'square-outline'} size={20} color={done ? theme.accent : theme.muted} />
        </Pressable>
      ) : (
        <View style={styles.marker}>
          <View style={[styles.bullet, { backgroundColor: theme.text }]} />
        </View>
      )}
      <AutoGrowTextInput
        ref={(node) => registerInput(itemId, node)}
        value={item.text}
        onChangeText={(text) => onChangeText(itemId, text)}
        onKeyPress={(e) => {
          // preventDefault: on web the keydown's default action would otherwise delete a
          // character in the newly focused previous item. No-op on native.
          if (e.nativeEvent.key === 'Backspace' && onBackspace(itemId)) e.preventDefault();
        }}
        placeholder="List item"
        placeholderTextColor={theme.muted}
        minHeight={ITEM_MIN_HEIGHT}
        style={[styles.input, { color: done ? theme.muted : theme.text }, done && styles.done]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  styleToggle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
  },
  styleToggleText: {
    fontSize: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  marker: {
    width: 28,
    height: ITEM_MIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 7,
  },
  done: {
    textDecorationLine: 'line-through',
  },
});
