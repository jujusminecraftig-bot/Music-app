'use client';

import { useState, useEffect } from 'react';
import { Search as SearchIcon, Music2 } from 'lucide-react';
import { audioAPI } from '@/lib/api';
import TrackCard from '@/components/TrackCard';

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

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Audio[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery) {
      searchTracks();
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  const searchTracks = async () => {
    try {
      setLoading(true);
      const response = await audioAPI.getAll({ search: debouncedQuery, limit: 50 });
      setResults(response.data.audio);
    } catch (error) {
      console.error('Error searching tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold gradient-text-lltm mb-2">Search</h1>
        <p className="text-muted">Find any song in your library</p>
      </div>

      {/* Search input */}
      <div className="relative max-w-2xl">
        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          type="text"
          placeholder="What do you want to listen to?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="w-full pl-12 pr-5 py-4 rounded-2xl glass border border-white/[0.08] text-white text-base placeholder:text-muted focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/5 transition-all duration-200"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-white text-xs transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* No results */}
      {!loading && query && results.length === 0 && (
        <div className="text-center py-20">
          <Music2 size={40} className="text-muted mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">No results for "{query}"</p>
          <p className="text-sm text-muted">Try a different spelling or keyword</p>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white">
              Results for <span className="gradient-text">"{query}"</span>
            </h2>
            <span className="text-xs text-muted">{results.length} track{results.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {results.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !query && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-white font-semibold mb-1">Start typing to search</p>
          <p className="text-sm text-muted">Search by song title, artist, or album</p>
        </div>
      )}
    </div>
  );
}
