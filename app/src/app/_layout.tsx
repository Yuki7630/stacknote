import { Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { LogBox, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useContentWidth } from '@/constants/layout';
import { useNavigationTheme, useTheme } from '@/constants/theme';
import { activityCaptureProps } from '@/sync/activity';
import { startAutoSync } from '@/sync/autoSync';
import { startSyncEngine } from '@/sync/syncEngine';

// react-native-draggable-flatlist 4.0.3 calls InteractionManager.runAfterInteractions
// (src/components/DraggableFlatList.tsx), which React Native 0.86 deprecates with a one-time
// warning. It is the library's code, not ours, and has no effect on behaviour, so only this exact
// message is hidden. Re-check when upgrading React Native or the library: the API will be removed.
LogBox.ignoreLogs(['InteractionManager has been deprecated']);

export default function RootLayout() {
  const theme = useTheme();
  const navigationTheme = useNavigationTheme();
  const { wide, gutter } = useContentWidth();
  // Wide screens: inset the header's left/right items so they line up with the centered content.
  // Web renders the header with @react-navigation/elements, which reads these container styles;
  // they are not part of the native-stack option types (spread, so no type override is needed)
  // and only apply when wide, so phones are unchanged.
  const headerInsets = wide
    ? { headerLeftContainerStyle: { paddingLeft: gutter }, headerRightContainerStyle: { paddingRight: gutter } }
    : {};

  useEffect(() => {
    const stopEngine = startSyncEngine();
    const stopAutoSync = startAutoSync();
    return () => {
      stopAutoSync();
      stopEngine();
    };
  }, []);

  return (
    // Gesture handler root is required by react-native-draggable-flatlist.
    <GestureHandlerRootView style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Sees every touch in the capture phase (without taking it) to detect user activity. */}
      <View style={styles.root} {...activityCaptureProps}>
        <ThemeProvider value={navigationTheme}>
          <Stack
            screenOptions={{
              ...headerInsets,
              headerStyle: { backgroundColor: theme.background },
              headerTintColor: theme.text,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: theme.background },
            }}
          >
            <Stack.Screen name="index" options={{ title: 'Notes' }} />
            <Stack.Screen name="note/[id]" options={{ title: '' }} />
          </Stack>
        </ThemeProvider>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
