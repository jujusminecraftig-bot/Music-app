const express = require('express');
const { prisma } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/favorites
 * @desc    Get user's favorite audio
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.id },
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
      orderBy: { createdAt: 'desc' },
    });

    res.json({ favorites });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/favorites/:audioId
 * @desc    Add audio to favorites
 * @access  Private
 */
router.post('/:audioId', authenticate, async (req, res, next) => {
  try {
    const audioId = req.params.audioId;

    // Check if audio exists
    const audio = await prisma.audio.findUnique({
      where: { id: audioId },
    });

    if (!audio) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    // Check if already favorited
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_audioId: {
          userId: req.user.id,
          audioId,
        },
      },
    });

    if (existingFavorite) {
      return res.status(409).json({ error: 'Audio already in favorites' });
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId: req.user.id,
        audioId,
      },
      include: {
        audio: true,
      },
    });

    res.status(201).json({ favorite });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/favorites/:audioId
 * @desc    Remove audio from favorites
 * @access  Private
 */
router.delete('/:audioId', authenticate, async (req, res, next) => {
  try {
    const audioId = req.params.audioId;

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_audioId: {
          userId: req.user.id,
          audioId,
        },
      },
    });

    if (!favorite) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    await prisma.favorite.delete({
      where: {
        userId_audioId: {
          userId: req.user.id,
          audioId,
        },
      },
    });

    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/favorites/check/:audioId
 * @desc    Check if audio is in user's favorites
 * @access  Private
 */
router.get('/check/:audioId', authenticate, async (req, res, next) => {
  try {
    const audioId = req.params.audioId;

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_audioId: {
          userId: req.user.id,
          audioId,
        },
      },
    });

    res.json({ isFavorite: !!favorite });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
