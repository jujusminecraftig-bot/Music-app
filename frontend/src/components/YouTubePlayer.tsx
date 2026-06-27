'use client';

import { useEffect, useRef, useCallback, createContext, useContext, useState } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { Play, Pause, Volume2, VolumeX, ExternalLink, SkipBack, SkipForward } from 'lucide-react';
import { formatDuration, cn } from '@/lib/utils';
import { recordPlayStart, startProgressRecording, stopProgressRecording } from '@/lib/recordPlay';
import { resolveDeezerToYT } from '@/lib/resolveDeezerTrack';
import { discordAPI } from '@/lib/api';

// Extend Window type for YT API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface YTTrack {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: number;
  audioId?: string;
}

interface YouTubePlayerState {
  currentTrack: YTTrack | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
}

interface YouTubePlayerContext {
  state: YouTubePlayerState;
  playTrack: (track: YTTrack) => void;
  togglePlay: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  playNext: () => void;
  playPrevious: () => void;
}

const YTContext = createContext<YouTubePlayerContext | null>(null);

export function useYouTubePlayer() {
  const ctx = useContext(YTContext);
  if (!ctx) throw new Error('useYouTubePlayer must be used within YouTubePlayerProvider');
  return ctx;
}

let ytAPILoaded = false;
let ytAPICallbacks: (() => void)[] = [];

function loadYTAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (ytAPILoaded && window.YT?.Player) {
      resolve();
      return;
    }
    ytAPICallbacks.push(resolve);
    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => {
        ytAPILoaded = true;
        ytAPICallbacks.forEach(cb => cb());
        ytAPICallbacks = [];
      };
    }
  });
}

export function YouTubePlayerProvider({ children }: { children: React.ReactNode }) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const isAdvancingRef = useRef(false);
  const expectPlayingRef = useRef(false);
  const stateRef = useRef<YouTubePlayerState>(null!);
  const [state, setState] = useState<YouTubePlayerState>({
    currentTrack: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
    volume: 0.7,
  });

  // Keep stateRef in sync
  useEffect(() => { stateRef.current = state; }, [state]);

  // Tick for progress
  const startProgressTick = useCallback(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        const currentTime = playerRef.current.getCurrentTime() || 0;
        const dur = playerRef.current.getDuration() || 0;
        setState(prev => ({ ...prev, progress: currentTime, duration: dur }));
      }
    }, 500);
  }, []);

  const stopProgressTick = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  const playYTTrackInternal = useCallback((track: YTTrack) => {
    if (track.audioId) {
      recordPlayStart(track.audioId);
      startProgressRecording(track.audioId, () => {
        if (playerRef.current?.getCurrentTime) {
          return playerRef.current.getCurrentTime() || 0;
        }
        return 0;
      });
    } else {
      stopProgressRecording();
    }

    setState(prev => ({ ...prev, currentTrack: track, progress: 0, duration: 0, isPlaying: true }));
    expectPlayingRef.current = true;
    initPlayerRef.current(track.videoId);
  }, []);

  const initPlayerRef = useRef<(videoId: string) => void>(() => {});

  const handleTrackEnded = useCallback(async (fromNaturalEnd = true) => {
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;

    try {
      const store = usePlayerStore.getState();
      const { discoverQueue, discoverQueueIndex, queue, queueIndex, repeatMode } = store;

      if (discoverQueue.length > 0) {
        let nextIndex = discoverQueueIndex + 1;

        if (fromNaturalEnd && repeatMode === 'one') {
          nextIndex = discoverQueueIndex;
        } else if (repeatMode === 'all' && nextIndex >= discoverQueue.length) {
          nextIndex = 0;
        } else if (nextIndex >= discoverQueue.length) {
          setState(prev => ({ ...prev, isPlaying: false }));
          return;
        }

        const isLoggedIn = !!localStorage.getItem('token');
        let resolved: YTTrack | null = null;

        for (let i = nextIndex; i < discoverQueue.length; i++) {
          resolved = await resolveDeezerToYT(discoverQueue[i], isLoggedIn);
          if (resolved) {
            nextIndex = i;
            break;
          }
        }

        if (!resolved && repeatMode === 'all') {
          for (let i = 0; i < (fromNaturalEnd ? discoverQueueIndex : nextIndex); i++) {
            resolved = await resolveDeezerToYT(discoverQueue[i], isLoggedIn);
            if (resolved) {
              nextIndex = i;
              break;
            }
          }
        }

        if (resolved) {
          store.setDiscoverQueue(discoverQueue, nextIndex);
          playYTTrackInternal(resolved);
        } else {
          setState(prev => ({ ...prev, isPlaying: false }));
        }
        return;
      }

      if (queue.length > 0) {
        if (fromNaturalEnd && repeatMode === 'one' && state.currentTrack) {
          playYTTrackInternal(state.currentTrack);
          return;
        }

        let nextIndex: number | null = null;
        if (repeatMode === 'all') {
          nextIndex = (queueIndex + 1) % queue.length;
        } else if (queueIndex < queue.length - 1) {
          nextIndex = queueIndex + 1;
        }

        if (nextIndex === null) {
          setState(prev => ({ ...prev, isPlaying: false }));
          return;
        }

        const nextTrack = queue[nextIndex];
        if (nextTrack.filePath?.startsWith('youtube:')) {
          usePlayerStore.setState({
            queueIndex: nextIndex,
            progress: 0,
            currentTrack: null,
            isPlaying: false,
          });
          playYTTrackInternal({
            videoId: nextTrack.filePath.substring(8),
            title: nextTrack.title,
            artist: nextTrack.artist,
            thumbnail: nextTrack.coverArt || '',
            audioId: nextTrack.id,
            duration: nextTrack.duration,
          });
        } else {
          setState(prev => ({ ...prev, currentTrack: null, isPlaying: false }));
          stopProgressRecording();
          usePlayerStore.setState({
            currentTrack: nextTrack,
            queueIndex: nextIndex,
            progress: 0,
            isPlaying: true,
          });
        }
        return;
      }

      setState(prev => ({ ...prev, isPlaying: false }));
    } finally {
      isAdvancingRef.current = false;
    }
  }, [playYTTrackInternal, state.currentTrack]);

  const handleTrackEndedRef = useRef(handleTrackEnded);
  handleTrackEndedRef.current = handleTrackEnded;

  const initPlayer = useCallback(async (videoId: string) => {
    await loadYTAPI();

    const forcePlay = () => {
      if (!playerRef.current) return;
      try {
        playerRef.current.setVolume(state.volume * 100);
        playerRef.current.playVideo();
      } catch (err) {}
    };

    if (playerRef.current) {
      playerRef.current.loadVideoById(videoId);
      forcePlay();
      setTimeout(forcePlay, 150);
      setTimeout(forcePlay, 400);
      return;
    }

    if (!containerRef.current) return;

    const div = document.createElement('div');
    div.id = 'yt-player-inner';
    containerRef.current.appendChild(div);

    playerRef.current = new window.YT.Player(div, {
      height: '1',
      width: '1',
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
      },
      events: {
        onReady: (event: any) => {
          event.target.setVolume(state.volume * 100);
          event.target.playVideo();
        },
        onStateChange: (event: any) => {
          // YT.PlayerState: -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=cued
          if (event.data === 1) {
            expectPlayingRef.current = false;
            startProgressTick();
            setState(prev => ({ ...prev, isPlaying: true }));
            // Send Discord presence with actual duration now available
            const latest = stateRef.current;
            if (latest.currentTrack) {
              discordAPI.updatePresence({
                title: latest.currentTrack.title,
                artist: latest.currentTrack.artist,
                coverArt: latest.currentTrack.thumbnail,
                progress: event.target.getCurrentTime() || 0,
                duration: event.target.getDuration() || 0,
                isPlaying: true,
              }).catch(() => {});
            }
          } else if (event.data === 3) {
            setState(prev => ({ ...prev, isPlaying: true }));
          } else if (event.data === 5 && expectPlayingRef.current) {
            forcePlay();
          } else if (event.data === 2) {
            stopProgressTick();
            if (!expectPlayingRef.current) {
              setState(prev => ({ ...prev, isPlaying: false }));
            }
          } else if (event.data === 0) {
            expectPlayingRef.current = false;
            stopProgressTick();
            stopProgressRecording();
            handleTrackEndedRef.current(true);
          }
        },
      },
    });
  }, [state.volume, startProgressTick, stopProgressTick]);

  initPlayerRef.current = initPlayer;

  // Listen to local Zustand store changes
  const localCurrentTrack = usePlayerStore(state => state.currentTrack);

  useEffect(() => {
    if (
      localCurrentTrack &&
      !localCurrentTrack.filePath?.startsWith('youtube:') &&
      state.currentTrack
    ) {
      // A local file started playing — pause YouTube and hide its bar
      if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        try {
          playerRef.current.pauseVideo();
        } catch (err) {}
      }
      setState(prev => ({ ...prev, currentTrack: null, isPlaying: false }));
      stopProgressTick();
    }
  }, [localCurrentTrack, state.currentTrack, stopProgressTick]);

  // Discord Rich Presence for YouTube tracks
  useEffect(() => {
    const s = stateRef.current;
    if (!s.currentTrack) {
      discordAPI.updatePresence({ isPlaying: false }).catch(() => {});
      return;
    }

    discordAPI.updatePresence({
      title: s.currentTrack.title,
      artist: s.currentTrack.artist,
      coverArt: s.currentTrack.thumbnail,
      progress: s.progress,
      duration: s.duration,
      isPlaying: s.isPlaying,
    }).catch(() => {});

    const interval = setInterval(() => {
      const latest = stateRef.current;
      if (!latest.currentTrack || !latest.isPlaying) return;
      discordAPI.updatePresence({
        title: latest.currentTrack.title,
        artist: latest.currentTrack.artist,
        coverArt: latest.currentTrack.thumbnail,
        progress: latest.progress,
        duration: latest.duration,
        isPlaying: true,
      }).catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [state.currentTrack?.videoId, state.isPlaying]);

  const playTrack = useCallback((track: YTTrack) => {
    const store = usePlayerStore.getState();
    store.setIsPlaying(false);
    store.setCurrentTrack(null);
    playYTTrackInternal(track);
  }, [playYTTrackInternal]);

  const playNext = useCallback(() => {
    handleTrackEndedRef.current(false);
  }, []);

  const playPrevious = useCallback(async () => {
    const store = usePlayerStore.getState();
    const { discoverQueue, discoverQueueIndex, queue, queueIndex } = store;

    if (discoverQueue.length > 0) {
      const prevIndex = discoverQueueIndex > 0 ? discoverQueueIndex - 1 : discoverQueue.length - 1;
      const isLoggedIn = !!localStorage.getItem('token');
      const resolved = await resolveDeezerToYT(discoverQueue[prevIndex], isLoggedIn);
      if (resolved) {
        store.setDiscoverQueue(discoverQueue, prevIndex);
        playYTTrackInternal(resolved);
      }
      return;
    }

    if (queue.length > 0) {
      const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
      const prevTrack = queue[prevIndex];
      if (prevTrack.filePath?.startsWith('youtube:')) {
        usePlayerStore.setState({ currentTrack: null, queueIndex: prevIndex, progress: 0, isPlaying: false });
        playYTTrackInternal({
          videoId: prevTrack.filePath.substring(8),
          title: prevTrack.title,
          artist: prevTrack.artist,
          thumbnail: prevTrack.coverArt || '',
          audioId: prevTrack.id,
          duration: prevTrack.duration,
        });
      } else {
        setState(prev => ({ ...prev, currentTrack: null, isPlaying: false }));
        stopProgressRecording();
        usePlayerStore.setState({ currentTrack: prevTrack, queueIndex: prevIndex, progress: 0, isPlaying: true });
      }
    }
  }, [playYTTrackInternal]);

  const pause = useCallback(() => {
    expectPlayingRef.current = false;
    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function' && state.isPlaying) {
      try {
        playerRef.current.pauseVideo();
      } catch (err) {}
      setState(prev => ({ ...prev, isPlaying: false }));
      stopProgressTick();
      stopProgressRecording();
    }
  }, [state.isPlaying, stopProgressTick]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (state.isPlaying) {
      expectPlayingRef.current = false;
      if (typeof playerRef.current.pauseVideo === 'function') {
        try { playerRef.current.pauseVideo(); } catch (err) {}
      }
      setState(prev => ({ ...prev, isPlaying: false }));
      stopProgressTick();
    } else {
      // Pause and clear local player
      const store = usePlayerStore.getState();
      store.setIsPlaying(false);
      store.setCurrentTrack(null);

      if (typeof playerRef.current.playVideo === 'function') {
        try { playerRef.current.playVideo(); } catch (err) {}
      }
      setState(prev => ({ ...prev, isPlaying: true }));
      startProgressTick();
    }
  }, [state.isPlaying, startProgressTick, stopProgressTick]);

  const seek = useCallback((time: number) => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.seekTo(time, true);
        setState(prev => ({ ...prev, progress: time }));
      } catch (err) {}
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      try {
        playerRef.current.setVolume(vol * 100);
      } catch (err) {}
    }
    setState(prev => ({ ...prev, volume: vol }));
  }, []);

  return (
    <YTContext.Provider value={{ state, playTrack, togglePlay, pause, seek, setVolume, playNext, playPrevious }}>
      {/* Hidden YouTube iframe container */}
      <div
        ref={containerRef}
        style={{ position: 'fixed', bottom: -100, left: -100, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none', opacity: 0 }}
        aria-hidden="true"
      />
      {children}
    </YTContext.Provider>
  );
}

// =============================================
// MINI YT PLAYER BAR (shows when YT track playing)
// =============================================
export function YTPlayerBar() {
  const { state, togglePlay, seek, setVolume, playNext, playPrevious } = useYouTubePlayer();
  const [showVol, setShowVol] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  if (!state.currentTrack) return null;

  const progressPct = state.duration > 0 ? (state.progress / state.duration) * 100 : 0;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(ratio * state.duration);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-white/5">
      {/* Progress */}
      <div className="relative h-1 cursor-pointer group" onClick={handleSeekClick}>
        <div className="absolute inset-0 bg-white/5" />
        <div
          className="absolute left-0 top-0 h-full progress-glow transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex items-center px-6 h-[82px] gap-4">
        {/* Thumbnail */}
        <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-glow-sm">
          <img src={state.currentTrack.thumbnail} alt={state.currentTrack.title} className="w-full h-full object-cover" />
          {state.isPlaying && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="equalizer scale-75">
                <div className="eq-bar" />
                <div className="eq-bar" />
                <div className="eq-bar" />
                <div className="eq-bar" />
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="w-60 min-w-0">
          <p className="text-sm font-semibold gradient-text truncate">{state.currentTrack.title}</p>
          <p className="text-xs text-muted truncate mt-0.5">{state.currentTrack.artist}</p>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-3">
            <button
              onClick={playPrevious}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-white hover:bg-white/5 transition-all"
              title="Previous"
            >
              <SkipBack size={16} />
            </button>
            <button
              onClick={togglePlay}
              className="w-11 h-11 rounded-full btn-gradient flex items-center justify-center shadow-glow hover:scale-105 transition-transform pulse-glow"
            >
              {state.isPlaying
                ? <Pause size={19} className="text-white" />
                : <Play size={19} className="text-white ml-0.5" />
              }
            </button>
            <button
              onClick={playNext}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-white hover:bg-white/5 transition-all"
              title="Next"
            >
              <SkipForward size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="tabular-nums w-8 text-right">{formatDuration(state.progress)}</span>
            <span className="text-white/10 mx-1">/</span>
            <span className="tabular-nums w-8">{formatDuration(state.duration)}</span>
          </div>
        </div>

        {/* Volume + YouTube link */}
        <div
          className="flex items-center gap-2 w-44 justify-end"
          onMouseEnter={() => setShowVol(true)}
          onMouseLeave={() => setShowVol(false)}
        >
          <a
            href={`https://youtube.com/watch?v=${state.currentTrack.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-white hover:bg-white/5 transition-all"
            title="Open in YouTube"
          >
            <ExternalLink size={14} />
          </a>
          <button
            onClick={() => {
              if (isMuted) { setVolume(state.volume || 0.7); setIsMuted(false); }
              else { setVolume(0); setIsMuted(true); }
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-white hover:bg-white/5 transition-all"
          >
            {isMuted || state.volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <div className={cn('overflow-hidden transition-all duration-300', showVol ? 'w-24 opacity-100' : 'w-0 opacity-0')}>
            <input
              type="range" min="0" max="1" step="0.01"
              value={isMuted ? 0 : state.volume}
              onChange={e => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
              className="w-24"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
