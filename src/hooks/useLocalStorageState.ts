import { useEffect, useState } from 'react';

export function useLocalStorageState<T>(
  key: string,
  initialValue: T | (() => T),
  hydrate?: (value: unknown) => T
) {
  const [state, setState] = useState<T>(() => {
    const fallback = typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;

    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        const parsed = JSON.parse(item) as unknown;
        return hydrate ? hydrate(parsed) : parsed as T;
      }
    } catch (error) {
      console.warn(`Failed to read localStorage key "${key}"`, error);
    }

    return hydrate ? hydrate(fallback) : fallback;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Failed to write localStorage key "${key}"`, error);
    }
  }, [key, state]);

  return [state, setState] as const;
}
