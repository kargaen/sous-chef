import { useEffect, useRef, useState } from "react";

import type { Step } from "@/models/types";

const pad = (n: number) => String(n).padStart(2, "0");

const formatTimer = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
};

interface TimerState {
  secondsLeft: number;
  running: boolean;
  started: boolean;
  timerLabel: string;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
}

export const useCookingScreenView = (currentStep: Step | null): TimerState => {
  const durationSeconds = (currentStep?.durationMinutes ?? 0) * 60;
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset timer when the step changes
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSecondsLeft(durationSeconds);
    setRunning(false);
    setStarted(false);
  }, [durationSeconds, currentStep?.order]);

  useEffect(() => {
    if (!running) return;

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const startTimer = () => {
    if (secondsLeft > 0) {
      setStarted(true);
      setRunning(true);
    }
  };

  const pauseTimer = () => setRunning(false);

  const resetTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSecondsLeft(durationSeconds);
    setRunning(false);
    setStarted(false);
  };

  return {
    secondsLeft,
    running,
    started,
    timerLabel: formatTimer(secondsLeft),
    startTimer,
    pauseTimer,
    resetTimer,
  };
};
