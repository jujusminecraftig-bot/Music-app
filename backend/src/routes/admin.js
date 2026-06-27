const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');

const router = express.Router();

// Apply authentication and admin check to all routes
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/admin/stats
 * @desc    Get admin statistics
 * @access  Admin
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [userCount, audioCount, playlistCount, totalPlays] = await Promise.all([
      prisma.user.count(),
      prisma.audio.count(),
      prisma.playlist.count(),
      prisma.audio.aggregate({
        _sum: { playCount: true },
      }),
    ]);

    res.json({
      stats: {
        users: userCount,
        audio: audioCount,
        playlists: playlistCount,
        totalPlays: totalPlays._sum.playCount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Admin
 */
router.get(
  '/users',
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            avatar: true,
            isAdmin: true,
            createdAt: true,
            _count: {
              select: {
                uploadedAudio: true,
                playlists: true,
              },
            },
          },
        }),
        prisma.user.count(),
      ]);

      res.json({
        users,
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
 * @route   PUT /api/admin/users/:id
 * @desc    Update user
 * @access  Admin
 */
router.put(
  '/users/:id',
  [body('isAdmin').optional().isBoolean(), body('displayName').optional()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { isAdmin, displayName } = req.body;

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: {
          ...(isAdmin !== undefined && { isAdmin }),
          ...(displayName && { displayName }),
        },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatar: true,
          isAdmin: true,
          createdAt: true,
        },
      });

      res.json({ user });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Admin
 */
router.delete('/users/:id', async (req, res, next) => {
  try {
    await prisma.user.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/audio
 * @desc    Get all audio files
 * @access  Admin
 */
router.get(
  '/audio',
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [audio, total] = await Promise.all([
        prisma.audio.findMany({
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
        prisma.audio.count(),
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
 * @route   PUT /api/admin/audio/:id
 * @desc    Update audio metadata
 * @access  Admin
 */
router.put(
  '/audio/:id',
  [body('title').optional(), body('artist').optional(), body('album').optional(), body('genre').optional()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, artist, album, genre } = req.body;

      const audio = await prisma.audio.update({
        where: { id: req.params.id },
        data: {
          ...(title && { title }),
          ...(artist && { artist }),
          ...(album !== undefined && { album }),
          ...(genre !== undefined && { genre }),
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

      res.json({ audio });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/admin/audio/:id
 * @desc    Delete audio file
 * @access  Admin
 */
router.delete('/audio/:id', async (req, res, next) => {
  try {
    const audio = await prisma.audio.findUnique({
      where: { id: req.params.id },
    });

    if (!audio) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    const fs = require('fs');

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
