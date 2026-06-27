import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  coverArt?: string;
  filePath: string;
}

interface PlayerState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  isShuffled: boolean;
  repeatMode: 'none' | 'all' | 'one';
  queue: AudioTrack[];
  queueIndex: number;
  queueContext: 'favorites' | 'discover' | 'library' | 'custom';
  discoverQueue: any[];
  discoverQueueIndex: number;
  
  // Actions
  setCurrentTrack: (track: AudioTrack | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setQueue: (queue: AudioTrack[], startIndex?: number, context?: 'favorites' | 'discover' | 'library' | 'custom') => void;
  setDiscoverQueue: (queue: any[], startIndex?: number) => void;
  clearDiscoverQueue: () => void;
  addToQueue: (track: AudioTrack) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  playNext: () => void;
  playPrevious: () => void;
  playAtIndex: (index: number) => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
      volume: 1,
      progress: 0,
      duration: 0,
      isShuffled: false,
      repeatMode: 'none',
      queue: [],
      queueIndex: 0,
      queueContext: 'custom',
      discoverQueue: [],
      discoverQueueIndex: 0,

      setCurrentTrack: (track) => set({ currentTrack: track, progress: 0 }),

      setIsPlaying: (playing) => set({ isPlaying: playing }),

      setVolume: (volume) => set({ volume }),

      setProgress: (progress) => set({ progress }),

      setDuration: (duration) => set({ duration }),

      toggleShuffle: () => {
        const { queue, queueIndex, isShuffled } = get();
        if (!isShuffled) {
          // Shuffle the queue
          const shuffled = [...queue];
          const currentTrack = shuffled[queueIndex];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          // Move current track to the front
          const currentIndex = shuffled.findIndex(t => t.id === currentTrack.id);
          if (currentIndex > 0) {
            [shuffled[0], shuffled[currentIndex]] = [shuffled[currentIndex], shuffled[0]];
          }
          set({ queue: shuffled, queueIndex: 0, isShuffled: true });
        } else {
          // Restore original order (not implemented for simplicity)
          set({ isShuffled: false });
        }
      },

      toggleRepeat: () => {
        const modes: ('none' | 'all' | 'one')[] = ['none', 'all', 'one'];
        const currentIndex = modes.indexOf(get().repeatMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        set({ repeatMode: modes[nextIndex] });
      },

      setQueue: (queue, startIndex = 0, context = 'custom') =>
        set({ queue, queueIndex: startIndex, queueContext: context, discoverQueue: [], discoverQueueIndex: 0 }),

      setDiscoverQueue: (discoverQueue, startIndex = 0) =>
        set({ discoverQueue, discoverQueueIndex: startIndex, queue: [], queueIndex: 0, queueContext: 'discover' }),

      clearDiscoverQueue: () => set({ discoverQueue: [], discoverQueueIndex: 0 }),

      addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),

      removeFromQueue: (index) =>
        set((state) => ({
          queue: state.queue.filter((_, i) => i !== index),
          queueIndex: state.queueIndex > index ? state.queueIndex - 1 : state.queueIndex,
        })),

      clearQueue: () => set({ queue: [], queueIndex: 0 }),

      playNext: () => {
        const { queue, queueIndex, repeatMode } = get();
        let nextIndex;

        if (repeatMode === 'one') {
          nextIndex = queueIndex;
        } else if (repeatMode === 'all') {
          nextIndex = (queueIndex + 1) % queue.length;
        } else if (queueIndex < queue.length - 1) {
          nextIndex = queueIndex + 1;
        } else {
          // No more songs in queue, stop playing
          set({ isPlaying: false });
          return;
        }

        if (queue[nextIndex]) {
          set({ currentTrack: queue[nextIndex], queueIndex: nextIndex, progress: 0, isPlaying: true });
        }
      },

      playPrevious: () => {
        const { queue, queueIndex } = get();
        const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
        
        if (queue[prevIndex]) {
          set({ currentTrack: queue[prevIndex], queueIndex: prevIndex, progress: 0 });
        }
      },

      playAtIndex: (index) => {
        const { queue } = get();
        if (queue[index]) {
          set({ currentTrack: queue[index], queueIndex: index, progress: 0 });
        }
      },
    }),
    {
      name: 'player-storage',
      partialize: (state) => ({
        volume: state.volume,
        isShuffled: state.isShuffled,
        repeatMode: state.repeatMode,
      }),
    }
  )
);
