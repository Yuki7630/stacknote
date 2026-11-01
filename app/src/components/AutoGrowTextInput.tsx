import { useLayoutEffect, useRef, useState, type Ref } from 'react';
import { Platform, StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { mapCaret } from '@/utils/caret';
import { setCaret } from '@/utils/focusInput';

type Props = Omit<TextInputProps, 'multiline' | 'scrollEnabled' | 'onContentSizeChange'> & {
  minHeight: number;
  ref?: Ref<TextInput>;
};

const isWeb = Platform.OS === 'web';

/**
 * Multiline TextInput whose height always equals its content height, so it never
 * scrolls internally and drags started on it scroll the parent list instead.
 *
 * Why an explicit height: on Android, ReactEditText blocks the parent ScrollView on
 * touch-down and only releases it on the first move if the EditText cannot scroll
 * (text layout height <= its inner height). `scrollEnabled` is iOS-only, and Yoga's
 * auto-measured height can be a few px shorter than the native text layout, which
 * makes the EditText scrollable and lets it capture the whole drag.
 * contentSize is computed natively as padding + layout height — the same numbers
 * Android uses for that check — so using it as the height keeps the input unscrollable.
 *
 * On web, react-native-web reports contentSize from scrollHeight, which never drops
 * below the current height, so the textarea is measured directly to allow shrinking.
 *
 * When `value` changes from outside while focused (a synced edit from another device),
 * the cursor is mapped onto the new text so it does not jump to the end.
 */
export function AutoGrowTextInput({
  minHeight,
  style,
  ref,
  onChangeText,
  onFocus,
  onBlur,
  onSelectionChange,
  ...props
}: Props) {
  const [height, setHeight] = useState(minHeight);
  const innerRef = useRef<TextInput | null>(null);
  const focused = useRef(false);
  const selection = useRef({ start: 0, end: 0 });
  // Last text this input emitted, to tell the user's own typing from external changes.
  const lastEmitted = useRef(props.value);
  const prevValue = useRef(props.value ?? '');

  const setRefs = (node: TextInput | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  useLayoutEffect(() => {
    if (!isWeb) return;
    // On web the host node of a TextInput is the <textarea>.
    const node = innerRef.current as unknown as HTMLTextAreaElement | null;
    if (!node) return;
    const previous = node.style.height;
    node.style.height = '0px';
    const measured = node.scrollHeight;
    node.style.height = previous;
    setHeight(Math.max(minHeight, Math.ceil(measured)));
  }, [props.value, minHeight]);

  useLayoutEffect(() => {
    const next = props.value ?? '';
    const prev = prevValue.current;
    prevValue.current = next;
    if (next === prev || next === lastEmitted.current || !focused.current) return;
    const { start, end } = selection.current;
    const mapped = { start: mapCaret(prev, next, start), end: mapCaret(prev, next, end) };
    selection.current = mapped;
    setCaret(innerRef.current, mapped.start, mapped.end);
  }, [props.value]);

  return (
    <TextInput
      {...props}
      ref={setRefs}
      onChangeText={(text) => {
        lastEmitted.current = text;
        onChangeText?.(text);
      }}
      onFocus={(e) => {
        focused.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.current = false;
        onBlur?.(e);
      }}
      onSelectionChange={(e) => {
        selection.current = e.nativeEvent.selection;
        onSelectionChange?.(e);
      }}
      multiline
      scrollEnabled={false}
      textAlignVertical="top"
      onContentSizeChange={
        isWeb ? undefined : (e) => setHeight(Math.max(minHeight, Math.ceil(e.nativeEvent.contentSize.height)))
      }
      style={[styles.reset, style, { height }]}
    />
  );
}

const styles = StyleSheet.create({
  reset: {
    paddingHorizontal: 0,
  },
});
