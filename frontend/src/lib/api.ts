import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// API functions
export const authAPI = {
  register: (data: { email: string; username: string; password: string; displayName?: string }) =>
    api.post('/api/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  
  getMe: () => api.get('/api/auth/me'),
  
  updateProfile: (data: { displayName?: string; bio?: string }) =>
    api.put('/api/auth/me', data),
};

export const audioAPI = {
  getAll: (params?: { page?: number; limit?: number; genre?: string; artist?: string; search?: string }) =>
    api.get('/api/audio', { params }),
  
  getById: (id: string) => api.get(`/api/audio/${id}`),
  
  upload: (formData: FormData) =>
    api.post('/api/audio/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  uploadUrl: (data: { url: string; title?: string; artist?: string; album?: string; genre?: string; coverArt?: string }) =>
    api.post('/api/audio/upload-url', data),
  
  createExternal: (data: { title: string; artist: string; videoId: string; album?: string; coverArt?: string; duration?: number }) =>
    api.post('/api/audio/external', data),
  
  delete: (id: string) => api.delete(`/api/audio/${id}`),
  
  getStreamUrl: (id: string) => `${API_URL}/api/audio/stream/${id}`,
  
  getWaveform: (id: string) => api.get(`/api/audio/${id}/waveform`),
};

export const playlistAPI = {
  getAll: () => api.get('/api/playlists'),
  
  getById: (id: string) => api.get(`/api/playlists/${id}`),
  
  create: (data: FormData) =>
    api.post('/api/playlists', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  update: (id: string, data: FormData) =>
    api.put(`/api/playlists/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  delete: (id: string) => api.delete(`/api/playlists/${id}`),
  
  addTrack: (id: string, audioId: string) =>
    api.post(`/api/playlists/${id}/tracks`, { audioId }),
  
  removeTrack: (id: string, trackId: string) =>
    api.delete(`/api/playlists/${id}/tracks/${trackId}`),
};

export const favoritesAPI = {
  getAll: () => api.get('/api/favorites'),
  
  add: (audioId: string) => api.post(`/api/favorites/${audioId}`),
  
  remove: (audioId: string) => api.delete(`/api/favorites/${audioId}`),
  
  check: (audioId: string) => api.get(`/api/favorites/check/${audioId}`),
};

export const recentAPI = {
  getAll: () => api.get('/api/recent'),
  
  add: (audioId: string, progress?: number) =>
    api.post(`/api/recent/${audioId}`, { progress }),
  
  clear: () => api.delete('/api/recent'),
};

export const queueAPI = {
  get: () => api.get('/api/queue'),
  
  set: (audioIds: string[], currentTrackId?: string) =>
    api.post('/api/queue', { audioIds, currentTrackId }),
  
  setCurrent: (audioId: string, isPlaying?: boolean) =>
    api.post('/api/queue/current', { audioId, isPlaying }),
  
  next: () => api.post('/api/queue/next'),
  
  previous: () => api.post('/api/queue/previous'),
  
  shuffle: () => api.post('/api/queue/shuffle'),
  
  repeat: () => api.post('/api/queue/repeat'),
  
  setVolume: (volume: number) => api.post('/api/queue/volume', { volume }),
  
  clear: () => api.delete('/api/queue'),
};

export const adminAPI = {
  getStats: () => api.get('/api/admin/stats'),
  
  getUsers: (params?: { page?: number; limit?: number }) =>
    api.get('/api/admin/users', { params }),
  
  updateUser: (id: string, data: { isAdmin?: boolean; displayName?: string }) =>
    api.put(`/api/admin/users/${id}`, data),
  
  deleteUser: (id: string) => api.delete(`/api/admin/users/${id}`),
  
  getAudio: (params?: { page?: number; limit?: number }) =>
    api.get('/api/admin/audio', { params }),
  
  updateAudio: (id: string, data: { title?: string; artist?: string; album?: string; genre?: string }) =>
    api.put(`/api/admin/audio/${id}`, data),
  
  deleteAudio: (id: string) => api.delete(`/api/admin/audio/${id}`),
};

export const recommendationsAPI = {
  getDailyMix: () => api.get('/api/recommendations/daily-mix'),
};

export const discordAPI = {
  updatePresence: (data: { title?: string; artist?: string; progress?: number; duration?: number; isPlaying: boolean; album?: string; coverArt?: string }) =>
    api.post('/api/discord/presence', data),
};

export const deezerAPI = {
  search: (query: string) => api.get('/api/deezer/search', { params: { q: query } }),
  getChart: () => api.get('/api/deezer/chart'),
  getYoutubeId: (artist: string, title: string) => 
    api.get('/api/deezer/youtube-id', { params: { artist, title } }),
};

