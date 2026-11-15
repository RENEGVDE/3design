import { describe, it, expect } from 'vitest';
import {
  createHistoryStack,
  pushHistoryEntry,
  stepUndo,
  stepRedo,
  HistoryEntry
} from '../historyStack';

interface TestSnapshot extends HistoryEntry {
  value: number;
}

describe('historyStack', () => {
  it('starts empty with canUndo and canRedo disabled', () => {
    const stack = createHistoryStack<TestSnapshot>();
    expect(stack.entries).toHaveLength(0);
    expect(stack.index).toBe(-1);
    expect(stepUndo(stack)).toBeNull();
    expect(stepRedo(stack)).toBeNull();
  });

  it('supports pushing, undoing, and redoing snapshots', () => {
    let stack = createHistoryStack<TestSnapshot>();

    let res = pushHistoryEntry(stack, { value: 1, desc: 'init' }, 'init', false, 100);
    stack = res.stack;
    expect(res.canUndo).toBe(false);
    expect(res.canRedo).toBe(false);

    res = pushHistoryEntry(stack, { value: 2, desc: 'move' }, 'move', false, 200);
    stack = res.stack;
    expect(res.canUndo).toBe(true);
    expect(res.canRedo).toBe(false);

    const undo1 = stepUndo(stack);
    expect(undo1).not.toBeNull();
    expect(undo1!.entry.value).toBe(1);
    expect(undo1!.canUndo).toBe(false);
    expect(undo1!.canRedo).toBe(true);
    stack = undo1!.stack;

    expect(stepUndo(stack)).toBeNull();

    const redo1 = stepRedo(stack);
    expect(redo1).not.toBeNull();
    expect(redo1!.entry.value).toBe(2);
    expect(redo1!.canUndo).toBe(true);
    expect(redo1!.canRedo).toBe(false);
  });

  it('truncates forward redo branch when pushing after an undo', () => {
    let stack = createHistoryStack<TestSnapshot>();
    stack = pushHistoryEntry(stack, { value: 1, desc: 'a' }, 'a', false, 100).stack;
    stack = pushHistoryEntry(stack, { value: 2, desc: 'b' }, 'b', false, 200).stack;
    stack = pushHistoryEntry(stack, { value: 3, desc: 'c' }, 'c', false, 300).stack;

    stack = stepUndo(stack)!.stack; // index at value 2
    const branchRes = pushHistoryEntry(stack, { value: 99, desc: 'branch' }, 'branch', false, 400);
    stack = branchRes.stack;

    expect(stack.entries.map((e) => e.value)).toEqual([1, 2, 99]);
    expect(branchRes.canRedo).toBe(false);
    expect(stepRedo(stack)).toBeNull();
  });

  it('coalesces continuous actions with the same description within 1200ms', () => {
    let stack = createHistoryStack<TestSnapshot>();
    stack = pushHistoryEntry(stack, { value: 1, desc: 'init' }, 'init', false, 100).stack;
    stack = pushHistoryEntry(stack, { value: 10, desc: 'drag' }, 'drag', true, 1000).stack;
    stack = pushHistoryEntry(stack, { value: 20, desc: 'drag' }, 'drag', true, 1500).stack;
    expect(stack.entries.map((e) => e.value)).toEqual([1, 20]);

    // After 1200ms window, pushes a new entry
    stack = pushHistoryEntry(stack, { value: 30, desc: 'drag' }, 'drag', true, 3000).stack;
    expect(stack.entries.map((e) => e.value)).toEqual([1, 20, 30]);
  });

  it('evicts oldest entry when exceeding maxEntries', () => {
    let stack = createHistoryStack<TestSnapshot>(3);
    stack = pushHistoryEntry(stack, { value: 1 }, '1', false, 100).stack;
    stack = pushHistoryEntry(stack, { value: 2 }, '2', false, 200).stack;
    stack = pushHistoryEntry(stack, { value: 3 }, '3', false, 300).stack;
    const res = pushHistoryEntry(stack, { value: 4 }, '4', false, 400);
    stack = res.stack;

    expect(stack.entries.map((e) => e.value)).toEqual([2, 3, 4]);
    expect(stack.index).toBe(2);
    expect(res.canUndo).toBe(true);
  });
});

