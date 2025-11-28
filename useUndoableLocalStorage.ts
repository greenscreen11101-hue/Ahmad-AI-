
import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface UndoableState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useUndoableLocalStorage<T>(key: string, initialPresent: T | (() => T)) {
  const [history, setHistory] = useLocalStorage<UndoableState<T>>(key, () => {
    const present = initialPresent instanceof Function ? initialPresent() : initialPresent;
    return {
      past: [],
      present,
      future: [],
    };
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // FIX: Use functional update to avoid stale state for history. This is more robust.
  const undo = useCallback(() => {
    setHistory(currentHistory => {
      if (currentHistory.past.length === 0) return currentHistory;
      
      const previous = currentHistory.past[currentHistory.past.length - 1];
      const newPast = currentHistory.past.slice(0, currentHistory.past.length - 1);
      
      return {
        past: newPast,
        present: previous,
        future: [currentHistory.present, ...currentHistory.future],
      };
    });
  }, [setHistory]);

  // FIX: Use functional update to avoid stale state for history. This is more robust.
  const redo = useCallback(() => {
    setHistory(currentHistory => {
      if (currentHistory.future.length === 0) return currentHistory;
      
      const next = currentHistory.future[0];
      const newFuture = currentHistory.future.slice(1);
      
      return {
        past: [...currentHistory.past, currentHistory.present],
        present: next,
        future: newFuture,
      };
    });
  }, [setHistory]);

  // FIX: Support functional updates (e.g., setMessages(prev => [...prev, newMessage]))
  // to prevent stale state issues in components and fix the reported TypeScript errors.
  const setState = useCallback((newPresent: T | ((prevState: T) => T)) => {
    setHistory(currentHistory => {
      const newPresentValue =
        newPresent instanceof Function
          ? newPresent(currentHistory.present)
          : newPresent;

      if (newPresentValue === currentHistory.present) {
        return currentHistory;
      }

      return {
        past: [...currentHistory.past, currentHistory.present],
        present: newPresentValue,
        future: [],
      };
    });
  }, [setHistory]);

  const resetState = useCallback((newPresent: T) => {
    setHistory({
        past: [],
        present: newPresent,
        future: [],
    });
  }, [setHistory]);

  return {
    state: history.present,
    setState,
    resetState,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
