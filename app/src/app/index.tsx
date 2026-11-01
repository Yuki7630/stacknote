import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AutoSyncToggle } from '@/components/AutoSyncToggle';
import { SearchBar } from '@/components/SearchBar';
import { SyncStatusIcon } from '@/components/SyncStatusIcon';
import { useContentWidth } from '@/constants/layout';
import { useTheme } from '@/constants/theme';
import { useNotesStore } from '@/store/notesStore';
import { reportActivity } from '@/sync/activity';
import type { Note } from '@/types/note';
import { formatUpdatedAt, notePreview } from '@/utils/notePreview';
import { noteMatches } from '@/utils/search';

export default function NoteListScreen() {
  const theme = useTheme();
  const notes = useNotesStore((s) => s.notes);
  const hydrated = useNotesStore((s) => s.hydrated);
  const createNote = useNotesStore((s) => s.createNote);
  const [query, setQuery] = useState('');
  const { contentStyle } = useContentWidth();

  const allNotes = useMemo(
    () => Object.values(notes).filter((n) => !n.deleted).sort((a, b) => b.updatedAt - a.updatedAt),
    [notes],
  );
  const visibleNotes = useMemo(() => allNotes.filter((n) => noteMatches(n, query)), [allNotes, query]);
  const searching = query.trim() !== '';

  const openNote = (id: string) => router.push({ pathname: '/note/[id]', params: { id } });

  const addNote = () => openNote(createNote());

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              <AutoSyncToggle />
              <SyncStatusIcon />
              <Pressable accessibilityRole="button" accessibilityLabel="New note" onPress={addNote} hitSlop={8}>
                <Ionicons name="create-outline" size={24} color={theme.accent} />
              </Pressable>
            </View>
          ),
        }}
      />
      {!hydrated ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.muted} />
        </View>
      ) : (
        <View style={styles.flex}>
          {(allNotes.length > 0 || searching) &&
            (contentStyle ? (
              <View style={contentStyle}>
                <SearchBar value={query} onChangeText={setQuery} />
              </View>
            ) : (
              <SearchBar value={query} onChangeText={setQuery} />
            ))}
          <FlatList
            data={visibleNotes}
            keyExtractor={(n) => n.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScroll={reportActivity}
            scrollEventThrottle={250}
            renderItem={({ item }) => <NoteRow note={item} onPress={() => openNote(item.id)} />}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
            contentContainerStyle={
              contentStyle
                ? [visibleNotes.length === 0 ? styles.center : styles.list, contentStyle]
                : visibleNotes.length === 0
                  ? styles.center
                  : styles.list
            }
            ListEmptyComponent={
              searching ? (
                <Text style={[styles.emptyText, { color: theme.muted }]}>No notes match “{query.trim()}”</Text>
              ) : (
                <View style={styles.empty}>
                  <Text style={[styles.emptyText, { color: theme.muted }]}>No notes yet</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={addNote}
                    style={[styles.emptyButton, { backgroundColor: theme.accent }]}
                  >
                    <Ionicons name="add" size={18} color="#ffffff" />
                    <Text style={styles.emptyButtonText}>New note</Text>
                  </Pressable>
                </View>
              )
            }
          />
        </View>
      )}
    </>
  );
}

function NoteRow({ note, onPress }: { note: Note; onPress: () => void }) {
  const theme = useTheme();
  const preview = notePreview(note);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.surface }]}
    >
      <Text style={[styles.title, { color: note.title ? theme.text : theme.muted }]} numberOfLines={1}>
        {note.title || 'Untitled'}
      </Text>
      <Text style={[styles.meta, { color: theme.muted }]} numberOfLines={1}>
        {formatUpdatedAt(note.updatedAt)}
        {preview ? `  ·  ${preview}` : ''}
      </Text>
    </Pressable>
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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingBottom: 24,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  meta: {
    fontSize: 14,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  empty: {
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
