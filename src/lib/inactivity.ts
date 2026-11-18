export const INACTIVITY_LIMIT_MS = 30_000;

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"] as const;

/** Runs once after the inactivity limit; any user activity restarts the timer. */
export function watchInactivity(
  onInactive: () => void,
  target: EventTarget = window,
  timeoutMs = INACTIVITY_LIMIT_MS,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const stop = () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    for (const event of ACTIVITY_EVENTS) target.removeEventListener(event, reset);
  };

  const reset = () => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      stop();
      onInactive();
    }, timeoutMs);
  };

  for (const event of ACTIVITY_EVENTS) target.addEventListener(event, reset, { passive: true });
  reset();
  return stop;
}
