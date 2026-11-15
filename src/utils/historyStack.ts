export interface HistoryEntry {
  desc?: string;
}

export interface HistoryStackState<T extends HistoryEntry> {
  entries: T[];
  index: number;
  maxEntries: number;
  lastContinuousAction: { desc: string; time: number } | null;
}

export interface HistoryStepResult<T extends HistoryEntry> {
  stack: HistoryStackState<T>;
  entry: T;
  canUndo: boolean;
  canRedo: boolean;
}

export function createHistoryStack<T extends HistoryEntry>(
  maxEntries = 60
): HistoryStackState<T> {
  return {
    entries: [],
    index: -1,
    maxEntries,
    lastContinuousAction: null
  };
}

export function pushHistoryEntry<T extends HistoryEntry>(
  stack: HistoryStackState<T>,
  entry: T,
  desc = '',
  isContinuous = false,
  nowMs: number = typeof performance !== 'undefined' ? performance.now() : Date.now()
): { stack: HistoryStackState<T>; canUndo: boolean; canRedo: boolean } {
  const last = stack.lastContinuousAction;

  if (isContinuous && last && last.desc === desc && nowMs - last.time < 1200) {
    const curIdx = stack.index;
    if (curIdx >= 0 && stack.entries[curIdx]) {
      const nextEntries = stack.entries.slice();
      nextEntries[curIdx] = entry;
      return {
        stack: {
          ...stack,
          entries: nextEntries,
          lastContinuousAction: { desc, time: nowMs }
        },
        canUndo: curIdx > 0,
        canRedo: curIdx < nextEntries.length - 1
      };
    }
  }

  const truncated = stack.entries.slice(0, stack.index + 1);
  truncated.push(entry);
  if (truncated.length > stack.maxEntries) {
    truncated.shift();
  }

  const nextIdx = truncated.length - 1;
  return {
    stack: {
      ...stack,
      entries: truncated,
      index: nextIdx,
      lastContinuousAction: isContinuous ? { desc, time: nowMs } : null
    },
    canUndo: nextIdx > 0,
    canRedo: false
  };
}

export function stepUndo<T extends HistoryEntry>(
  stack: HistoryStackState<T>
): HistoryStepResult<T> | null {
  if (stack.index <= 0) return null;
  const targetIdx = stack.index - 1;
  const entry = stack.entries[targetIdx];
  if (!entry) return null;

  return {
    stack: {
      ...stack,
      index: targetIdx
    },
    entry,
    canUndo: targetIdx > 0,
    canRedo: true
  };
}

export function stepRedo<T extends HistoryEntry>(
  stack: HistoryStackState<T>
): HistoryStepResult<T> | null {
  if (stack.index >= stack.entries.length - 1) return null;
  const targetIdx = stack.index + 1;
  const entry = stack.entries[targetIdx];
  if (!entry) return null;

  return {
    stack: {
      ...stack,
      index: targetIdx
    },
    entry,
    canUndo: true,
    canRedo: targetIdx < stack.entries.length - 1
  };
}

