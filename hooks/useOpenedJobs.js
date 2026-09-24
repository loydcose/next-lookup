import { useEffect, useState } from "react";
import { useHasHydrated } from "./useHasHydrated";
import { readIdList, writeIdList } from "@/lib/local-storage";

const STORAGE_KEY = "openedJobIds";

export function useOpenedJobs() {
  const hasHydrated = useHasHydrated();
  const [openedIds, setOpenedIds] = useState(() => new Set());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setOpenedIds(new Set(readIdList(STORAGE_KEY)));
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
      writeIdList(STORAGE_KEY, next);
      return next;
    });
  }

  return { isOpened, markOpened };
}
