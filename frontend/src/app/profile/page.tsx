'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authAPI, audioAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import TrackCard from '@/components/TrackCard';

export default function Profile() {
  const { user, logout, updateUser } = useAuthStore();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [uploadedTracks, setUploadedTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    setDisplayName(user.displayName || '');
    setBio(user.bio || '');
    fetchUploadedTracks();
  }, [user]);

  const fetchUploadedTracks = async () => {
    try {
      const response = await audioAPI.getAll({ limit: 100 });
      setUploadedTracks(response.data.audio.filter((track: any) => track.uploadedById === user?.id));
    } catch (error) {
      console.error('Error fetching uploaded tracks:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const response = await authAPI.updateProfile({ displayName, bio });
      updateUser(response.data.user);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
        <p className="text-gray-400">Manage your account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Settings */}
        <div className="bg-secondary rounded-lg p-6 space-y-6">
          <h2 className="text-xl font-bold text-white">Account Information</h2>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Email</label>
              <Input type="email" value={user.email} disabled className="opacity-50" />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Username</label>
              <Input type="text" value={user.username} disabled className="opacity-50" />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Display Name</label>
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself"
                className="w-full h-24 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white caret-violet-300 placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>

          <div className="border-t border-accent pt-6">
            <Button variant="danger" onClick={handleLogout} className="w-full">
              Sign Out
            </Button>
          </div>
        </div>

        {/* Uploaded Tracks */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white">Your Uploads</h2>
          
          {uploadedTracks.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {uploadedTracks.map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          ) : (
            <div className="bg-secondary rounded-lg p-8 text-center">
              <p className="text-gray-400">You haven't uploaded any tracks yet</p>
              <Button
                onClick={() => router.push('/upload')}
                className="mt-4"
              >
                Upload Your First Track
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
