import { useEffect, useRef, useState } from "react";
import { useHasHydrated } from "./useHasHydrated";

const STORAGE_KEY = "seenJobIds";

function readSeenIds() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useSeenJobs(jobs) {
  const hasHydrated = useHasHydrated();
  const snapshotRef = useRef(null);
  const [seenIdsAtLoad, setSeenIdsAtLoad] = useState(() => new Set());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (snapshotRef.current === null) {
      const storedIds = readSeenIds();
      snapshotRef.current = new Set(storedIds);
      setSeenIdsAtLoad(snapshotRef.current);
      setIsReady(true);
    }

    const nextIds = new Set(readSeenIds());

    for (const job of jobs) {
      nextIds.add(job.id);
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...nextIds]));
  }, [jobs]);

  function isUnread(jobId) {
    if (!hasHydrated || !isReady) {
      return false;
    }

    return !seenIdsAtLoad.has(jobId);
  }

  return { isUnread, isReady };
}
