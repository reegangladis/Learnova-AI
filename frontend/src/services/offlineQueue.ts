/**
 * Offline Progress Queue Service (Phase 4)
 * Provides client-side queued resilience for student progress updates when disconnected.
 * Idempotently coalesces and synchronizes queued updates upon reconnect.
 */

export interface OfflineProgressItem {
  courseId: string;
  lessonId: string;
  isCompleted?: boolean | null;
  playbackPositionSeconds?: number | null;
  playbackDurationSeconds?: number | null;
  queuedAt: string;
}

const STORAGE_KEY = "learnova_offline_progress_queue";

type QueueListener = (items: OfflineProgressItem[]) => void;
const listeners: Set<QueueListener> = new Set();

function notifyListeners() {
  const current = getQueue();
  listeners.forEach((fn) => {
    try {
      fn(current);
    } catch {
      // Ignore listener error
    }
  });
}

export function getQueue(): OfflineProgressItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineProgressItem[];
  } catch {
    return [];
  }
}

function saveQueue(items: OfflineProgressItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    notifyListeners();
  } catch {
    // LocalStorage write fail (quota, private mode)
  }
}

/**
 * Enqueue or update progress for a lesson.
 * If an update for the same lesson already exists, coalesces into the newest state.
 */
export function enqueueProgress(item: Omit<OfflineProgressItem, "queuedAt">): void {
  const current = getQueue();
  const now = new Date().toISOString();

  // Find existing index for this lesson
  const existingIdx = current.findIndex(
    (q) => q.courseId === item.courseId && q.lessonId === item.lessonId
  );

  const newItem: OfflineProgressItem = {
    ...item,
    queuedAt: now,
  };

  if (existingIdx >= 0) {
    // Coalesce: preserve previous completed status if new is null
    const existing = current[existingIdx];
    current[existingIdx] = {
      ...existing,
      ...newItem,
      isCompleted:
        newItem.isCompleted !== undefined ? newItem.isCompleted : existing.isCompleted,
      playbackPositionSeconds:
        newItem.playbackPositionSeconds !== undefined
          ? newItem.playbackPositionSeconds
          : existing.playbackPositionSeconds,
      playbackDurationSeconds:
        newItem.playbackDurationSeconds !== undefined
          ? newItem.playbackDurationSeconds
          : existing.playbackDurationSeconds,
      queuedAt: now,
    };
  } else {
    current.push(newItem);
  }

  saveQueue(current);
}

/**
 * Remove items matching a course and lesson IDs from the queue.
 */
export function dequeueCourseItems(courseId: string, lessonIds?: string[]): void {
  const current = getQueue();
  const remaining = current.filter((item) => {
    if (item.courseId !== courseId) return true;
    if (lessonIds && !lessonIds.includes(item.lessonId)) return true;
    return false;
  });
  saveQueue(remaining);
}

/**
 * Get pending queued items for a specific course.
 */
export function getPendingForCourse(courseId: string): OfflineProgressItem[] {
  return getQueue().filter((item) => item.courseId === courseId);
}

/**
 * Subscribe to offline queue changes.
 */
export function subscribeToQueue(callback: QueueListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
