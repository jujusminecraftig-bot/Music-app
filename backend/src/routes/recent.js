const express = require('express');
const { prisma } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/recent
 * @desc    Get user's recently played audio
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const recentPlays = await prisma.recentPlay.findMany({
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
      orderBy: { playedAt: 'desc' },
      take: 50,
    });

    res.json({ recentPlays });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/recent/:audioId
 * @desc    Add audio to recently played
 * @access  Private
 */
router.post('/:audioId', authenticate, async (req, res, next) => {
  try {
    const audioId = req.params.audioId;
    const { progress } = req.body;

    // Check if audio exists
    const audio = await prisma.audio.findUnique({
      where: { id: audioId },
    });

    if (!audio) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    // Check if already in recent plays
    const existingRecent = await prisma.recentPlay.findFirst({
      where: {
        userId: req.user.id,
        audioId,
      },
    });

    if (existingRecent) {
      // Update existing record
      const updatedRecent = await prisma.recentPlay.update({
        where: { id: existingRecent.id },
        data: {
          playedAt: new Date(),
          progress: progress || 0,
        },
        include: {
          audio: true,
        },
      });

      res.json({ recentPlay: updatedRecent });
    } else {
      // Create new record
      const recentPlay = await prisma.recentPlay.create({
        data: {
          userId: req.user.id,
          audioId,
          progress: progress || 0,
        },
        include: {
          audio: true,
        },
      });

      res.status(201).json({ recentPlay });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/recent
 * @desc    Clear recently played history
 * @access  Private
 */
router.delete('/', authenticate, async (req, res, next) => {
  try {
    await prisma.recentPlay.deleteMany({
      where: { userId: req.user.id },
    });

    res.json({ message: 'Recently played history cleared' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
