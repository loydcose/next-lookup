import { useEffect, useState } from "react";
import { useHasHydrated } from "./useHasHydrated";

const STORAGE_KEY = "openedJobIds";

function readOpenedIds() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useOpenedJobs() {
  const hasHydrated = useHasHydrated();
  const [openedIds, setOpenedIds] = useState(() => new Set());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setOpenedIds(new Set(readOpenedIds()));
    setIsReady(true);
  }, []);

  function isOpened(jobId) {
    if (!hasHydrated || !isReady) {
      return false;
    }

    return openedIds.has(jobId);
  }

  function markOpened(jobId) {
    setOpenedIds((current) => {
      if (current.has(jobId)) {
        return current;
      }

      const next = new Set(current);
      next.add(jobId);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  return { isOpened, markOpened };
}
