import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { Pressable } from 'react-native';

import { useTheme, type Theme } from '@/constants/theme';
import { useSyncStatusStore, type SyncStatus } from '@/store/syncStatusStore';
import { syncNow } from '@/sync/syncEngine';

const ICONS: Record<SyncStatus, IoniconsIconName> = {
  synced: 'cloud-done-outline',
  syncing: 'sync-outline',
  offline: 'cloud-offline-outline',
  error: 'warning-outline',
};

const LABELS: Record<SyncStatus, string> = {
  synced: 'Synced',
  syncing: 'Syncing',
  offline: 'Offline',
  error: 'Sync error',
};

function colorFor(status: SyncStatus, theme: Theme): string {
  switch (status) {
    case 'synced':
      return theme.muted;
    case 'syncing':
      return theme.accent;
    case 'offline':
      return theme.muted;
    case 'error':
      return theme.danger;
  }
}

/** Header icon showing the sync status. Tap to sync now. */
export function SyncStatusIcon() {
  const theme = useTheme();
  const status = useSyncStatusStore((s) => s.status);
  const message = useSyncStatusStore((s) => s.message);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${LABELS[status]}${message ? `: ${message}` : ''}. Tap to sync now.`}
      onPress={() => void syncNow()}
      hitSlop={8}
    >
      <Ionicons name={ICONS[status]} size={22} color={colorFor(status, theme)} />
    </Pressable>
  );
}
