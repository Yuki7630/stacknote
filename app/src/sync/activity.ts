// User activity signal for auto sync: typing/editing, touching or scrolling.
// Sources call reportActivity(); auto sync restarts its idle countdown on each call.

type Listener = () => void;

const listeners = new Set<Listener>();
const THROTTLE_MS = 250;
let lastReport = 0;
let held = false;

/**
 * Holds activity "on" for an interaction whose touches do not reach the JS responder
 * system (a block drag runs on the gesture handler). Auto sync never fires while held;
 * releasing counts as activity, so the idle countdown starts from the end of the drag.
 */
export function setActivityHold(on: boolean): void {
  held = on;
  lastReport = 0;
  reportActivity();
}

export function isActivityHeld(): boolean {
  return held;
}

export function reportActivity(): void {
  const now = Date.now();
  if (now - lastReport < THROTTLE_MS) return; // scroll events fire many times per second
  lastReport = now;
  for (const listener of listeners) listener();
}

export function onActivity(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Spread on a root View to see every touch start and move in the capture phase.
 * Returning false means the View never becomes the responder, so taps, inputs
 * and scroll views below behave exactly as before.
 */
export const activityCaptureProps = {
  onStartShouldSetResponderCapture: () => {
    reportActivity();
    return false;
  },
  onMoveShouldSetResponderCapture: () => {
    reportActivity();
    return false;
  },
};
