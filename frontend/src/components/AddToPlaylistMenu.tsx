'use client';

import { useEffect, useRef, useState } from 'react';
import { ListMusic, Plus, Check, Loader2 } from 'lucide-react';
import { playlistAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

interface Playlist {
  id: string;
  name: string;
  _count?: { tracks: number };
}

interface AddToPlaylistMenuProps {
  audioId: string;
  className?: string;
}

export default function AddToPlaylistMenu({ audioId, className }: AddToPlaylistMenuProps) {
  const { isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    setLoading(true);
    playlistAPI.getAll()
      .then((res) => setPlaylists(res.data.playlists))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!isAuthenticated) return null;

  const handleAdd = async (playlistId: string) => {
    setAddingTo(playlistId);
    try {
      await playlistAPI.addTrack(playlistId, audioId);
      setAddedTo((prev) => new Set(prev).add(playlistId));
    } catch {
      // already in playlist or error
    } finally {
      setAddingTo(null);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAddingTo('new');
    try {
      const formData = new FormData();
      formData.append('name', newName.trim());
      const res = await playlistAPI.create(formData);
      const playlist = res.data.playlist;
      await playlistAPI.addTrack(playlist.id, audioId);
      setPlaylists((prev) => [{ ...playlist, _count: { tracks: 1 } }, ...prev]);
      setAddedTo((prev) => new Set(prev).add(playlist.id));
      setNewName('');
      setShowCreate(false);
    } catch {
      // ignore
    } finally {
      setAddingTo(null);
    }
  };

  return (
    <div ref={menuRef} className={cn('relative', className)}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 glass text-white/70 hover:text-white"
        title="Add to playlist"
      >
        <ListMusic size={13} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-56 rounded-xl glass-strong border border-white/10 shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-white/5">
            <p className="text-xs font-semibold text-white">Add to playlist</p>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={16} className="animate-spin text-muted" />
              </div>
            ) : playlists.length === 0 && !showCreate ? (
              <p className="text-xs text-muted px-3 py-3">No playlists yet</p>
            ) : (
              playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={(e) => { e.stopPropagation(); handleAdd(pl.id); }}
                  disabled={addingTo === pl.id || addedTo.has(pl.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors disabled:opacity-60"
                >
                  <span className="text-xs text-white truncate flex-1">{pl.name}</span>
                  {addingTo === pl.id ? (
                    <Loader2 size={12} className="animate-spin text-muted flex-shrink-0" />
                  ) : addedTo.has(pl.id) ? (
                    <Check size={12} className="text-violet-400 flex-shrink-0" />
                  ) : null}
                </button>
              ))
            )}
          </div>

          <div className="border-t border-white/5 p-2">
            {showCreate ? (
              <form onSubmit={handleCreateAndAdd} className="flex gap-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Playlist name"
                  className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted focus:outline-none focus:border-violet-500/50"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="submit"
                  disabled={!newName.trim() || addingTo === 'new'}
                  className="px-2 py-1.5 rounded-lg btn-gradient text-white text-xs disabled:opacity-50"
                >
                  {addingTo === 'new' ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                </button>
              </form>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setShowCreate(true); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-violet-300 hover:bg-violet-500/10 transition-colors"
              >
                <Plus size={12} />
                New playlist
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
