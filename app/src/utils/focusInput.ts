import { Platform, type TextInput } from 'react-native';

/** Sets the selection of a TextInput without changing focus. */
export function setCaret(input: TextInput | null | undefined, start: number, end: number = start): void {
  if (!input) return;
  if (Platform.OS === 'web') {
    // On web the host node is the <textarea>; setSelection is not implemented there.
    (input as unknown as HTMLTextAreaElement).setSelectionRange(start, end);
  } else {
    input.setSelection(start, end);
  }
}

/** Focuses a TextInput and puts the cursor at `position` (e.g. the end of its text). */
export function focusAt(input: TextInput | null | undefined, position: number): void {
  if (!input) return;
  input.focus();
  setCaret(input, position);
}
