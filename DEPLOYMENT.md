# Deployment Guide

This guide covers deploying the Music Streaming Application to production.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- FFmpeg (for audio processing)
- Git

## Local Development Setup

### 1. Clone and Install

```bash
# Navigate to project directory
cd "Music App"

# Install all dependencies
npm install
```

This will install dependencies for both frontend and backend.

### 2. Set Up Environment Variables

Create environment files:

**Backend** (`backend/.env`):
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/music_streaming
JWT_SECRET=your-secret-key-here-change-in-production
JWT_EXPIRES_IN=7d
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=100000000
ALLOWED_AUDIO_FORMATS=mp3,wav,ogg,m4a,flac
CORS_ORIGIN=http://localhost:3000
```

**Frontend** (`frontend/.env.local`):
```bash
cp frontend/.env.local.example frontend/.env.local
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=Music Stream
```

### 3. Set Up Database

```bash
# Create PostgreSQL database
createdb music_streaming

# Or using psql
psql
CREATE DATABASE music_streaming;
\q
```

### 4. Run Database Migrations

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 5. Create Upload Directories

```bash
mkdir -p uploads/audio uploads/images uploads/waveforms
```

### 6. Seed Database (Optional)

```bash
cd backend
npm run seed
```

This creates an admin user (email: `admin@example.com`, password: `admin123`) and a test user.

### 7. Start Development Servers

```bash
# From project root
npm run dev
```

This starts both frontend (http://localhost:3000) and backend (http://localhost:5000) concurrently.

## Production Deployment

### Option 1: Deploy to Render (Recommended)

#### Backend Deployment

1. Push code to GitHub
2. Create new Web Service in Render
3. Configure:
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
   - Environment Variables (from backend/.env.example)
4. Add PostgreSQL database
5. Run migrations in Render's shell:
   ```bash
   cd backend
   npx prisma migrate deploy
   npm run seed
   ```

#### Frontend Deployment

1. Create new Web Service in Render
2. Configure:
   - Build Command: `cd frontend && npm install && npm run build`
   - Start Command: `cd frontend && npm start`
   - Environment Variables:
     - `NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com`

### Option 2: Deploy to Vercel + Railway

#### Backend on Railway

1. Push code to GitHub
2. Create new project in Railway
3. Add PostgreSQL database
4. Add backend service
5. Set environment variables
6. Deploy
7. Run migrations in Railway's shell

#### Frontend on Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

### Option 3: Self-Hosted (VPS)

#### Server Setup

```bash
# Update server
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install FFmpeg
sudo apt install -y ffmpeg

# Install Git
sudo apt install -y git

# Install PM2 (process manager)
sudo npm install -g pm2
```

#### Application Setup

```bash
# Clone repository
git clone <your-repo-url>
cd music-streaming-app

# Install dependencies
npm install

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# Edit environment files with production values
nano backend/.env
nano frontend/.env.local

# Create database
sudo -u postgres psql
CREATE DATABASE music_streaming;
CREATE USER music_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE music_streaming TO music_user;
\q

# Run migrations
cd backend
npx prisma migrate deploy
npx prisma generate

# Seed database (optional)
npm run seed

# Build frontend
cd ../frontend
npm run build

# Create upload directories
cd ..
mkdir -p uploads/audio uploads/images uploads/waveforms
```

#### Configure Nginx

```bash
sudo apt install -y nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/music-streaming
```

Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files (uploads)
    location /uploads/ {
        alias /path/to/music-streaming-app/uploads/;
        add_header Access-Control-Allow-Origin *;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/music-streaming /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Start with PM2

```bash
# Create ecosystem file
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'music-backend',
      script: './backend/src/server.js',
      cwd: '/path/to/music-streaming-app',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
    {
      name: 'music-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/path/to/music-streaming-app/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
```

```bash
# Start applications
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
sudo certbot renew --dry-run
```

## Production Considerations

### Security

1. **Change JWT Secret**: Use a strong, random secret in production
2. **Enable HTTPS**: Always use SSL in production
3. **Rate Limiting**: Already configured, adjust limits as needed
4. **Input Validation**: Already implemented with express-validator
5. **CORS**: Configure CORS_ORIGIN to your frontend domain only

### Storage

For production, consider using cloud storage instead of local files:

**AWS S3 Setup**:
```javascript
// backend/src/config/s3.js (create this file)
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

module.exports = s3;
```

Update environment variables:
```env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name
```

### Database

**Backup Strategy**:
```bash
# Backup
pg_dump music_streaming > backup.sql

# Restore
psql music_streaming < backup.sql
```

**Automated Backups** (cron job):
```bash
# Add to crontab
0 2 * * * pg_dump music_streaming > /backups/music_$(date +\%Y\%m\%d).sql
```

### Monitoring

Install monitoring tools:
```bash
npm install -g pm2-logrotate
pm2 install pm2-logrotate
```

### Scaling

- **Horizontal Scaling**: Use a load balancer (Nginx, HAProxy) with multiple backend instances
- **Database Scaling**: Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
- **CDN**: Use CloudFront or Cloudflare for static assets

## Troubleshooting

### FFmpeg Not Found

```bash
# Ubuntu/Debian
sudo apt install -y ffmpeg

# macOS
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check if database exists
sudo -u postgres psql -l

# Check connection
psql -U music_user -d music_streaming -h localhost
```

### Port Already in Use

```bash
# Find process using port
lsof -i :5000
# or
netstat -tulpn | grep :5000

# Kill process
kill -9 <PID>
```

### Permission Issues

```bash
# Fix upload directory permissions
chmod -R 755 uploads/
chown -R $USER:$USER uploads/
```

## Performance Optimization

### Frontend

1. Enable image optimization in Next.js
2. Implement code splitting
3. Use React.memo for expensive components
4. Implement lazy loading for images

### Backend

1. Implement Redis caching for frequently accessed data
2. Use connection pooling for database
3. Implement CDN for static assets
4. Add compression middleware

### Database

1. Add indexes to frequently queried columns
2. Use connection pooling
3. Implement read replicas for high traffic
4. Regular vacuum and analyze

## Maintenance

### Regular Tasks

1. **Daily**: Monitor logs, check disk space
2. **Weekly**: Review user activity, clean up old files
3. **Monthly**: Database backups, security updates
4. **Quarterly**: Review and update dependencies

### Log Management

```bash
# PM2 logs
pm2 logs music-backend
pm2 logs music-frontend

# Log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## Support

For issues or questions:
- Check the README.md for basic setup
- Review this deployment guide
- Check application logs for errors
- Verify all environment variables are set correctly
