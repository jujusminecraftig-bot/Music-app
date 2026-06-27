'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload as UploadIcon, Music, Image as ImageIcon, X, Link as LinkIcon } from 'lucide-react';
import { audioAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function Upload() {
  const { user } = useAuthStore();
  const router = useRouter();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      // Auto-fill title from filename if empty
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (uploadType === 'file') {
      if (!audioFile) {
        setError('Please select an audio file');
        return;
      }

      if (!title || !artist) {
        setError('Please fill in title and artist');
        return;
      }

      try {
        setLoading(true);
        const formData = new FormData();
        formData.append('audio', audioFile);
        formData.append('title', title);
        formData.append('artist', artist);
        if (album) formData.append('album', album);
        if (genre) formData.append('genre', genre);
        if (coverFile) formData.append('coverArt', coverFile);

        await audioAPI.upload(formData);

        router.push('/');
      } catch (error: any) {
        setError(error.response?.data?.error || 'Failed to upload audio');
      } finally {
        setLoading(false);
      }
    } else {
      if (!url) {
        setError('Please enter a YouTube URL');
        return;
      }

      try {
        setLoading(true);
        await audioAPI.uploadUrl({
          url,
          title: title || undefined,
          artist: artist || undefined,
          album: album || undefined,
          genre: genre || undefined,
        });

        router.push('/');
      } catch (error: any) {
        setError(error.response?.data?.error || 'Failed to import from URL');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Upload Music</h1>
        <p className="text-gray-400">Share your music with the world</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Upload Type Toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setUploadType('file')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              uploadType === 'file'
                ? 'bg-primary text-white'
                : 'bg-secondary text-gray-400 hover:bg-accent'
            }`}
          >
            <UploadIcon size={18} className="inline mr-2" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setUploadType('url')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              uploadType === 'url'
                ? 'bg-primary text-white'
                : 'bg-secondary text-gray-400 hover:bg-accent'
            }`}
          >
            <LinkIcon size={18} className="inline mr-2" />
            Import from URL
          </button>
        </div>

        {uploadType === 'file' ? (
          /* Audio File Upload */
          <div>
            <label className="block text-sm font-medium text-white mb-2">Audio File *</label>
            <div
              onClick={() => audioInputRef.current?.click()}
              className="border-2 border-dashed border-accent rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            >
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioChange}
                className="hidden"
              />
              {audioFile ? (
                <div className="space-y-2">
                  <Music className="mx-auto text-primary" size={40} />
                  <p className="text-white font-medium">{audioFile.name}</p>
                  <p className="text-gray-400 text-sm">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAudioFile(null);
                    }}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <UploadIcon className="mx-auto text-gray-400" size={40} />
                  <p className="text-gray-400">Click to upload audio file</p>
                  <p className="text-gray-500 text-sm">MP3, WAV, OGG, M4A, FLAC (max 100MB)</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* URL Input */
          <div>
            <label className="block text-sm font-medium text-white mb-2">YouTube/Video URL *</label>
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              required
            />
            <p className="text-gray-500 text-sm mt-1">Paste a YouTube or other video URL to import the audio</p>
          </div>
        )}

        {/* Cover Art Upload (only for file upload) */}
        {uploadType === 'file' && (
          <div>
            <label className="block text-sm font-medium text-white mb-2">Cover Art (Optional)</label>
            <div
              onClick={() => coverInputRef.current?.click()}
              className="border-2 border-dashed border-accent rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            >
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
              />
              {coverFile ? (
                <div className="space-y-2">
                  <img
                    src={URL.createObjectURL(coverFile)}
                    alt="Cover preview"
                    className="mx-auto w-32 h-32 object-cover rounded"
                  />
                  <p className="text-white font-medium">{coverFile.name}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCoverFile(null);
                    }}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <ImageIcon className="mx-auto text-gray-400" size={40} />
                  <p className="text-gray-400">Click to upload cover art</p>
                  <p className="text-gray-500 text-sm">JPG, PNG, WebP (max 10MB)</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Title {uploadType === 'url' ? '(Optional - auto-filled from YouTube)' : '*'}
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={uploadType === 'url' ? 'Auto-filled from YouTube' : 'Enter track title'}
              required={uploadType === 'file'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Artist {uploadType === 'url' ? '(Optional - auto-filled from YouTube)' : '*'}
            </label>
            <Input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder={uploadType === 'url' ? 'Auto-filled from YouTube' : 'Enter artist name'}
              required={uploadType === 'file'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Album</label>
            <Input
              type="text"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              placeholder="Enter album name (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Genre</label>
            <Input
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="Enter genre (optional)"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Uploading...' : 'Upload Track'}
        </Button>
      </form>
    </div>
  );
}
