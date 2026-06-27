const express = require('express');
const { prisma } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/queue
 * @desc    Get user's current queue
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    let queue = await prisma.queue.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
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

    // Create queue if it doesn't exist
    if (!queue) {
      queue = await prisma.queue.create({
        data: {
          userId: req.user.id,
        },
        include: {
          items: {
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
    }

    res.json({ queue });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/queue
 * @desc    Set queue with new tracks
 * @access  Private
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { audioIds, currentTrackId } = req.body;

    if (!Array.isArray(audioIds)) {
      return res.status(400).json({ error: 'audioIds must be an array' });
    }

    // Delete existing queue items
    await prisma.queueItem.deleteMany({
      where: {
        queue: { userId: req.user.id },
      },
    });

    // Create new queue items
    const queue = await prisma.queue.upsert({
      where: { userId: req.user.id },
      update: {
        currentTrack: currentTrackId || null,
        updatedAt: new Date(),
      },
      create: {
        userId: req.user.id,
        currentTrack: currentTrackId || null,
      },
      include: {
        items: {
          include: {
            audio: true,
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    // Add items to queue
    for (let i = 0; i < audioIds.length; i++) {
      await prisma.queueItem.create({
        data: {
          queueId: queue.id,
          audioId: audioIds[i],
          position: i,
        },
      });
    }

    // Fetch updated queue with items
    const updatedQueue = await prisma.queue.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
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

    res.json({ queue: updatedQueue });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/queue/current
 * @desc    Set current playing track
 * @access  Private
 */
router.post('/current', authenticate, async (req, res, next) => {
  try {
    const { audioId, isPlaying } = req.body;

    const queue = await prisma.queue.upsert({
      where: { userId: req.user.id },
      update: {
        currentTrack: audioId,
        isPlaying: isPlaying !== undefined ? isPlaying : true,
        updatedAt: new Date(),
      },
      create: {
        userId: req.user.id,
        currentTrack: audioId,
        isPlaying: isPlaying !== undefined ? isPlaying : true,
      },
    });

    res.json({ queue });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/queue/next
 * @desc    Play next track in queue
 * @access  Private
 */
router.post('/next', authenticate, async (req, res, next) => {
  try {
    const queue = await prisma.queue.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            audio: true,
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!queue || queue.items.length === 0) {
      return res.status(404).json({ error: 'Queue is empty' });
    }

    // Find current track position
    const currentIndex = queue.items.findIndex(item => item.audioId === queue.currentTrack);
    let nextIndex;

    if (queue.repeatMode === 'one') {
      nextIndex = currentIndex;
    } else if (queue.repeatMode === 'all' || currentIndex < queue.items.length - 1) {
      nextIndex = (currentIndex + 1) % queue.items.length;
    } else {
      // End of queue, no repeat
      nextIndex = currentIndex;
    }

    const nextTrack = queue.items[nextIndex];

    const updatedQueue = await prisma.queue.update({
      where: { userId: req.user.id },
      data: {
        currentTrack: nextTrack.audioId,
        isPlaying: true,
        updatedAt: new Date(),
      },
    });

    res.json({ queue: updatedQueue, nextTrack: nextTrack.audio });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/queue/previous
 * @desc    Play previous track in queue
 * @access  Private
 */
router.post('/previous', authenticate, async (req, res, next) => {
  try {
    const queue = await prisma.queue.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            audio: true,
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!queue || queue.items.length === 0) {
      return res.status(404).json({ error: 'Queue is empty' });
    }

    // Find current track position
    const currentIndex = queue.items.findIndex(item => item.audioId === queue.currentTrack);
    let prevIndex;

    if (currentIndex <= 0) {
      prevIndex = queue.items.length - 1;
    } else {
      prevIndex = currentIndex - 1;
    }

    const prevTrack = queue.items[prevIndex];

    const updatedQueue = await prisma.queue.update({
      where: { userId: req.user.id },
      data: {
        currentTrack: prevTrack.audioId,
        isPlaying: true,
        updatedAt: new Date(),
      },
    });

    res.json({ queue: updatedQueue, prevTrack: prevTrack.audio });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/queue/shuffle
 * @desc    Toggle shuffle mode
 * @access  Private
 */
router.post('/shuffle', authenticate, async (req, res, next) => {
  try {
    const queue = await prisma.queue.findUnique({
      where: { userId: req.user.id },
      include: {
        items: true,
      },
    });

    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    const newShuffleState = !queue.isShuffled;

    let updatedQueue;

    if (newShuffleState) {
      // Shuffle the items
      const shuffledItems = [...queue.items].sort(() => Math.random() - 0.5);

      // Update positions
      for (let i = 0; i < shuffledItems.length; i++) {
        await prisma.queueItem.update({
          where: { id: shuffledItems[i].id },
          data: { position: i },
        });
      }

      updatedQueue = await prisma.queue.update({
        where: { userId: req.user.id },
        data: {
          isShuffled: true,
          updatedAt: new Date(),
        },
      });
    } else {
      // Sort by original order (by addedAt)
      const sortedItems = await prisma.queueItem.findMany({
        where: { queueId: queue.id },
        orderBy: { addedAt: 'asc' },
      });

      for (let i = 0; i < sortedItems.length; i++) {
        await prisma.queueItem.update({
          where: { id: sortedItems[i].id },
          data: { position: i },
        });
      }

      updatedQueue = await prisma.queue.update({
        where: { userId: req.user.id },
        data: {
          isShuffled: false,
          updatedAt: new Date(),
        },
      });
    }

    res.json({ queue: updatedQueue });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/queue/repeat
 * @desc    Toggle repeat mode (none, all, one)
 * @access  Private
 */
router.post('/repeat', authenticate, async (req, res, next) => {
  try {
    const queue = await prisma.queue.findUnique({
      where: { userId: req.user.id },
    });

    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    const repeatModes = ['none', 'all', 'one'];
    const currentIndex = repeatModes.indexOf(queue.repeatMode);
    const nextIndex = (currentIndex + 1) % repeatModes.length;
    const nextMode = repeatModes[nextIndex];

    const updatedQueue = await prisma.queue.update({
      where: { userId: req.user.id },
      data: {
        repeatMode: nextMode,
        updatedAt: new Date(),
      },
    });

    res.json({ queue: updatedQueue });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/queue/volume
 * @desc    Set volume
 * @access  Private
 */
router.post('/volume', authenticate, async (req, res, next) => {
  try {
    const { volume } = req.body;

    if (typeof volume !== 'number' || volume < 0 || volume > 1) {
      return res.status(400).json({ error: 'Volume must be a number between 0 and 1' });
    }

    const queue = await prisma.queue.upsert({
      where: { userId: req.user.id },
      update: {
        volume,
        updatedAt: new Date(),
      },
      create: {
        userId: req.user.id,
        volume,
      },
    });

    res.json({ queue });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/queue
 * @desc    Clear queue
 * @access  Private
 */
router.delete('/', authenticate, async (req, res, next) => {
  try {
    await prisma.queueItem.deleteMany({
      where: {
        queue: { userId: req.user.id },
      },
    });

    const queue = await prisma.queue.update({
      where: { userId: req.user.id },
      data: {
        currentTrack: null,
        isPlaying: false,
        updatedAt: new Date(),
      },
    });

    res.json({ queue, message: 'Queue cleared' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
