'use client';

import { useCallback, useRef, useState } from 'react';
import {
  createHistoryStack,
  HistoryEntry,
  HistoryStackState,
  pushHistoryEntry,
  stepRedo,
  stepUndo
} from '../utils/historyStack';

export interface UseSceneHistoryOptions<T extends HistoryEntry> {
  captureSnapshot: (desc?: string) => T | null;
  restoreSnapshot: (snapshot: T) => Promise<void>;
  isRestoringExternal?: () => boolean;
  onUndoSuccess?: (snapshot: T) => void;
  onRedoSuccess?: (snapshot: T) => void;
  maxEntries?: number;
}

export function useSceneHistory<T extends HistoryEntry>({
  captureSnapshot,
  restoreSnapshot,
  isRestoringExternal,
  onUndoSuccess,
  onRedoSuccess,
  maxEntries = 60
}: UseSceneHistoryOptions<T>) {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const stackRef = useRef<HistoryStackState<T>>(createHistoryStack<T>(maxEntries));
  const isRestoringRef = useRef(false);

  const pushHistory = useCallback(
    (desc = '', isContinuous = false) => {
      if (isRestoringRef.current || isRestoringExternal?.()) return;
      const snapshot = captureSnapshot(desc);
      if (!snapshot) return;

      const res = pushHistoryEntry(stackRef.current, snapshot, desc, isContinuous);
      stackRef.current = res.stack;
      setCanUndo(res.canUndo);
      setCanRedo(res.canRedo);
    },
    [captureSnapshot, isRestoringExternal]
  );

  const handleUndo = useCallback(async () => {
    const res = stepUndo(stackRef.current);
    if (!res) return;

    stackRef.current = res.stack;
    setCanUndo(res.canUndo);
    setCanRedo(res.canRedo);

    await restoreSnapshot(res.entry);
    onUndoSuccess?.(res.entry);
  }, [restoreSnapshot, onUndoSuccess]);

  const handleRedo = useCallback(async () => {
    const res = stepRedo(stackRef.current);
    if (!res) return;

    stackRef.current = res.stack;
    setCanUndo(res.canUndo);
    setCanRedo(res.canRedo);

    await restoreSnapshot(res.entry);
    onRedoSuccess?.(res.entry);
  }, [restoreSnapshot, onRedoSuccess]);

  const resetHistory = useCallback(
    (initialEntry?: T | null) => {
      const nextStack = createHistoryStack<T>(maxEntries);
      if (initialEntry) {
        nextStack.entries = [initialEntry];
        nextStack.index = 0;
      }
      stackRef.current = nextStack;
      setCanUndo(false);
      setCanRedo(false);
    },
    [maxEntries]
  );

  return {
    canUndo,
    canRedo,
    isRestoringRef,
    pushHistory,
    handleUndo,
    handleRedo,
    resetHistory
  };
}
