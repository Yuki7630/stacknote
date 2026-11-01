import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '@/constants/theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
};

export function SearchBar({ value, onChangeText }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.box, { backgroundColor: theme.surface }]}>
      <Ionicons name="search" size={16} color={theme.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search notes"
        placeholderTextColor={theme.muted}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
        accessibilityLabel="Search notes"
        style={[styles.input, { color: theme.text }]}
      />
      {value !== '' && (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={theme.muted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
});
