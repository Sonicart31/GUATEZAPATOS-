import { afterEach, describe, expect, it, vi } from "vitest";

import { INACTIVITY_LIMIT_MS, watchInactivity } from "@/lib/inactivity";

afterEach(() => vi.useRealTimers());

describe("cierre de sesión por inactividad", () => {
  it("cierra la sesión después de exactamente 30 segundos sin actividad", () => {
    vi.useFakeTimers();
    const onInactive = vi.fn();
    const stop = watchInactivity(onInactive, new EventTarget());

    expect(INACTIVITY_LIMIT_MS).toBe(30_000);
    vi.advanceTimersByTime(29_999);
    expect(onInactive).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onInactive).toHaveBeenCalledTimes(1);
    stop();
  });

  it("reinicia los 30 segundos cuando el usuario interactúa", () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const onInactive = vi.fn();
    const stop = watchInactivity(onInactive, target);

    vi.advanceTimersByTime(29_000);
    target.dispatchEvent(new Event("pointerdown"));
    vi.advanceTimersByTime(29_000);
    expect(onInactive).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(onInactive).toHaveBeenCalledTimes(1);
    stop();
  });
});
