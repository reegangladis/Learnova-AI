import { useEffect, useState, useCallback, useRef } from "react";
import {
  Play,
  Clock,
  CheckCircle,
  WifiOff,
} from "lucide-react";

interface VideoLessonPlayerProps {
  lessonId?: string;
  courseId?: string;
  title: string;
  resourceUrl: string | null;
  initialPositionSeconds?: number;
  initialDurationSeconds?: number;
  isCompleted: boolean;
  onSaveProgress: (positionSeconds: number, durationSeconds: number, isCompleted?: boolean) => void;
  onMarkComplete?: () => void;
  isOffline?: boolean;
}

export function VideoLessonPlayer({
  title,
  resourceUrl,
  initialPositionSeconds = 0,
  initialDurationSeconds = 0,
  isCompleted,
  onSaveProgress,
  isOffline = false,
}: VideoLessonPlayerProps) {
  const [currentPosition, setCurrentPosition] = useState(initialPositionSeconds);
  const [duration] = useState(initialDurationSeconds);
  const lastSavedRef = useRef(initialPositionSeconds);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const onSaveProgressRef = useRef(onSaveProgress);
  useEffect(() => {
    onSaveProgressRef.current = onSaveProgress;
  }, [onSaveProgress]);

  const scheduleProgressSave = useCallback(
    (pos: number, dur: number, force = false, completedFlag?: boolean) => {
      if (!force && Math.abs(pos - lastSavedRef.current) < 4) {
        return;
      }
      lastSavedRef.current = pos;
      onSaveProgressRef.current(pos, dur, completedFlag);
    },
    []
  );

  // Periodic heartbeat playback position simulator when interactive stream is open
  useEffect(() => {
    if (!resourceUrl) return;
    const interval = setInterval(() => {
      setCurrentPosition((prev) => {
        const next = prev + 5;
        scheduleProgressSave(next, duration || 300, false);
        return next;
      });
    }, 10000);

    return () => {
      clearInterval(interval);
      if (lastSavedRef.current > initialPositionSeconds) {
        scheduleProgressSave(lastSavedRef.current, duration || 300, true);
      }
    };
  }, [resourceUrl, duration, initialPositionSeconds, scheduleProgressSave]);

  return (
    <div className="space-y-4" data-testid="video-lesson-player">
      <div className="aspect-video w-full rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center border border-border relative group shadow-md">
        {resourceUrl?.includes("http") ? (
          <iframe
            src={resourceUrl}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="text-center p-8 space-y-3">
            <Play className="h-12 w-12 text-primary mx-auto opacity-70" />
            <p className="text-sm text-foreground font-medium">Video Resource Stream</p>
            <p className="text-xs text-muted-foreground max-w-md">
              Stream reference: {resourceUrl || "Standard video"}
            </p>
          </div>
        )}

        {isOffline && (
          <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm border border-border px-2.5 py-1 rounded-md flex items-center gap-1.5 text-xs text-amber-500 font-medium">
            <WifiOff className="h-3.5 w-3.5" />
            <span>Offline Session</span>
          </div>
        )}
      </div>

      {/* Video Session Details & Status */}
      <div className="bg-card border border-border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4 text-primary" />
          <span>Interactive Video Lesson</span>
          {currentPosition > 0 && (
            <span className="text-foreground font-medium">
              • Position: {formatTime(currentPosition)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle className="h-4 w-4" />
              Lesson Completed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
              Progress tracking active
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
