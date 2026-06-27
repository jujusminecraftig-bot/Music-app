import { recentAPI } from '@/lib/api';

let lastRecordedId: string | null = null;
let lastRecordedAt = 0;
let progressTimer: ReturnType<typeof setInterval> | null = null;

export function recordPlayStart(audioId: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token || !audioId) return;

  const now = Date.now();
  if (lastRecordedId === audioId && now - lastRecordedAt < 5000) return;

  lastRecordedId = audioId;
  lastRecordedAt = now;
  recentAPI.add(audioId, 0).catch(() => {});
}

export function startProgressRecording(audioId: string, getProgress: () => number) {
  stopProgressRecording();
  if (!audioId || !localStorage.getItem('token')) return;

  progressTimer = setInterval(() => {
    recentAPI.add(audioId, Math.floor(getProgress())).catch(() => {});
  }, 30000);
}

export function stopProgressRecording() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}
