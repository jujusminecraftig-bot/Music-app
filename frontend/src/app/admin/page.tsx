'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/lib/api';
import { Users, Music, ListMusic, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.isAdmin) {
      router.push('/');
      return;
    }
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">Manage your music streaming platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-secondary rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-lg">
              <Users className="text-primary" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.users || 0}</p>
              <p className="text-gray-400 text-sm">Total Users</p>
            </div>
          </div>
        </div>

        <div className="bg-secondary rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-lg">
              <Music className="text-primary" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.audio || 0}</p>
              <p className="text-gray-400 text-sm">Total Tracks</p>
            </div>
          </div>
        </div>

        <div className="bg-secondary rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-lg">
              <ListMusic className="text-primary" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.playlists || 0}</p>
              <p className="text-gray-400 text-sm">Total Playlists</p>
            </div>
          </div>
        </div>

        <div className="bg-secondary rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-lg">
              <TrendingUp className="text-primary" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.totalPlays || 0}</p>
              <p className="text-gray-400 text-sm">Total Plays</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-secondary rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/admin/users')}
            className="bg-accent hover:bg-accent-hover text-white p-4 rounded-lg transition-colors text-left"
          >
            <Users className="mb-2" size={24} />
            <p className="font-medium">Manage Users</p>
            <p className="text-sm text-gray-400">View and manage user accounts</p>
          </button>

          <button
            onClick={() => router.push('/admin/audio')}
            className="bg-accent hover:bg-accent-hover text-white p-4 rounded-lg transition-colors text-left"
          >
            <Music className="mb-2" size={24} />
            <p className="font-medium">Manage Audio</p>
            <p className="text-sm text-gray-400">View and manage audio files</p>
          </button>
        </div>
      </div>
    </div>
  );
}
