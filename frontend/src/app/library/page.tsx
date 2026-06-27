'use client';

import { useEffect, useState } from 'react';
import { audioAPI } from '@/lib/api';
import TrackCard from '@/components/TrackCard';
import Button from '@/components/ui/Button';
import { usePlayerStore } from '@/store/playerStore';
import { Library as LibraryIcon, Music2, Play, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Audio {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  coverArt?: string;
  genre?: string;
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

export default function Library() {
  const { setQueue, setCurrentTrack, setIsPlaying } = usePlayerStore();
  const [tracks, setTracks] = useState<Audio[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string>('');

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      const response = await audioAPI.getAll({ limit: 100 });
      setTracks(response.data.audio);
    } catch (error) {
      console.error('Error fetching tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (filteredTracks.length > 0) {
      setQueue(filteredTracks, 0, 'library');
      setCurrentTrack(filteredTracks[0]);
      setIsPlaying(true);
    }
  };

  const handleShufflePlay = () => {
    if (filteredTracks.length > 0) {
      const shuffled = [...filteredTracks];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setQueue(shuffled, 0, 'library');
      setCurrentTrack(shuffled[0]);
      setIsPlaying(true);
    }
  };

  const genres = Array.from(new Set(tracks.map((t) => t.genre).filter(Boolean))) as string[];
  const filteredTracks = selectedGenre ? tracks.filter((t) => t.genre === selectedGenre) : tracks;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LibraryIcon size={14} className="text-violet-400" />
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Collection</span>
          </div>
          <h1 className="text-4xl font-bold gradient-text-lltm mb-2">Your Library</h1>
          <p className="text-muted">Browse all your uploaded music</p>
        </div>
        {!loading && filteredTracks.length > 0 && (
          <div className="flex items-center gap-3 mt-2">
            <Button size="sm" onClick={handlePlayAll}>
              <Play size={14} className="mr-1.5" />
              Play All
            </Button>
            <Button variant="gradient" size="sm" onClick={handleShufflePlay}>
              <Shuffle size={14} className="mr-1.5" />
              Shuffle
            </Button>
            <div className="glass rounded-2xl px-4 py-2 text-center border border-white/5">
              <p className="text-lg font-bold gradient-text">{filteredTracks.length}</p>
              <p className="text-[10px] text-muted uppercase tracking-wider">Tracks</p>
            </div>
          </div>
        )}
      </div>

      {/* Genre filter pills */}
      {genres.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedGenre('')}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
              !selectedGenre
                ? 'btn-gradient text-white shadow-glow-sm'
                : 'glass border border-white/8 text-muted hover:text-white hover:border-white/12'
            )}
          >
            All
          </button>
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                selectedGenre === genre
                  ? 'btn-gradient text-white shadow-glow-sm'
                  : 'glass border border-white/[0.08] text-muted hover:text-white hover:border-white/[0.12]'
              )}
            >
              {genre}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredTracks.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredTracks.map((track) => (
            <TrackCard key={track.id} track={track} onDelete={fetchTracks} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-3xl btn-gradient flex items-center justify-center mx-auto mb-5 float-anim shadow-glow">
            <Music2 size={36} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {selectedGenre ? `No tracks in "${selectedGenre}"` : 'Your library is empty'}
          </h3>
          <p className="text-muted mb-6">Upload some music to get started</p>
          <Link
            href="/upload"
            className="inline-flex items-center px-5 py-2.5 rounded-xl btn-gradient text-white text-sm font-semibold shadow-glow hover:scale-105 transition-transform"
          >
            Upload Music
          </Link>
        </div>
      )}
    </div>
  );
}
