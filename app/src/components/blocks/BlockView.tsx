import { Ionicons } from '@react-native-vector-icons/ionicons';
import { memo, useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { ScaleDecorator } from 'react-native-draggable-flatlist';

import { useTheme } from '@/constants/theme';
import type { Block } from '@/types/note';

import { ListBlock } from './ListBlock';
import { TableBlock } from './TableBlock';
import { TextBlock } from './TextBlock';

type Props = {
  block: Block;
  noteId: string;
  /** Called with this block when its remove button is pressed (stable function from the editor). */
  onRemove: (block: Block) => void;
  /** Starts dragging this block (from react-native-draggable-flatlist). Native only. */
  drag: () => void;
  isActive: boolean;
  /** Web only: called with the handle's DOM pointerdown and this block's id (WebReorderableList). */
  onWebDragStart?: (event: PointerEvent, blockId: string) => void;
};

/**
 * Renders a block by type, with a drag handle on the left and a remove button on the right.
 * Reordering starts only from a long press on the handle, never from the inputs.
 *
 * Memoized: all props are stable except `block` (a new object only when this block is edited)
 * and `isActive`, so typing in one block does not re-render the others.
 */
export const BlockView = memo(function BlockView({ block, noteId, onRemove, drag, isActive, onWebDragStart }: Props) {
  const theme = useTheme();

  const row = (
    <View style={[styles.row, isActive && { backgroundColor: theme.surface }]}>
      {Platform.OS === 'web' ? (
        <WebDragHandle blockId={block.id} onStart={onWebDragStart} active={isActive} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reorder block (press and hold, then drag)"
          onLongPress={drag}
          delayLongPress={200}
          disabled={isActive}
          hitSlop={6}
          style={styles.handle}
        >
          <Ionicons name="reorder-three" size={20} color={isActive ? theme.accent : theme.muted} />
        </Pressable>
      )}
      <View style={styles.content}>{renderBlock(block, noteId)}</View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Remove block"
        onPress={() => onRemove(block)}
        hitSlop={8}
        style={styles.remove}
      >
        <Ionicons name="trash-outline" size={16} color={theme.muted} />
      </Pressable>
    </View>
  );

  // ScaleDecorator needs the DraggableFlatList context, which only exists on native.
  return Platform.OS === 'web' ? row : <ScaleDecorator activeScale={1.02}>{row}</ScaleDecorator>;
});

/** Web drag handle: listens to the DOM pointerdown directly (no long press with a mouse). */
function WebDragHandle({
  blockId,
  onStart,
  active,
}: {
  blockId: string;
  onStart?: (event: PointerEvent, blockId: string) => void;
  active: boolean;
}) {
  const theme = useTheme();
  const ref = useRef<View>(null);

  useEffect(() => {
    // On web the host node of a View is its DOM element.
    const el = ref.current as unknown as HTMLElement | null;
    if (!el || !onStart) return;
    // Web-only CSS that RN style types do not cover: grab cursor, no browser touch scrolling.
    el.style.cursor = 'grab';
    el.style.touchAction = 'none';
    const onPointerDown = (event: PointerEvent) => onStart(event, blockId);
    el.addEventListener('pointerdown', onPointerDown);
    return () => el.removeEventListener('pointerdown', onPointerDown);
  }, [onStart, blockId]);

  return (
    <View ref={ref} accessibilityRole="button" accessibilityLabel="Reorder block (drag)" style={styles.handle}>
      <Ionicons name="reorder-three" size={20} color={active ? theme.accent : theme.muted} />
    </View>
  );
}

function renderBlock(block: Block, noteId: string) {
  switch (block.type) {
    case 'text':
      return <TextBlock noteId={noteId} block={block} />;
    case 'list':
      return <ListBlock noteId={noteId} block={block} />;
    case 'table':
      return <TableBlock noteId={noteId} block={block} />;
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    borderRadius: 8,
  },
  handle: {
    width: 24,
    paddingTop: 10,
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  remove: {
    paddingTop: 12,
    paddingLeft: 4,
  },
});
