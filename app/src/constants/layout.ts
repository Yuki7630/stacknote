import { useWindowDimensions, type ViewStyle } from 'react-native';

/** Max width of readable content on wide screens (PC browsers, tablets in landscape). */
export const CONTENT_MAX_WIDTH = 760;

type ContentWidth = {
  /** True when the window is wider than CONTENT_MAX_WIDTH. */
  wide: boolean;
  /** Centered max-width style for content containers; undefined on narrow screens (no change there). */
  contentStyle: ViewStyle | undefined;
  /** Empty space on each side of the centered content (0 on narrow screens). */
  gutter: number;
};

/**
 * Decided from the window width, not the platform: phones (narrower than 760 px)
 * get `undefined` and render exactly as before.
 */
export function useContentWidth(): ContentWidth {
  const { width } = useWindowDimensions();
  const wide = width > CONTENT_MAX_WIDTH;
  return {
    wide,
    contentStyle: wide ? { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' } : undefined,
    gutter: wide ? Math.floor((width - CONTENT_MAX_WIDTH) / 2) : 0,
  };
}
