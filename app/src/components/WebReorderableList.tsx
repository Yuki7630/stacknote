import { useEffect, useRef, useState, type ReactElement } from 'react';
import { FlatList, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/constants/theme';
import { reportActivity, setActivityHold } from '@/sync/activity';

// WEB ONLY. react-native-draggable-flatlist does not work on web: the gesture-handler
// wrapper of its inner ScrollView activates after 15 px of pointer movement in any
// direction (it ignores scrollEnabled={false} on web) and cancels the drag Pan, which
// needs 16 px. This list uses a plain FlatList and drives the drag with DOM pointer
// events on window. Native platforms keep DraggableFlatList.

const EDGE_PX = 60; // distance from the top/bottom edge where auto-scroll starts
const MAX_SCROLL_PX = 16; // auto-scroll speed per animation frame at the very edge

type DragState = { from: number; drop: number };

/** Turns off text selection on the page while dragging; returns a function that restores it. */
function disableTextSelection(): () => void {
  const previous = document.body.style.userSelect;
  document.body.style.userSelect = 'none';
  return () => {
    document.body.style.userSelect = previous;
  };
}

export type WebRenderItemInfo<T> = {
  item: T;
  index: number;
  /**
   * Call from the drag handle's DOM `pointerdown` with the item's key. The same function for
   * every item and every render, so memoized items are not re-rendered because of it.
   */
  onDragStart: (event: PointerEvent, key: string) => void;
  isDragging: boolean;
};

type Props<T> = {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (info: WebRenderItemInfo<T>) => ReactElement;
  onReorder: (from: number, to: number) => void;
  ListHeaderComponent?: ReactElement;
  ListFooterComponent?: ReactElement;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export function WebReorderableList<T>({
  data,
  keyExtractor,
  renderItem,
  onReorder,
  ListHeaderComponent,
  ListFooterComponent,
  contentContainerStyle,
}: Props<T>) {
  const theme = useTheme();
  const listRef = useRef<FlatList<T>>(null);
  const itemNodes = useRef(new Map<number, HTMLElement>());
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDragState] = useState<DragState | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  // Latest props for the drag handlers. Synced in an effect (refs must not be written during
  // render); handlers only run on later pointer events, so they always see current values.
  const dataRef = useRef(data);
  const keyExtractorRef = useRef(keyExtractor);
  const onReorderRef = useRef(onReorder);
  useEffect(() => {
    dataRef.current = data;
    keyExtractorRef.current = keyExtractor;
    onReorderRef.current = onReorder;
  });

  const setDrag = (next: DragState | null) => {
    dragRef.current = next;
    setDragState(next);
  };

  // End any drag in progress if the list unmounts mid-drag.
  useEffect(() => () => stopRef.current?.(), []);

  /** Drop slot under pointer Y: i = before item i, data.length = after the last item. */
  const dropIndexAt = (clientY: number): number => {
    const count = dataRef.current.length;
    for (let i = 0; i < count; i++) {
      const node = itemNodes.current.get(i);
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return count;
  };

  const onDragStart = (event: PointerEvent, key: string) => {
    if (event.button !== 0 || dragRef.current) return;
    const index = dataRef.current.findIndex((item) => keyExtractorRef.current(item) === key);
    if (index < 0) return;
    event.preventDefault(); // no text selection / native drag while reordering
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

    const scrollNode: HTMLElement | null = listRef.current?.getScrollableNode() ?? null;
    let pointerY = event.clientY;
    let frame = 0;
    const restoreUserSelect = disableTextSelection();
    setActivityHold(true); // auto sync waits until the drag ends
    setDrag({ from: index, drop: index });

    const updateDrop = () => {
      const current = dragRef.current;
      if (!current) return;
      const drop = dropIndexAt(pointerY);
      if (drop !== current.drop) setDrag({ from: current.from, drop });
    };

    const autoScroll = () => {
      frame = requestAnimationFrame(autoScroll);
      if (!scrollNode) return;
      const rect = scrollNode.getBoundingClientRect();
      let delta = 0;
      if (pointerY < rect.top + EDGE_PX) {
        delta = -MAX_SCROLL_PX * Math.min(1, (rect.top + EDGE_PX - pointerY) / EDGE_PX);
      } else if (pointerY > rect.bottom - EDGE_PX) {
        delta = MAX_SCROLL_PX * Math.min(1, (pointerY - (rect.bottom - EDGE_PX)) / EDGE_PX);
      }
      if (delta !== 0) {
        scrollNode.scrollTop += delta;
        updateDrop();
      }
    };
    frame = requestAnimationFrame(autoScroll);

    const onMove = (e: PointerEvent) => {
      pointerY = e.clientY;
      updateDrop();
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey);
      restoreUserSelect();
      stopRef.current = null;
      setDrag(null);
      setActivityHold(false);
    };

    const onUp = () => {
      const current = dragRef.current;
      stop();
      if (!current) return;
      // Dropping into slot `drop` means landing at drop - 1 when moving down (the item leaves its old slot).
      const to = current.drop > current.from ? current.drop - 1 : current.drop;
      if (to !== current.from) onReorderRef.current(current.from, to);
      reportActivity();
    };

    const onCancel = () => stop();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stop();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey);
    stopRef.current = stop;
  };

  // Show the drop line only where the item would actually move.
  const showLineAt = (slot: number) => !!drag && slot === drag.drop && slot !== drag.from && slot !== drag.from + 1;

  return (
    <FlatList
      ref={listRef}
      data={data}
      extraData={drag}
      keyExtractor={keyExtractor}
      keyboardShouldPersistTaps="handled"
      onScroll={reportActivity}
      scrollEventThrottle={250}
      contentContainerStyle={contentContainerStyle}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      renderItem={({ item, index }) => (
        <View
          ref={(node) => {
            // On web the host node of a View is its DOM element.
            const el = node as unknown as HTMLElement | null;
            if (el) itemNodes.current.set(index, el);
            else itemNodes.current.delete(index);
          }}
          style={[styles.item, drag?.from === index && styles.dragging]}
        >
          {showLineAt(index) && <View style={[styles.line, styles.lineTop, { backgroundColor: theme.accent }]} />}
          {renderItem({ item, index, onDragStart, isDragging: drag?.from === index })}
          {index === data.length - 1 && showLineAt(data.length) && (
            <View style={[styles.line, styles.lineBottom, { backgroundColor: theme.accent }]} />
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  item: {
    position: 'relative',
  },
  dragging: {
    opacity: 0.45,
  },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
    zIndex: 1,
  },
  lineTop: {
    top: -2,
  },
  lineBottom: {
    bottom: -2,
  },
});
