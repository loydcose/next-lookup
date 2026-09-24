import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

// false during SSR and the hydration render, true afterwards.
export function useHasHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
