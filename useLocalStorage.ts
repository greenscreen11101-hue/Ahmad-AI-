import { useState, useEffect } from 'react';

function getValue<T,>(key: string, initialValue: T | (() => T)): T {
  const savedValue = (window as any).localStorage.getItem(key);
  if (savedValue) {
    try {
      return JSON.parse(savedValue);
    } catch (error) {
      console.error(`Error parsing localStorage key "${key}":`, error);
      // Fallback to initial value if parsing fails
      return initialValue instanceof Function ? initialValue() : initialValue;
    }
  }

  if (initialValue instanceof Function) {
    return initialValue();
  }
  return initialValue;
}

export function useLocalStorage<T,>(key: string, initialValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    return getValue(key, initialValue);
  });

  useEffect(() => {
    (window as any).localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}