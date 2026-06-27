const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');

const router = express.Router();

/**
 * @route   GET /api/playlists
 * @desc    Get all playlists for current user
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const playlists = await prisma.playlist.findMany({
      where: { userId: req.user.id },
      include: {
        tracks: {
          include: {
            audio: {
              include: {
                uploadedBy: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                  },
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        _count: {
          select: { tracks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ playlists });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/playlists
 * @desc    Create a new playlist
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  uploadImage.single('coverArt'),
  [
    body('name').notEmpty().withMessage('Playlist name is required'),
    body('description').optional(),
    body('isPublic').optional().isBoolean(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, isPublic } = req.body;
      const coverArtPath = req.file?.path;

      const playlist = await prisma.playlist.create({
        data: {
          name,
          description,
          isPublic: isPublic === true,
          coverArt: coverArtPath,
          userId: req.user.id,
        },
      });

      res.status(201).json({ playlist });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/playlists/:id
 * @desc    Get a single playlist by ID
 * @access  Public (if public) or Private (if own)
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const playlist = await prisma.playlist.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        tracks: {
          include: {
            audio: {
              include: {
                uploadedBy: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                  },
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Check if user has access (own playlist or public playlist)
    if (playlist.userId !== req.user.id && !playlist.isPublic) {
      return res.status(403).json({ error: 'You do not have access to this playlist' });
    }

    res.json({ playlist });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/playlists/:id
 * @desc    Update a playlist
 * @access  Private
 */
router.put(
  '/:id',
  authenticate,
  uploadImage.single('coverArt'),
  [
    body('name').optional().notEmpty(),
    body('description').optional(),
    body('isPublic').optional().isBoolean(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const playlist = await prisma.playlist.findUnique({
        where: { id: req.params.id },
      });

      if (!playlist) {
        return res.status(404).json({ error: 'Playlist not found' });
      }

      if (playlist.userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to update this playlist' });
      }

      const { name, description, isPublic } = req.body;
      const coverArtPath = req.file?.path;

      const updatedPlaylist = await prisma.playlist.update({
        where: { id: req.params.id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(isPublic !== undefined && { isPublic }),
          ...(coverArtPath && { coverArt: coverArtPath }),
        },
      });

      res.json({ playlist: updatedPlaylist });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/playlists/:id
 * @desc    Delete a playlist
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const playlist = await prisma.playlist.findUnique({
      where: { id: req.params.id },
    });

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (playlist.userId !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to delete this playlist' });
    }

    await prisma.playlist.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/playlists/:id/tracks
 * @desc    Add a track to a playlist
 * @access  Private
 */
router.post(
  '/:id/tracks',
  authenticate,
  [body('audioId').notEmpty().withMessage('Audio ID is required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { audioId } = req.body;

      const playlist = await prisma.playlist.findUnique({
        where: { id: req.params.id },
        include: {
          tracks: {
            orderBy: { position: 'desc' },
            take: 1,
          },
        },
      });

      if (!playlist) {
        return res.status(404).json({ error: 'Playlist not found' });
      }

      if (playlist.userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to modify this playlist' });
      }

      // Check if audio exists
      const audio = await prisma.audio.findUnique({
        where: { id: audioId },
      });

      if (!audio) {
        return res.status(404).json({ error: 'Audio not found' });
      }

      // Check if track already exists in playlist
      const existingTrack = await prisma.playlistTrack.findUnique({
        where: {
          playlistId_audioId: {
            playlistId: req.params.id,
            audioId,
          },
        },
      });

      if (existingTrack) {
        return res.status(409).json({ error: 'Track already in playlist' });
      }

      // Get next position
      const nextPosition = playlist.tracks.length > 0 ? playlist.tracks[0].position + 1 : 0;

      const playlistTrack = await prisma.playlistTrack.create({
        data: {
          playlistId: req.params.id,
          audioId,
          position: nextPosition,
        },
        include: {
          audio: true,
        },
      });

      res.status(201).json({ track: playlistTrack });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/playlists/:id/tracks/:trackId
 * @desc    Remove a track from a playlist
 * @access  Private
 */
router.delete('/:id/tracks/:trackId', authenticate, async (req, res, next) => {
  try {
    const playlist = await prisma.playlist.findUnique({
      where: { id: req.params.id },
    });

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (playlist.userId !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to modify this playlist' });
    }

    // Delete the track
    await prisma.playlistTrack.delete({
      where: { id: req.params.trackId },
    });

    // Reorder remaining tracks
    const remainingTracks = await prisma.playlistTrack.findMany({
      where: { playlistId: req.params.id },
      orderBy: { position: 'asc' },
    });

    for (let i = 0; i < remainingTracks.length; i++) {
      await prisma.playlistTrack.update({
        where: { id: remainingTracks[i].id },
        data: { position: i },
      });
    }

    res.json({ message: 'Track removed from playlist' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
