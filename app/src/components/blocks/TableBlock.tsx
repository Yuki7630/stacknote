import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { memo } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AutoGrowTextInput } from '@/components/AutoGrowTextInput';
import { useTheme, type Theme } from '@/constants/theme';
import { useNotesStore } from '@/store/notesStore';
import { reportActivity } from '@/sync/activity';
import type { TableBlock as TableBlockData } from '@/types/note';
import { confirm } from '@/utils/confirm';
import { exportTableCsv } from '@/utils/exportCsv';
import { addColumn, addRow, removeColumn, removeRow, setCell, setColumnName } from '@/utils/tableOps';

import { commitBlock, readBlock } from '@/store/blockActions';

type Props = {
  noteId: string;
  block: TableBlockData;
};

/** Header row index passed to onCellChange (data rows are 0..rows.length-1). */
const HEADER_ROW = -1;

const CELL_WIDTH = 120;
const CELL_MIN_HEIGHT = 36;
const ACTION_SIZE = 28;

export function TableBlock({ noteId, block }: Props) {
  const theme = useTheme();
  const blockId = block.id;
  const canRemoveColumn = block.columns.length > 1;
  const canRemoveRow = block.rows.length > 1;

  // Handlers read the latest block from the store at event time (also after an awaited
  // confirm dialog) and depend only on noteId/blockId, so memoized cells keep their props.
  const readTable = (): TableBlockData | undefined => {
    const current = readBlock(noteId, blockId);
    return current?.type === 'table' ? current : undefined;
  };

  const edit = (fn: (t: TableBlockData) => TableBlockData) => {
    const current = readTable();
    if (current) commitBlock(noteId, current, fn(current));
  };

  const onCellChange = (row: number, col: number, text: string) =>
    edit((t) => (row === HEADER_ROW ? setColumnName(t, col, text) : setCell(t, row, col, text)));

  const onRemoveColumn = async (col: number) => {
    const current = readTable();
    if (!current) return;
    const hasContent = current.columns[col] !== '' || current.rows.some((r) => (r[col] ?? '') !== '');
    if (hasContent && !(await confirm('Delete column?', 'Its contents will be removed.', 'Delete'))) return;
    edit((t) => removeColumn(t, col));
  };

  const onRemoveRow = async (row: number) => {
    const current = readTable();
    if (!current) return;
    const hasContent = (current.rows[row] ?? []).some((c) => c !== '');
    if (hasContent && !(await confirm('Delete row?', 'Its contents will be removed.', 'Delete'))) return;
    edit((t) => removeRow(t, row));
  };

  const onExport = async () => {
    const current = readTable();
    if (!current) return;
    // Read the title at export time instead of taking it as a prop: a title prop would
    // re-render every block whenever the title is typed.
    const title = useNotesStore.getState().notes[noteId]?.title || 'table';
    try {
      await exportTableCsv(current, title);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (Platform.OS === 'web') window.alert(`Export failed: ${message}`);
      else Alert.alert('Export failed', message);
    }
  };

  return (
    <View style={styles.container}>
      {/*
        Horizontal only: vertical drags fall through to the editor's FlatList.
        Cells are AutoGrowTextInputs, which never scroll internally, so Android releases
        the touch on the first move and the ScrollView whose axis matches the drag takes it.
      */}
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="handled"
        directionalLockEnabled
        onScroll={reportActivity}
        scrollEventThrottle={250}
      >
        <View>
          <View style={styles.row}>
            {block.columns.map((_, col) => (
              <View key={col} style={styles.columnAction}>
                {canRemoveColumn && (
                  <IconButton label={`Delete column ${col + 1}`} color={theme.muted} onPress={() => onRemoveColumn(col)} />
                )}
              </View>
            ))}
          </View>

          <View style={styles.row}>
            {block.columns.map((name, col) => (
              <Cell
                key={col}
                row={HEADER_ROW}
                col={col}
                value={name}
                placeholder={`Column ${col + 1}`}
                header
                theme={theme}
                onCellChange={onCellChange}
              />
            ))}
            <View style={styles.rowAction} />
          </View>

          {block.rows.map((cells, row) => (
            // alignItems: 'stretch' makes every cell as tall as the tallest one in the row.
            <View key={row} style={styles.row}>
              {cells.map((value, col) => (
                <Cell key={col} row={row} col={col} value={value} theme={theme} onCellChange={onCellChange} />
              ))}
              <View style={styles.rowAction}>
                {canRemoveRow && (
                  <IconButton label={`Delete row ${row + 1}`} color={theme.muted} onPress={() => onRemoveRow(row)} />
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.toolbar}>
        <ToolbarButton icon="add" label="Row" a11y="Add row" theme={theme} onPress={() => edit(addRow)} />
        <ToolbarButton
          icon="add"
          label="Column"
          a11y="Add column"
          theme={theme}
          onPress={() => edit(addColumn)}
        />
        <ToolbarButton icon="share-outline" label="CSV" a11y="Export table as CSV" theme={theme} onPress={onExport} />
      </View>
    </View>
  );
}

type CellProps = {
  row: number;
  col: number;
  value: string;
  placeholder?: string;
  header?: boolean;
  theme: Theme;
  onCellChange: (row: number, col: number, text: string) => void;
};

/**
 * The cell wrapper stretches to the row height; the input inside keeps its content height.
 * Memoized: typing in one cell re-renders only that cell (props of the others do not change).
 */
const Cell = memo(function Cell({ row, col, value, placeholder, header = false, theme, onCellChange }: CellProps) {
  const firstColumn = col === 0;
  return (
    <View
      style={[
        styles.cell,
        { borderColor: theme.border },
        header && { borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: theme.surface },
        firstColumn && { borderLeftWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <AutoGrowTextInput
        value={value}
        onChangeText={(text) => onCellChange(row, col, text)}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        minHeight={CELL_MIN_HEIGHT}
        style={[styles.cellInput, { color: theme.text }, header && styles.headerText]}
      />
    </View>
  );
});

function IconButton({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={styles.iconButton}>
      <Ionicons name="close" size={14} color={color} />
    </Pressable>
  );
}

function ToolbarButton({
  icon,
  label,
  a11y,
  theme,
  onPress,
}: {
  icon: IoniconsIconName;
  label: string;
  a11y: string;
  theme: Theme;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={[styles.toolbarButton, { backgroundColor: theme.surface }]}
    >
      <Ionicons name={icon} size={14} color={theme.text} />
      <Text style={[styles.toolbarText, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  columnAction: {
    width: CELL_WIDTH,
    height: ACTION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowAction: {
    width: ACTION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    width: CELL_WIDTH,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cellInput: {
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  headerText: {
    fontWeight: '600',
  },
  iconButton: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  toolbarText: {
    fontSize: 13,
  },
});
