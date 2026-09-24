import { useEffect, useRef, useState } from "react";
import { useHasHydrated } from "./useHasHydrated";
import { readIdList, writeIdList } from "@/lib/local-storage";

const STORAGE_KEY = "seenJobIds";

export function useSeenJobs(jobs) {
  const hasHydrated = useHasHydrated();
  const snapshotRef = useRef(null);
  const [seenIdsAtLoad, setSeenIdsAtLoad] = useState(() => new Set());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (snapshotRef.current === null) {
      const storedIds = readIdList(STORAGE_KEY);
      snapshotRef.current = new Set(storedIds);
      setSeenIdsAtLoad(snapshotRef.current);
      setIsReady(true);
    }

    const nextIds = new Set(readIdList(STORAGE_KEY));

    for (const job of jobs) {
      nextIds.add(job.id);
    }

    writeIdList(STORAGE_KEY, nextIds);
  }, [jobs]);

  function isUnread(jobId) {
    if (!hasHydrated || !isReady) {
      return false;
    }

    return !seenIdsAtLoad.has(jobId);
  }

  return { isUnread, isReady };
}
