'use client';

import { useEffect, useState } from 'react';
import { favoritesAPI } from '@/lib/api';
import TrackCard from '@/components/TrackCard';
import Button from '@/components/ui/Button';
import { usePlayerStore } from '@/store/playerStore';
import { Heart, Music2, Play, Shuffle } from 'lucide-react';
import Link from 'next/link';

interface Audio {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  coverArt?: string;
  filePath: string;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-3.5 glass border border-white/5">
      <div className="aspect-square rounded-xl shimmer mb-3" />
      <div className="space-y-2">
        <div className="h-3 rounded shimmer w-4/5" />
        <div className="h-2.5 rounded shimmer w-3/5" />
      </div>
    </div>
  );
}

export default function Favorites() {
  const { setQueue, setCurrentTrack, setIsPlaying } = usePlayerStore();
  const [tracks, setTracks] = useState<Audio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const response = await favoritesAPI.getAll();
      setTracks(response.data.favorites.map((f: any) => f.audio).filter(Boolean));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Heart size={14} className="text-pink-400" />
            <span className="text-xs font-semibold text-pink-400 uppercase tracking-widest">Favorites</span>
          </div>
          <h1 className="text-4xl font-bold gradient-text-lltm mb-2">Liked Songs</h1>
          <p className="text-muted">All your favorite tracks in one place</p>
        </div>
        {!loading && tracks.length > 0 && (
          <div className="flex items-center gap-3 mt-2">
            <Button size="sm" onClick={() => { setQueue(tracks, 0, 'favorites'); setCurrentTrack(tracks[0]); setIsPlaying(true); }}>
              <Play size={14} className="mr-1.5" />
              Play All
            </Button>
            <Button variant="gradient" size="sm" onClick={() => {
              const shuffled = [...tracks];
              for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
              }
              setQueue(shuffled, 0, 'favorites'); setCurrentTrack(shuffled[0]); setIsPlaying(true);
            }}>
              <Shuffle size={14} className="mr-1.5" />
              Shuffle
            </Button>
            <div className="glass rounded-2xl px-4 py-2 text-center border border-white/5">
              <p className="text-lg font-bold gradient-text">{tracks.length}</p>
              <p className="text-[10px] text-muted uppercase tracking-wider">Liked</p>
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : tracks.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tracks.map((track) => (
            <TrackCard key={track.id} track={track} onDelete={fetchFavorites} queueContext="favorites" queueTracks={tracks} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-600 to-violet-600 flex items-center justify-center mx-auto mb-5 float-anim" style={{ boxShadow: '0 0 30px rgba(236, 72, 153, 0.3)' }}>
            <Heart size={36} className="text-white" fill="white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No liked songs yet</h3>
          <p className="text-muted mb-6">
            Tap the ♥ heart icon on any track to save it here
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/library" className="px-5 py-2.5 rounded-xl btn-gradient text-white text-sm font-semibold shadow-glow hover:scale-105 transition-transform">
              Browse Library
            </Link>
            <Link href="/discover" className="px-5 py-2.5 rounded-xl glass border border-violet-500/30 text-violet-300 text-sm font-semibold hover:bg-violet-500/10 transition-colors">
              Discover Music
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
