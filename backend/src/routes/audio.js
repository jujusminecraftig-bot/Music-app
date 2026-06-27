const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { uploadBoth } = require('../middleware/upload');
const {
  getAudioDuration,
  generateWaveform,
  getAudioMetadata,
} = require('../services/audioService');
const { downloadYouTubeAudio } = require('../services/youtubeService');
const fs = require('fs');
const path = require('path');

const router = express.Router();

/**
 * @route   POST /api/audio/upload
 * @desc    Upload a new audio file
 * @access  Private
 */
router.post(
  '/upload',
  authenticate,
  uploadBoth,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('artist').notEmpty().withMessage('Artist is required'),
    body('album').optional(),
    body('genre').optional(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Clean up uploaded files if validation fails
        if (req.files?.audio?.[0]) fs.unlinkSync(req.files.audio[0].path);
        if (req.files?.coverArt?.[0]) fs.unlinkSync(req.files.coverArt[0].path);
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.files?.audio?.[0]) {
        return res.status(400).json({ error: 'Audio file is required' });
      }

      const { title, artist, album, genre } = req.body;
      const audioPath = req.files.audio[0].path;
      const coverArtPath = req.files?.coverArt?.[0]?.path;

      // Get audio metadata
      const metadata = await getAudioMetadata(audioPath);
      const duration = Math.round(metadata.duration);

      // Generate waveform
      const waveformPath = path.join('./uploads/waveforms', `${path.basename(audioPath, path.extname(audioPath))}.json`);
      await generateWaveform(audioPath, waveformPath);

      // Save to database
      const audio = await prisma.audio.create({
        data: {
          title,
          artist,
          album,
          genre,
          duration,
          fileSize: req.files.audio[0].size,
          format: metadata.format,
          filePath: audioPath,
          coverArt: coverArtPath,
          waveform: waveformPath,
          uploadedById: req.user.id,
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      });

      res.status(201).json({ audio });
    } catch (error) {
      // Clean up uploaded files on error
      if (req.files?.audio?.[0]?.path && fs.existsSync(req.files.audio[0].path)) {
        fs.unlinkSync(req.files.audio[0].path);
      }
      if (req.files?.coverArt?.[0]?.path && fs.existsSync(req.files.coverArt[0].path)) {
        fs.unlinkSync(req.files.coverArt[0].path);
      }
      next(error);
    }
  }
);

/**
 * @route   POST /api/audio/upload-url
 * @desc    Upload audio from YouTube/URL
 * @access  Private
 */
router.post(
  '/upload-url',
  authenticate,
  [
    body('url').notEmpty().withMessage('URL is required'),
    body('title').optional(),
    body('artist').optional(),
    body('album').optional(),
    body('genre').optional(),
    body('coverArt').optional(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { url, title, artist, album, genre, coverArt } = req.body;

      // Download audio from YouTube/URL
      const { filePath, title: extractedTitle, artist: extractedArtist } = await downloadYouTubeAudio(url, './uploads/audio');

      // Get audio metadata
      const metadata = await getAudioMetadata(filePath);
      const duration = Math.round(metadata.duration);

      // Generate waveform
      const waveformPath = path.join('./uploads/waveforms', `${path.basename(filePath, path.extname(filePath))}.json`);
      await generateWaveform(filePath, waveformPath);

      // Save to database
      const audio = await prisma.audio.create({
        data: {
          title: title || extractedTitle,
          artist: artist || extractedArtist,
          album,
          genre,
          duration,
          fileSize: fs.statSync(filePath).size,
          format: metadata.format,
          filePath,
          coverArt: coverArt || null,
          waveform: waveformPath,
          uploadedById: req.user.id,
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      });

      res.status(201).json({ audio });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/audio/external
 * @desc    Save an external stream track (like YouTube/Deezer) to the database without downloading
 * @access  Private
 */
router.post(
  '/external',
  authenticate,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('artist').notEmpty().withMessage('Artist is required'),
    body('videoId').notEmpty().withMessage('YouTube Video ID is required'),
    body('album').optional(),
    body('coverArt').optional(),
    body('duration').optional(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, artist, album, coverArt, videoId, duration } = req.body;
      const filePath = `youtube:${videoId}`;

      // Save to database
      const audio = await prisma.audio.create({
        data: {
          title,
          artist,
          album: album || null,
          genre: 'Discover',
          duration: duration ? parseInt(duration, 10) : 0,
          fileSize: 0,
          format: 'youtube',
          filePath,
          coverArt: coverArt || null,
          waveform: null,
          uploadedById: req.user.id,
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      });

      res.status(201).json({ audio });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/audio

 * @desc    Get all audio files with pagination and filtering
 * @access  Public
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('genre').optional(),
    query('artist').optional(),
    query('album').optional(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const { genre, artist, album, search } = req.query;

      const where = {
        ...(genre && { genre }),
        ...(artist && { artist: { contains: artist, mode: 'insensitive' } }),
        ...(album && { album: { contains: album, mode: 'insensitive' } }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { artist: { contains: search, mode: 'insensitive' } },
            { album: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      const [audio, total] = await Promise.all([
        prisma.audio.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedBy: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        }),
        prisma.audio.count({ where }),
      ]);

      res.json({
        audio,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/audio/:id
 * @desc    Get a single audio file by ID
 * @access  Public
 */
router.get('/:id', async (req, res, next) => {
  try {
    const audio = await prisma.audio.findUnique({
      where: { id: req.params.id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    if (!audio) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    // Increment play count
    await prisma.audio.update({
      where: { id: req.params.id },
      data: { playCount: { increment: 1 } },
    });

    res.json({ audio });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/audio/stream/:id
 * @desc    Stream audio file
 * @access  Public
 */
router.get('/stream/:id', async (req, res, next) => {
  try {
    const audio = await prisma.audio.findUnique({
      where: { id: req.params.id },
    });

    if (!audio) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    if (!fs.existsSync(audio.filePath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    const stat = fs.statSync(audio.filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = fs.createReadStream(audio.filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'audio/mpeg',
      };

      res.writeHead(206, head);
      stream.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
      };

      res.writeHead(200, head);
      fs.createReadStream(audio.filePath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/audio/:id/waveform
 * @desc    Get waveform data for audio
 * @access  Public
 */
router.get('/:id/waveform', async (req, res, next) => {
  try {
    const audio = await prisma.audio.findUnique({
      where: { id: req.params.id },
    });

    if (!audio) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    if (!audio.waveform || !fs.existsSync(audio.waveform)) {
      return res.status(404).json({ error: 'Waveform data not found' });
    }

    const waveformData = JSON.parse(fs.readFileSync(audio.waveform, 'utf8'));
    res.json({ waveform: waveformData });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/audio/:id
 * @desc    Delete an audio file
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const audio = await prisma.audio.findUnique({
      where: { id: req.params.id },
    });

    if (!audio) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    // Check if user owns the audio or is admin
    if (audio.uploadedById !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to delete this audio' });
    }

    // Delete files
    if (fs.existsSync(audio.filePath)) fs.unlinkSync(audio.filePath);
    if (audio.coverArt && fs.existsSync(audio.coverArt)) fs.unlinkSync(audio.coverArt);
    if (audio.waveform && fs.existsSync(audio.waveform)) fs.unlinkSync(audio.waveform);

    // Delete from database
    await prisma.audio.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Audio deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
