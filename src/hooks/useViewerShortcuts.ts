'use client';

import { useEffect } from 'react';

export type GizmoTransformMode = 'translate' | 'rotate' | 'scale' | null;

export interface UseViewerShortcutsOptions {
  onUndo: () => void;
  onRedo: () => void;
  hasSelectedModel: () => boolean;
  onSetGizmoMode: (mode: GizmoTransformMode) => void;
  onCancelPlacement: () => void;
}

export function useViewerShortcuts({
  onUndo,
  onRedo,
  hasSelectedModel,
  onSetGizmoMode,
  onCancelPlacement
}: UseViewerShortcutsOptions) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (isCtrlOrMeta) {
        const tag = document.activeElement?.tagName?.toLowerCase() || '';
        const activeInput = document.activeElement as HTMLInputElement | null;
        const isTextInput =
          tag === 'input' &&
          activeInput?.type !== 'range' &&
          activeInput?.type !== 'color';
        if (!isTextInput && tag !== 'textarea') {
          if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
            e.preventDefault();
            onUndo();
            return;
          } else if (
            e.key === 'y' ||
            e.key === 'Y' ||
            ((e.key === 'z' || e.key === 'Z') && e.shiftKey)
          ) {
            e.preventDefault();
            onRedo();
            return;
          }
        }
      }

      const activeTag = document.activeElement?.tagName || '';
      if (!hasSelectedModel() || ['INPUT', 'TEXTAREA'].includes(activeTag)) {
        return;
      }

      const k = e.key.toLowerCase();
      if (k === 'w') onSetGizmoMode('translate');
      else if (k === 'e') onSetGizmoMode('rotate');
      else if (k === 'r') onSetGizmoMode('scale');
      else if (k === 'escape') {
        onSetGizmoMode(null);
        onCancelPlacement();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onUndo, onRedo, hasSelectedModel, onSetGizmoMode, onCancelPlacement]);
}

