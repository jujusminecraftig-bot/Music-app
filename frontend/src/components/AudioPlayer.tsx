'use client';

import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { useYouTubePlayer } from '@/components/YouTubePlayer';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, Music2, ChevronUp, ChevronDown
} from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { audioAPI, queueAPI, discordAPI } from '@/lib/api';
import { recordPlayStart, startProgressRecording, stopProgressRecording } from '@/lib/recordPlay';
import { cn } from '@/lib/utils';

export default function AudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    progress,
    duration,
    isShuffled,
    repeatMode,
    queue,
    queueIndex,
    setIsPlaying,
    setVolume,
    setProgress,
    setDuration,
    toggleShuffle,
    toggleRepeat,
    playNext,
    playPrevious,
    setCurrentTrack,
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { state: ytState, pause: pauseYT, playTrack: playYTTrack } = useYouTubePlayer();

  // Intercept external YouTube tracks and route them to the YouTube player
  useEffect(() => {
    if (currentTrack && currentTrack.filePath?.startsWith('youtube:')) {
      const videoId = currentTrack.filePath.substring(8);

      recordPlayStart(currentTrack.id);
      
      // Stop local player
      setIsPlaying(false);
      
      // Play on YouTube player
      playYTTrack({
        videoId,
        title: currentTrack.title,
        artist: currentTrack.artist,
        thumbnail: currentTrack.coverArt || '',
        audioId: currentTrack.id,
      });
      
      // Clear local active track so local player bar unmounts
      setCurrentTrack(null);
    }
  }, [currentTrack, playYTTrack, setIsPlaying, setCurrentTrack]);

  // Record listening history for local tracks
  useEffect(() => {
    if (!currentTrack || currentTrack.filePath?.startsWith('youtube:')) {
      stopProgressRecording();
      return;
    }

    recordPlayStart(currentTrack.id);
    startProgressRecording(currentTrack.id, () => progress);

    return () => stopProgressRecording();
  }, [currentTrack?.id]);

  // Pause YouTube only when a local file is actually playing
  useEffect(() => {
    if (
      currentTrack &&
      !currentTrack.filePath?.startsWith('youtube:') &&
      isPlaying &&
      ytState.isPlaying
    ) {
      pauseYT();
    }
  }, [currentTrack, isPlaying, ytState.isPlaying, pauseYT]);

  // Discord Rich Presence — update on track/play state change and periodically
  useEffect(() => {
    const s = usePlayerStore.getState();
    if (!s.currentTrack) {
      discordAPI.updatePresence({ isPlaying: false }).catch(() => {});
      return;
    }

    discordAPI.updatePresence({
      title: s.currentTrack.title,
      artist: s.currentTrack.artist,
      album: s.currentTrack.album,
      coverArt: s.currentTrack.coverArt,
      progress: s.progress,
      duration: s.duration,
      isPlaying: s.isPlaying,
    }).catch(() => {});

    const interval = setInterval(() => {
      const latest = usePlayerStore.getState();
      if (!latest.currentTrack || !latest.isPlaying) return;
      discordAPI.updatePresence({
        title: latest.currentTrack.title,
        artist: latest.currentTrack.artist,
        album: latest.currentTrack.album,
        coverArt: latest.currentTrack.coverArt,
        progress: latest.progress,
        duration: latest.duration,
        isPlaying: true,
      }).catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [currentTrack?.id, isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      const s = usePlayerStore.getState();
      if (s.currentTrack && s.isPlaying) {
        discordAPI.updatePresence({
          title: s.currentTrack.title,
          artist: s.currentTrack.artist,
          album: s.currentTrack.album,
          coverArt: s.currentTrack.coverArt,
          progress: s.progress,
          duration: audioRef.current.duration,
          isPlaying: true,
        }).catch(() => {});
      }
    }
  };

  const handleCanPlay = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const seekTime = ratio * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setProgress(seekTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    queueAPI.setVolume(newVolume).catch(() => {});
  };

  const handleTogglePlay = () => {
    if (currentTrack) {
      setIsPlaying(!isPlaying);
      queueAPI.setCurrent(currentTrack.id, !isPlaying).catch(() => {});
    }
  };

  const handleNext = () => {
    playNext();
    queueAPI.next().catch(() => {});
  };

  const handlePrevious = () => {
    playPrevious();
    queueAPI.previous().catch(() => {});
  };

  const handleShuffle = () => {
    toggleShuffle();
    queueAPI.shuffle().catch(() => {});
  };

  const handleRepeat = () => {
    toggleRepeat();
    queueAPI.repeat().catch(() => {});
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    } else {
      handleNext();
      // Ensure next local track starts after src swap
      requestAnimationFrame(() => {
        const { currentTrack: next, isPlaying: playing } = usePlayerStore.getState();
        if (
          audioRef.current &&
          playing &&
          next &&
          !next.filePath?.startsWith('youtube:')
        ) {
          audioRef.current.play().catch(() => {});
        }
      });
    }
  };

  if (!currentTrack) return null;

  const streamUrl = audioAPI.getStreamUrl(currentTrack.id);
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-white/5 transition-all duration-500',
      expanded ? 'h-72' : 'h-[88px]'
    )}>
      <audio
        ref={audioRef}
        src={streamUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onEnded={handleEnded}
        crossOrigin="anonymous"
        preload="auto"
      />

      {/* Gradient progress bar (top of player) */}
      <div
        ref={progressRef}
        className="absolute top-0 left-0 right-0 h-1 cursor-pointer group"
        onClick={handleSeek}
      >
        <div className="absolute inset-0 bg-white/5" />
        <div
          className="absolute left-0 top-0 h-full progress-glow transition-all duration-100"
          style={{ width: `${progressPercent}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-glow opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progressPercent}% - 6px)` }}
        />
      </div>

      {/* Main player row */}
      <div className="h-[88px] flex items-center px-6 gap-4">

        {/* Track Info */}
        <div className="flex items-center gap-3 w-64 min-w-0">
          <div className={cn(
            'w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-glow-sm',
            isPlaying ? 'ring-2 ring-violet-500/50' : ''
          )}>
            {currentTrack.coverArt ? (
              <img
                src={currentTrack.coverArt}
                alt={currentTrack.title}
                className={cn('w-full h-full object-cover', isPlaying ? 'vinyl-spin' : '')}
              />
            ) : (
              <div className="w-full h-full btn-gradient flex items-center justify-center">
                <Music2 size={20} className={cn('text-white', isPlaying ? 'vinyl-spin' : '')} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight gradient-text">
              {currentTrack.title}
            </p>
            <p className="text-xs text-muted truncate mt-0.5">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Center — Controls */}
        <div className="flex-1 flex flex-col items-center gap-2">
          {/* Buttons row */}
          <div className="flex items-center gap-3">
            {/* Shuffle */}
            <button
              onClick={handleShuffle}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200',
                isShuffled
                  ? 'text-violet-400 bg-violet-500/20'
                  : 'text-muted hover:text-white hover:bg-white/5'
              )}
              title="Shuffle"
            >
              <Shuffle size={15} />
            </button>

            {/* Prev */}
            <button
              onClick={handlePrevious}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200"
              title="Previous"
            >
              <SkipBack size={18} />
            </button>

            {/* Play/Pause */}
            <button
              onClick={handleTogglePlay}
              className="w-12 h-12 rounded-full btn-gradient flex items-center justify-center shadow-glow hover:scale-105 transition-transform duration-200 pulse-glow"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying
                ? <Pause size={20} className="text-white" />
                : <Play size={20} className="text-white ml-0.5" />
              }
            </button>

            {/* Next */}
            <button
              onClick={handleNext}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200"
              title="Next"
            >
              <SkipForward size={18} />
            </button>

            {/* Repeat */}
            <button
              onClick={handleRepeat}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200',
                repeatMode !== 'none'
                  ? 'text-violet-400 bg-violet-500/20'
                  : 'text-muted hover:text-white hover:bg-white/5'
              )}
              title="Repeat"
            >
              {repeatMode === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />}
            </button>
          </div>

          {/* Time row */}
          <div className="flex items-center gap-2 text-xs text-muted w-full max-w-md">
            <span className="w-8 text-right tabular-nums">{formatDuration(progress)}</span>
            <div className="flex-1 text-center opacity-30 text-[10px] truncate px-1">
              {currentTrack.title}
            </div>
            <span className="w-8 tabular-nums">{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Right — Volume + Expand */}
        <div className="flex items-center gap-3 w-52 justify-end">
          {/* Equalizer bars when playing */}
          {isPlaying && (
            <div className="equalizer mr-1">
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
            </div>
          )}

          {/* Volume */}
          <div
            className="flex items-center gap-2"
            onMouseEnter={() => setShowVolume(true)}
            onMouseLeave={() => setShowVolume(false)}
          >
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <div className={cn(
              'overflow-hidden transition-all duration-300',
              showVolume ? 'w-24 opacity-100' : 'w-0 opacity-0'
            )}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-24"
              />
            </div>
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded view — Queue */}
      {expanded && (
        <div className="px-6 pb-4 overflow-y-auto" style={{ height: 'calc(272px - 88px)' }}>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Up Next</p>
          <div className="space-y-1">
            {queue.slice(queueIndex + 1, queueIndex + 6).map((track, i) => (
              <div key={track.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors">
                <span className="text-xs text-muted w-4 text-center">{i + 1}</span>
                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                  {track.coverArt ? (
                    <img src={track.coverArt} alt={track.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full btn-gradient flex items-center justify-center">
                      <Music2 size={12} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate">{track.title}</p>
                  <p className="text-[10px] text-muted truncate">{track.artist}</p>
                </div>
                <span className="text-[10px] text-muted">{formatDuration(track.duration)}</span>
              </div>
            ))}
            {queue.length <= queueIndex + 1 && (
              <p className="text-xs text-muted text-center py-4">Queue is empty</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
