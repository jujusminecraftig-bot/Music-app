# Music Streaming App

A full-stack music streaming application similar to Spotify/YouTube Music, built with user-uploaded audio content.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt
- **Storage**: Local file system (configurable for cloud storage)
- **Audio Processing**: FFmpeg for transcoding

## Features

- User authentication and profiles
- Audio upload and storage
- Audio transcoding to multiple formats
- Waveform preview generation
- Search and filtering
- Home feed with recommendations
- Album and artist pages
- Playlist creation and management
- Favorites and recent plays
- Queue management
- Full-featured audio player (seek, shuffle, repeat, next, previous)
- Background playback support
- Admin dashboard for catalog management

## Project Structure

```
music-streaming-app/
├── frontend/          # Next.js frontend application
├── backend/           # Express backend API
├── uploads/           # Audio file storage
├── database/          # Database migrations and schema
└── docs/              # Documentation
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- FFmpeg (for audio processing)

### Installation

1. Clone the repository and navigate to the project directory

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see `.env.example` files)

4. Create PostgreSQL database:
```sql
CREATE DATABASE music_streaming;
```

5. Run database migrations:
```bash
cd backend
npm run db:migrate
```

6. Create uploads directory:
```bash
mkdir -p uploads/audio uploads/images uploads/waveforms
```

7. Start the development servers:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`
The backend API will be available at `http://localhost:5000`

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=Music Stream
```

### Backend (.env)
```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/music_streaming
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=100000000
ALLOWED_AUDIO_FORMATS=mp3,wav,ogg,m4a,flac
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/me` - Get current user

### Audio
- `POST /api/audio/upload` - Upload audio file
- `GET /api/audio/:id` - Get audio by ID
- `GET /api/audio/stream/:id` - Stream audio file
- `GET /api/audio/search` - Search audio files
- `DELETE /api/audio/:id` - Delete audio file

### Playlists
- `GET /api/playlists` - Get user playlists
- `POST /api/playlists` - Create playlist
- `GET /api/playlists/:id` - Get playlist details
- `PUT /api/playlists/:id` - Update playlist
- `DELETE /api/playlists/:id` - Delete playlist
- `POST /api/playlists/:id/tracks` - Add track to playlist
- `DELETE /api/playlists/:id/tracks/:trackId` - Remove track from playlist

### Favorites
- `GET /api/favorites` - Get user favorites
- `POST /api/favorites/:audioId` - Add to favorites
- `DELETE /api/favorites/:audioId` - Remove from favorites

### Recent Plays
- `GET /api/recent` - Get recent plays
- `POST /api/recent/:audioId` - Add to recent plays

### Queue
- `GET /api/queue` - Get current queue
- `POST /api/queue` - Set queue
- `POST /api/queue/next` - Play next track
- `POST /api/queue/previous` - Play previous track
- `POST /api/queue/shuffle` - Shuffle queue
- `POST /api/queue/repeat` - Toggle repeat mode

### Admin
- `GET /api/admin/audio` - Get all audio files
- `PUT /api/admin/audio/:id` - Update audio metadata
- `DELETE /api/admin/audio/:id` - Delete audio file
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

## Deployment

### Frontend Deployment (Vercel)

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

### Backend Deployment (Render/Heroku)

1. Push code to GitHub
2. Create new project in Render/Heroku
3. Set environment variables
4. Add PostgreSQL add-on
5. Deploy

### Database

- Use managed PostgreSQL (Supabase, Neon, or AWS RDS)
- Run migrations on deployment

### Storage

For production, consider using:
- AWS S3 or Cloudflare R2 for file storage
- CloudFront or CDN for audio delivery

## License

MIT
