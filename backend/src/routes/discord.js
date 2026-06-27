const express = require('express');
const discordRpc = require('../services/discordRpc');
const path = require('path');

const router = express.Router();

const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

function resolveCoverArt(coverArt) {
  if (!coverArt) return undefined;
  if (coverArt.startsWith('http://') || coverArt.startsWith('https://')) {
    return coverArt;
  }
  const filename = path.basename(coverArt);
  return `${BACKEND_URL}/uploads/images/${filename}`;
}

const ASSET_OVERRIDES = {
  'dairy queen shitter': 'dairyqueen',
};

/**
 * @route   POST /api/discord/presence
 * @desc    Update Discord Rich Presence with current track info
 */
router.post('/presence', async (req, res, next) => {
  try {
    const { title, artist, progress, duration, isPlaying, album, coverArt } = req.body;

    if (!isPlaying || !title) {
      discordRpc.clearActivity();
      return res.json({ status: 'presence_cleared' });
    }

    const now = Date.now();
    const elapsed = Math.floor((progress || 0) * 1000);
    const total = Math.floor((duration || 0) * 1000);

    const hasAlbum = album && album.trim() && album !== artist && album !== title;
    const detailLine = hasAlbum ? `${artist} — ${title}  •  ${album}` : `${artist} — ${title}`;

    const assetKey = ASSET_OVERRIDES[title.toLowerCase()] || resolveCoverArt(coverArt);

    discordRpc.setActivity({
      details: detailLine.substring(0, 128),
      startTimestamp: now - elapsed,
      endTimestamp: total > elapsed ? now + (total - elapsed) : undefined,
      largeImageKey: assetKey,
      url: 'http://localhost:3000',
    });

    res.json({ status: 'presence_updated' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
