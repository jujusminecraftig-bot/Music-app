'use client';

import { useEffect, useState } from 'react';
import { playlistAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverArt?: string;
  isPublic: boolean;
  _count: { tracks: number };
}

export default function Playlists() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      const response = await playlistAPI.getAll();
      setPlaylists(response.data.playlists);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPlaylistName.trim()) {
      setError('Playlist name is required');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('name', newPlaylistName);
      if (newPlaylistDescription) formData.append('description', newPlaylistDescription);

      await playlistAPI.create(formData);
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setShowCreateForm(false);
      fetchPlaylists();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to create playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Your Playlists</h1>
          <p className="text-gray-400">Create and manage your playlists</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'Create Playlist'}
        </Button>
      </div>

      {showCreateForm && (
        <div className="glass rounded-2xl p-6 border border-white/10">
          <form onSubmit={handleCreatePlaylist} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Playlist Name *</label>
              <Input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="My Awesome Playlist"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Description</label>
              <textarea
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                placeholder="Describe your playlist (optional)"
                className="w-full h-20 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white caret-violet-300 placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Playlist'}
            </Button>
          </form>
        </div>
      )}

      {playlists.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              onClick={() => router.push(`/playlists/${playlist.id}`)}
              className="group rounded-2xl p-3.5 cursor-pointer card-hover glass border border-white/5 hover:border-white/10 transition-all duration-300"
            >
              <div className="aspect-square rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 mb-3 flex items-center justify-center overflow-hidden shadow-card">
                {playlist.coverArt ? (
                  <img
                    src={playlist.coverArt}
                    alt={playlist.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <span className="text-4xl">🎵</span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-white truncate">{playlist.name}</h3>
              <p className="text-xs text-muted mt-0.5">{playlist._count.tracks} tracks</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center border border-white/5">
          <p className="text-white text-lg font-medium mb-1">No playlists yet</p>
          <p className="text-muted text-sm">Create your first playlist to organize your music</p>
        </div>
      )}
    </div>
  );
}
