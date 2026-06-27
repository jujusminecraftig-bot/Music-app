'use client';

import { Play, Heart, Trash2, Music2 } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { usePlayerStore } from '@/store/playerStore';
import { favoritesAPI, audioAPI } from '@/lib/api';
import AddToPlaylistMenu from '@/components/AddToPlaylistMenu';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TrackCardProps {
  track: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    duration: number;
    coverArt?: string;
    filePath: string;
  };
  showArtist?: boolean;
  showAlbum?: boolean;
  onDelete?: () => void;
  queueContext?: 'favorites' | 'discover' | 'library' | 'custom';
  queueTracks?: any[];
}

export default function TrackCard({ track, showArtist = true, showAlbum = false, onDelete, queueContext = 'custom', queueTracks }: TrackCardProps) {
  const { setCurrentTrack, setQueue, setIsPlaying, queue, currentTrack, isPlaying } = usePlayerStore();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isCurrentTrack = currentTrack?.id === track.id;

  useEffect(() => {
    checkFavorite();
  }, [track.id]);

  const checkFavorite = async () => {
    try {
      const response = await favoritesAPI.check(track.id);
      setIsFavorite(response.data.isFavorite);
    } catch (error) {
      // silently ignore
    }
  };

  const handlePlay = () => {
    // If queueTracks are provided, use them as the queue with the appropriate context
    if (queueTracks && queueTracks.length > 0) {
      const trackIndex = queueTracks.findIndex(t => t.id === track.id);
      setQueue(queueTracks, trackIndex >= 0 ? trackIndex : 0, queueContext);
    } else {
      setQueue([track], 0, queueContext);
    }
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isFavorite) {
        await favoritesAPI.remove(track.id);
        setIsFavorite(false);
      } else {
        await favoritesAPI.add(track.id);
        setIsFavorite(true);
      }
    } catch (error) {
      // silently ignore
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${track.title}"?`)) {
      try {
        await audioAPI.delete(track.id);
        if (onDelete) onDelete();
      } catch (error) {
        alert('Failed to delete track');
      }
    }
  };

  return (
    <div
      className={cn(
        'group relative rounded-2xl p-3.5 cursor-pointer card-hover glass transition-all duration-300',
        isCurrentTrack ? 'border-violet-500/30 bg-violet-500/10' : 'border-white/5 hover:border-white/10'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Currently playing glow */}
      {isCurrentTrack && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600/10 to-pink-600/5 pointer-events-none" />
      )}

      {/* Album art */}
      <div className="relative aspect-square rounded-xl overflow-hidden mb-3 shadow-card">
        {track.coverArt ? (
          <img
            src={track.coverArt}
            alt={track.title}
            className={cn(
              'w-full h-full object-cover transition-all duration-500',
              isCurrentTrack && isPlaying ? 'scale-110' : 'group-hover:scale-105'
            )}
          />
        ) : (
          <div className="w-full h-full btn-gradient flex items-center justify-center">
            <Music2
              size={36}
              className={cn(
                'text-white/80 transition-all duration-500',
                isCurrentTrack && isPlaying ? 'vinyl-spin' : ''
              )}
            />
          </div>
        )}

        {/* Dark overlay on hover */}
        <div className={cn(
          'absolute inset-0 bg-black/40 transition-opacity duration-200',
          isHovered ? 'opacity-100' : 'opacity-0'
        )} />

        {/* Play button */}
        <button
          onClick={handlePlay}
          className={cn(
            'absolute bottom-1.5 right-1.5 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-glow btn-gradient',
            isHovered || isCurrentTrack ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          )}
        >
          <Play size={16} className="ml-0.5" fill="white" color="white" />
        </button>

        {/* Favorite button */}
        <button
          onClick={handleFavoriteToggle}
          className={cn(
            'absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 glass',
            isHovered || isFavorite ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Heart
            size={13}
            className={isFavorite ? 'text-pink-400 fill-pink-400' : 'text-white'}
          />
        </button>

        {/* Add to playlist */}
        <div
          className={cn(
            'absolute top-2 left-2 transition-all duration-200',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          <AddToPlaylistMenu audioId={track.id} />
        </div>

        {/* Delete button */}
        {onDelete && (
        <button
          onClick={handleDelete}
          className={cn(
            'absolute top-10 left-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 glass',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Trash2 size={12} className="text-white/60 hover:text-red-400 transition-colors" />
        </button>
        )}

        {/* Equalizer when playing */}
        {isCurrentTrack && isPlaying && (
          <div className="absolute bottom-2 left-2">
            <div className="equalizer">
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
            </div>
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="space-y-0.5">
        <h3 className={cn(
          'text-sm font-semibold truncate leading-tight',
          isCurrentTrack ? 'gradient-text' : 'text-white/90'
        )}>
          {track.title}
        </h3>
        {showArtist && (
          <p className="text-xs text-muted truncate">{track.artist}</p>
        )}
        {showAlbum && track.album && (
          <p className="text-xs text-muted truncate">{track.album}</p>
        )}
        <p className="text-xs text-white/20 pt-0.5">{formatDuration(track.duration)}</p>
      </div>
    </div>
  );
}
