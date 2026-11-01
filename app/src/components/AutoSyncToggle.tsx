import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/constants/theme';
import { useSettingsStore } from '@/store/settingsStore';

/** Header pill that turns auto sync on/off. Filled accent when on, outlined grey when off. */
export function AutoSyncToggle() {
  const theme = useTheme();
  const on = useSettingsStore((s) => s.autoSync);
  const setAutoSync = useSettingsStore((s) => s.setAutoSync);
  const color = on ? '#ffffff' : theme.muted;

  return (
    <Pressable
      accessibilityRole="switch"
      aria-checked={on}
      accessibilityLabel={`Auto sync ${on ? 'on' : 'off'}`}
      onPress={() => setAutoSync(!on)}
      hitSlop={8}
      style={[
        styles.pill,
        on ? { backgroundColor: theme.accent, borderColor: theme.accent } : { borderColor: theme.border },
      ]}
    >
      <Ionicons name={on ? 'sync-circle' : 'sync-circle-outline'} size={16} color={color} />
      <Text style={[styles.label, { color }]}>Auto</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
