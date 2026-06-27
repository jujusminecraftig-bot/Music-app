'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { playlistAPI } from '@/lib/api';
import { usePlayerStore } from '@/store/playerStore';
import { Play, Shuffle, Trash2, X } from 'lucide-react';
import TrackCard from '@/components/TrackCard';
import Button from '@/components/ui/Button';

interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverArt?: string;
  tracks: Array<{
    id: string;
    audio: {
      id: string;
      title: string;
      artist: string;
      album?: string;
      duration: number;
      coverArt?: string;
      filePath: string;
    };
  }>;
}

export default function PlaylistDetail() {
  const params = useParams();
  const router = useRouter();
  const { setQueue, setCurrentTrack, setIsPlaying } = usePlayerStore();
  
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlaylist();
  }, [params.id]);

  const fetchPlaylist = async () => {
    try {
      setLoading(true);
      const response = await playlistAPI.getById(params.id as string);
      setPlaylist(response.data.playlist);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load playlist');
    } finally {
      setLoading(false);
    }
  };

  const audioTracks = playlist?.tracks.map((t) => t.audio) ?? [];

  const handlePlayAll = () => {
    if (playlist && audioTracks.length > 0) {
      setQueue(audioTracks, 0, 'custom');
      setCurrentTrack(audioTracks[0]);
      setIsPlaying(true);
    }
  };

  const handleShufflePlay = () => {
    if (playlist && audioTracks.length > 0) {
      const shuffled = [...audioTracks];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setQueue(shuffled, 0, 'custom');
      setCurrentTrack(shuffled[0]);
      setIsPlaying(true);
    }
  };

  const handleRemoveTrack = async (playlistTrackId: string) => {
    setRemovingId(playlistTrackId);
    try {
      await playlistAPI.removeTrack(params.id as string, playlistTrackId);
      fetchPlaylist();
    } catch (error) {
      console.error('Error removing track:', error);
    } finally {
      setRemovingId(null);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;

    try {
      await playlistAPI.delete(params.id as string);
      router.push('/playlists');
    } catch (error) {
      console.error('Error deleting playlist:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error || 'Playlist not found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-end gap-6">
        <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center overflow-hidden shadow-glow flex-shrink-0">
          {playlist.coverArt ? (
            <img
              src={playlist.coverArt}
              alt={playlist.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-6xl">🎵</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted uppercase tracking-widest mb-1">Playlist</p>
          <h1 className="text-4xl font-bold text-white mb-2 truncate">{playlist.name}</h1>
          {playlist.description && (
            <p className="text-muted mb-3">{playlist.description}</p>
          )}
          <p className="text-muted text-sm">{playlist.tracks.length} tracks</p>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Button onClick={handlePlayAll} disabled={playlist.tracks.length === 0}>
            <Play size={16} className="mr-2" />
            Play All
          </Button>
          <Button variant="gradient" onClick={handleShufflePlay} disabled={playlist.tracks.length === 0}>
            <Shuffle size={16} className="mr-2" />
            Shuffle Play
          </Button>
          <Button variant="danger" onClick={handleDeletePlaylist}>
            <Trash2 size={16} className="mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {playlist.tracks.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {playlist.tracks.map((track) => (
            <div key={track.id} className="relative group">
              <TrackCard
                track={track.audio}
                queueContext="custom"
                queueTracks={audioTracks}
              />
              <button
                onClick={() => handleRemoveTrack(track.id)}
                disabled={removingId === track.id}
                className="absolute bottom-14 right-3 z-20 w-7 h-7 rounded-full glass flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                title="Remove from playlist"
              >
                <X size={12} className="text-white/70 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center border border-white/5">
          <p className="text-white text-lg font-medium mb-1">This playlist is empty</p>
          <p className="text-muted text-sm">Hover over any track and click the playlist icon to add songs</p>
        </div>
      )}
    </div>
  );
}
