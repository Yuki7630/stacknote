import { StyleSheet } from 'react-native';

import { AutoGrowTextInput } from '@/components/AutoGrowTextInput';
import { useTheme } from '@/constants/theme';
import type { TextBlock as TextBlockData } from '@/types/note';

import { commitBlock, readBlock } from '@/store/blockActions';

type Props = {
  noteId: string;
  block: TextBlockData;
};

export function TextBlock({ noteId, block }: Props) {
  const theme = useTheme();
  const blockId = block.id;

  const onChangeText = (text: string) => {
    const current = readBlock(noteId, blockId);
    if (current?.type !== 'text' || current.text === text) return;
    commitBlock(noteId, current, { ...current, text });
  };

  return (
    <AutoGrowTextInput
      value={block.text}
      onChangeText={onChangeText}
      placeholder="Type something…"
      placeholderTextColor={theme.muted}
      minHeight={40}
      style={[styles.input, { color: theme.text }]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 8,
  },
});
