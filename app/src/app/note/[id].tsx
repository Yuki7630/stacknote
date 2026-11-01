import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';

import { AutoGrowTextInput } from '@/components/AutoGrowTextInput';
import { WebReorderableList } from '@/components/WebReorderableList';
import { BlockToolbar } from '@/components/blocks/BlockToolbar';
import { BlockView } from '@/components/blocks/BlockView';
import { SyncStatusIcon } from '@/components/SyncStatusIcon';
import { useContentWidth } from '@/constants/layout';
import { useTheme } from '@/constants/theme';
import { useNotesStore } from '@/store/notesStore';
import { reportActivity, setActivityHold } from '@/sync/activity';
import type { Block } from '@/types/note';
import { confirm } from '@/utils/confirm';
import { blockText } from '@/utils/notePreview';

const noop = () => {};

export default function NoteEditorScreen() {
  const theme = useTheme();
  const headerHeight = useHeaderHeight();
  const { contentStyle } = useContentWidth();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Select only the fields rendered here, not the whole note: a sync replaces the note object
  // (markPushed clears `dirty`) without changing these, and re-rendering the draggable list then
  // made the block that was just dragged jump back for a moment on Android.
  const title = useNotesStore((s) => s.notes[id]?.title);
  const blocks = useNotesStore((s) => s.notes[id]?.blocks);
  const deleted = useNotesStore((s) => s.notes[id]?.deleted === true);
  const hydrated = useNotesStore((s) => s.hydrated);
  const updateNote = useNotesStore((s) => s.updateNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const addBlock = useNotesStore((s) => s.addBlock);
  const removeBlock = useNotesStore((s) => s.removeBlock);
  const moveBlock = useNotesStore((s) => s.moveBlock);

  const onRemoveBlock = async (block: Block) => {
    const hasContent = blockText(block).trim() !== '';
    if (hasContent && !(await confirm('Delete block?', 'Its contents will be removed.', 'Delete'))) return;
    removeBlock(id, block.id);
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const onDelete = async () => {
    if (await confirm('Delete note?', 'This note will be removed from the list.', 'Delete')) {
      deleteNote(id);
      goBack();
    }
  };

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.muted} />
      </View>
    );
  }

  if (title === undefined || blocks === undefined || deleted) {
    return (
      <View style={styles.center}>
        <Text style={{ color: theme.muted }}>Note not found</Text>
      </View>
    );
  }

  // Shared by the web and native lists. Passed as an element (not a component) so the title
  // input is not remounted on every render. Multiline so long titles wrap instead of scrolling
  // horizontally (a horizontally scrollable EditText also captures vertical drags on Android);
  // Enter still blurs.
  const titleInput = (
    <AutoGrowTextInput
      value={title}
      onChangeText={(text) => updateNote(id, { title: text.replace(/\n/g, ' ') })}
      placeholder="Title"
      placeholderTextColor={theme.muted}
      minHeight={56}
      style={[styles.title, { color: theme.text }]}
      submitBehavior="blurAndSubmit"
      returnKeyType="done"
      autoFocus={title === ''}
    />
  );
  const toolbar = <BlockToolbar onInsert={(type) => addBlock(id, type)} />;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
      keyboardVerticalOffset={headerHeight}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              <SyncStatusIcon />
              <Pressable accessibilityRole="button" accessibilityLabel="Delete note" onPress={onDelete} hitSlop={8}>
                <Ionicons name="trash-outline" size={22} color={theme.danger} />
              </Pressable>
            </View>
          ),
        }}
      />
      {Platform.OS === 'web' ? (
        // Web: DraggableFlatList's drag does not work with a mouse (see WebReorderableList).
        <WebReorderableList
          data={blocks}
          keyExtractor={(b) => b.id}
          contentContainerStyle={contentStyle ? [styles.content, contentStyle] : styles.content}
          ListHeaderComponent={titleInput}
          ListFooterComponent={toolbar}
          onReorder={(from, to) => moveBlock(id, from, to)} // sets updatedAt + dirty, so the new order syncs
          renderItem={({ item, onDragStart, isDragging }) => (
            <BlockView
              block={item}
              noteId={id}
              onRemove={onRemoveBlock}
              drag={noop}
              isActive={isDragging}
              onWebDragStart={onDragStart}
            />
          )}
        />
      ) : (
        <DraggableFlatList
          data={blocks}
          keyExtractor={(b) => b.id}
          containerStyle={styles.flex}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          // The list's own onScroll is used by the library; this is its JS scroll callback.
          onScrollOffsetChange={reportActivity}
          // Pan only becomes a drag after 16 px of vertical movement, so horizontal drags
          // stay with the table's ScrollView. Dragging starts only from the handle (long press).
          activationDistance={16}
          onDragBegin={() => {
            Keyboard.dismiss();
            setActivityHold(true);
          }}
          onDragEnd={({ from, to }) => {
            moveBlock(id, from, to); // sets updatedAt + dirty, so the new order syncs
            setActivityHold(false);
          }}
          contentContainerStyle={contentStyle ? [styles.content, contentStyle] : styles.content}
          ListHeaderComponent={titleInput}
          // BlockView is memoized and every prop here is stable except `item`/`isActive`,
          // so editing one block re-renders only that block.
          renderItem={({ item, drag, isActive }) => (
            <BlockView
              block={item}
              noteId={id}
              onRemove={onRemoveBlock}
              drag={drag}
              isActive={isActive}
            />
          )}
          ListFooterComponent={toolbar}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    paddingVertical: 12,
  },
});
