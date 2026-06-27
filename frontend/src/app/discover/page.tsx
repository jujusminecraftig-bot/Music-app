'use client';

import { useState, useEffect, useCallback } from 'react';
import { useYouTubePlayer, YTTrack } from '@/components/YouTubePlayer';
import { deezerAPI, favoritesAPI, audioAPI } from '@/lib/api';
import { resolveDeezerToYT } from '@/lib/resolveDeezerTrack';
import { usePlayerStore } from '@/store/playerStore';
import { useAuthStore } from '@/store/authStore';
import {
  Play, Pause, Music2, Sparkles, Search, Loader2, TrendingUp, Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================
// CURATED GENRES
// =============================================
const GENRES = [
  { id: 'lofi', name: 'Lo-Fi Chill', emoji: '🌙', color: 'from-indigo-900 to-blue-900' },
  { id: 'hiphop', name: 'Hip-Hop', emoji: '🎤', color: 'from-orange-900 to-red-900' },
  { id: 'electronic', name: 'Electronic', emoji: '⚡', color: 'from-cyan-900 to-teal-900' },
  { id: 'pop', name: 'Pop Hits', emoji: '✨', color: 'from-pink-900 to-rose-900' },
  { id: 'rock', name: 'Rock', emoji: '🎸', color: 'from-slate-900 to-zinc-900' },
  { id: 'jazz', name: 'Jazz', emoji: '🎺', color: 'from-amber-900 to-yellow-900' },
  { id: 'classical', name: 'Classical', emoji: '🎻', color: 'from-violet-900 to-purple-900' },
  { id: 'rnb', name: 'R&B', emoji: '🎙️', color: 'from-purple-900 to-fuchsia-900' },
];

// =============================================
// DEEZER TRACK CARD
// =============================================
function DeezerTrackCard({ track, isActive, isPlaying, isResolving, isFavorited, isFavoriting, onPlay, onFavorite, queueContext, queueTracks }: {
  track: any;
  isActive: boolean;
  isPlaying: boolean;
  isResolving: boolean;
  isFavorited: boolean;
  isFavoriting: boolean;
  onPlay: () => void;
  onFavorite: (e: React.MouseEvent) => void;
  queueContext?: 'favorites' | 'discover' | 'library' | 'custom';
  queueTracks?: any[];
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={cn(
        'group relative rounded-2xl p-3.5 cursor-pointer card-hover glass transition-all duration-300',
        isActive ? 'border-violet-500/30 bg-violet-500/10' : 'border-white/5 hover:border-white/10'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onPlay}
    >
      {isActive && <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600/10 to-pink-600/5 pointer-events-none" />}

      <div className="relative aspect-square rounded-xl overflow-hidden mb-3 shadow-card bg-white/5">
        <img
          src={track.album?.cover_medium || track.album?.cover || ''}
          alt={track.title}
          className={cn(
            'w-full h-full object-cover transition-all duration-500',
            hovered ? 'scale-105' : 'scale-100'
          )}
          loading="lazy"
        />
        <div className={cn(
          'absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-200',
          hovered || isActive || isResolving ? 'opacity-100' : 'opacity-0'
        )}>
          {isResolving ? (
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <Loader2 className="animate-spin text-white" size={24} />
            </div>
          ) : isActive && isPlaying ? (
            <div className="equalizer scale-125">
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full btn-gradient flex items-center justify-center shadow-glow hover:scale-105 transition-transform">
              <Play size={20} className="ml-0.5" fill="white" color="white" />
            </div>
          )}
        </div>
        <div className="absolute top-2 left-2 glass rounded-full px-2 py-0.5 pointer-events-none">
          <span className="text-[9px] font-bold text-white/60 uppercase tracking-wider">Free Stream</span>
        </div>

        {/* Favorite Button */}
        <button
          onClick={onFavorite}
          disabled={isFavoriting}
          className={cn(
            'absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 z-10',
            isFavorited
              ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30 opacity-100'
              : 'glass text-white/60 hover:text-white hover:scale-105 border border-white/5',
            hovered || isFavorited ? 'opacity-100' : 'opacity-0'
          )}
          title={isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
        >
          {isFavoriting ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Heart size={13} fill={isFavorited ? 'currentColor' : 'none'} />
          )}
        </button>
      </div>

      <div>
        <h3 className={cn(
          'text-sm font-semibold truncate leading-tight',
          isActive ? 'gradient-text' : 'text-white/90'
        )}>
          {track.title}
        </h3>
        <p className="text-xs text-muted truncate mt-0.5">{track.artist?.name}</p>
      </div>
    </div>
  );
}

// =============================================
// MAIN DISCOVER CONTENT
// =============================================
function DiscoverContent() {
  const { state: ytState, playTrack, togglePlay } = useYouTubePlayer();
  const { user } = useAuthStore();
  const { setDiscoverQueue } = usePlayerStore();
  const [trendingTracks, setTrendingTracks] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [favoriteTracks, setFavoriteTracks] = useState<any[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolvingTrackId, setResolvingTrackId] = useState<number | null>(null);
  const [favoritingTrackId, setFavoritingTrackId] = useState<number | null>(null);

  // Fetch charts & favorites on mount
  useEffect(() => {
    async function fetchChart() {
      try {
        setLoading(true);
        const res = await deezerAPI.getChart();
        console.log('Deezer chart response:', res.data);
        if (res.data?.tracks?.data) {
          setTrendingTracks(res.data.tracks.data);
          console.log('Set trending tracks:', res.data.tracks.data.length);
        } else {
          console.log('No tracks data in response');
        }
      } catch (err) {
        console.error('Failed to fetch Deezer chart:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchChart();
    
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    try {
      const res = await favoritesAPI.getAll();
      if (res.data?.favorites) {
        setFavoriteTracks(res.data.favorites.map((f: any) => f.audio));
      }
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
    }
  };

  // Perform search
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setLoading(true);
      const res = await deezerAPI.search(query);
      if (res.data?.data) {
        setSearchResults(res.data.data);
      }
    } catch (err) {
      console.error('Deezer search failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery) {
        setSelectedGenre(null);
        handleSearch(searchQuery);
      } else if (selectedGenre) {
        const genre = GENRES.find(g => g.id === selectedGenre);
        if (genre) handleSearch(genre.name);
      } else {
        setSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, selectedGenre, handleSearch]);

  // Handle Play track (resolve YouTube ID dynamically, queue rest of list)
  const handlePlayTrack = async (track: any, queueTracks: any[] = []) => {
    const isTrackActive = ytState.currentTrack?.title === track.title && ytState.currentTrack?.artist === track.artist?.name;
    if (isTrackActive) {
      togglePlay();
      return;
    }

    const queue = queueTracks.length > 0 ? queueTracks : [track];
    const trackIndex = queue.findIndex((t) => t.id === track.id);
    setDiscoverQueue(queue, trackIndex >= 0 ? trackIndex : 0);

    try {
      setResolvingTrackId(track.id);
      const ytTrack = await resolveDeezerToYT(track, !!user);
      if (ytTrack) {
        playTrack(ytTrack);
      } else {
        alert('Could not stream this track. Please try another one.');
      }
    } catch (err) {
      console.error('Failed to resolve YouTube video ID for track:', err);
      alert('Could not stream this track. Please try another one.');
    } finally {
      setResolvingTrackId(null);
    }
  };

  // Handle Favorite click (resolve YT ID, download to backend library, and add to favorites)
  const handleFavoriteTrack = async (e: React.MouseEvent, track: any) => {
    e.stopPropagation(); // Avoid triggering track playback

    if (!user) {
      alert('Please login to add tracks to your favorites.');
      return;
    }

    // Check if already favorited
    const existingFav = favoriteTracks.find(
      fav => fav.title.toLowerCase() === track.title.toLowerCase() &&
             fav.artist.toLowerCase() === track.artist.name.toLowerCase()
    );

    if (existingFav) {
      // Unfavorite
      try {
        setFavoritingTrackId(track.id);
        await favoritesAPI.remove(existingFav.id);
        setFavoriteTracks(prev => prev.filter(f => f.id !== existingFav.id));
      } catch (err) {
        console.error('Failed to unfavorite track:', err);
      } finally {
        setFavoritingTrackId(null);
      }
      return;
    }

    // Favorite (save metadata to database and favorite it)
    try {
      setFavoritingTrackId(track.id);
      // 1. Resolve YT video ID
      const ytRes = await deezerAPI.getYoutubeId(track.artist.name, track.title);
      const videoId = ytRes.data?.videoId;
      if (!videoId) {
        throw new Error('No YouTube Video ID resolved.');
      }

      // 2. Register in backend database without downloading
      const uploadRes = await audioAPI.createExternal({
        videoId,
        title: track.title,
        artist: track.artist.name,
        album: track.album?.title || '',
        coverArt: track.album?.cover_medium || track.album?.cover || '',
        duration: track.duration || 0,
      });

      const newAudio = uploadRes.data?.audio;
      if (!newAudio?.id) {
        throw new Error('Failed to create database track metadata.');
      }

      // 3. Add to favorites table
      await favoritesAPI.add(newAudio.id);
      setFavoriteTracks(prev => [...prev, newAudio]);
    } catch (err) {
      console.error('Failed to save to favorites:', err);
      alert('Failed to save track to favorites. Please try again.');
    } finally {
      setFavoritingTrackId(null);
    }
  };

  const isSearching = searchQuery.trim().length > 0 || selectedGenre !== null;
  const tracksToShow = isSearching ? searchResults : trendingTracks;

  return (
    <div className="space-y-8 animate-fade-in pb-24">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} className="text-violet-400" />
          <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Global Discovery</span>
        </div>
        <h1 className="text-4xl font-bold gradient-text-lltm mb-2">Discover</h1>
        <p className="text-muted">Explore millions of songs globally. Save your favorites to your local library instantly!</p>
      </div>

      {/* Search bar */}
      <div className="relative max-w-lg">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Search any artist, song or album..."
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
            setSelectedGenre(null);
          }}
          className="w-full pl-11 pr-12 py-3.5 rounded-2xl glass border border-white/8 text-white placeholder:text-muted text-sm focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/5 transition-all duration-200"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-violet-400" size={18} />
        )}
      </div>

      {/* Genre grid */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Browse Genres</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {GENRES.map(genre => {
            const isSelected = selectedGenre === genre.id;
            return (
              <button
                key={genre.id}
                onClick={() => {
                  if (isSelected) {
                    setSelectedGenre(null);
                    setSearchQuery('');
                  } else {
                    setSearchQuery('');
                    setSelectedGenre(genre.id);
                  }
                }}
                className={cn(
                  'relative rounded-2xl p-4 text-center transition-all duration-300 overflow-hidden border flex flex-col items-center justify-center gap-1',
                  isSelected
                    ? `bg-gradient-to-br ${genre.color} border-white/20 shadow-glow scale-[1.02]`
                    : 'glass border-white/5 hover:border-white/10 hover:scale-[1.01]'
                )}
              >
                <span className="text-2xl">{genre.emoji}</span>
                <span className="font-bold text-white text-[11px] leading-tight truncate w-full">{genre.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tracks Section */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {!isSearching && <TrendingUp size={18} className="text-violet-400" />}
            <h2 className="text-lg font-bold text-white">
              {searchQuery
                ? `Results for "${searchQuery}"`
                : selectedGenre
                  ? `Top "${GENRES.find(g => g.id === selectedGenre)?.name}" Songs`
                  : 'Global Trending Charts'
              }
            </h2>
          </div>
          {tracksToShow.length > 0 && (
            <span className="text-xs text-muted">{tracksToShow.length} songs found</span>
          )}
        </div>

        {loading && tracksToShow.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-violet-500" size={32} />
            <p className="text-sm text-muted">Fetching from music library...</p>
          </div>
        ) : tracksToShow.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {tracksToShow.map(track => {
              const isTrackActive = ytState.currentTrack?.title === track.title && ytState.currentTrack?.artist === track.artist?.name;
              const isTrackFavorited = favoriteTracks.some(
                fav => fav.title.toLowerCase() === track.title.toLowerCase() &&
                       fav.artist.toLowerCase() === track.artist.name.toLowerCase()
              );
              return (
                <DeezerTrackCard
                  key={track.id}
                  track={track}
                  isActive={isTrackActive}
                  isPlaying={ytState.isPlaying}
                  isResolving={resolvingTrackId === track.id}
                  isFavorited={isTrackFavorited}
                  isFavoriting={favoritingTrackId === track.id}
                  onPlay={() => handlePlayTrack(track, tracksToShow)}
                  onFavorite={(e) => handleFavoriteTrack(e, track)}
                  queueContext="discover"
                  queueTracks={tracksToShow}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Music2 size={36} className="text-muted mx-auto mb-3" />
            <p className="text-muted">No tracks found</p>
            <p className="text-xs text-white/20 mt-1">Try a different search query or select another category</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return <DiscoverContent />;
}
