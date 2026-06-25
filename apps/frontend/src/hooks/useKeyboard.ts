import { useState, useEffect, useCallback, useRef } from "react";
import { ResponseKey } from "@cognitrack/shared";

interface UseKeyboardOptions {
  allowedKeys: ResponseKey[];
}

interface UseKeyboardReturn {
  lastKey: ResponseKey | null;
  lastKeyTime: number | null;
  resetKey: () => void;
}

export function useKeyboard({ allowedKeys }: UseKeyboardOptions): UseKeyboardReturn {
  const [lastKey, setLastKey] = useState<ResponseKey | null>(null);
  const [lastKeyTime, setLastKeyTime] = useState<number | null>(null);
  const keyPressedRef = useRef<Set<string>>(new Set());

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!allowedKeys.includes(event.key as ResponseKey)) return;
    if (keyPressedRef.current.has(event.key)) return;

    keyPressedRef.current.add(event.key);
    const now = performance.now();
    setLastKey(event.key as ResponseKey);
    setLastKeyTime(now);
  }, [allowedKeys]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    keyPressedRef.current.delete(event.key);
  }, []);

  const resetKey = useCallback(() => {
    setLastKey(null);
    setLastKeyTime(null);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return { lastKey, lastKeyTime, resetKey };
}

