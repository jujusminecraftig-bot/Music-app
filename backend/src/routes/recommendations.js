const express = require('express');
const { prisma } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const MIX_SIZE = 25;
const TASTE_WINDOW_DAYS = 30;

function seededShuffle(array, seed) {
  const result = [...array];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function dateSeed(userId) {
  const today = new Date().toISOString().slice(0, 10);
  let hash = 0;
  const str = `${userId}-${today}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function scoreTrack(audio, genreWeights, artistWeights) {
  let score = audio.playCount || 0;
  if (audio.genre && genreWeights[audio.genre]) {
    score += genreWeights[audio.genre] * 10;
  }
  if (artistWeights[audio.artist]) {
    score += artistWeights[audio.artist] * 8;
  }
  return score;
}

/**
 * @route   GET /api/recommendations/daily-mix
 * @desc    Personalized daily mix based on listening history & favorites
 * @access  Private
 */
router.get('/daily-mix', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const since = new Date();
    since.setDate(since.getDate() - TASTE_WINDOW_DAYS);

    const [recentPlays, favorites] = await Promise.all([
      prisma.recentPlay.findMany({
        where: { userId, playedAt: { gte: since } },
        include: { audio: true },
        orderBy: { playedAt: 'desc' },
        take: 100,
      }),
      prisma.favorite.findMany({
        where: { userId },
        include: { audio: true },
        take: 50,
      }),
    ]);

    const favoriteAudios = favorites.map((f) => f.audio).filter(Boolean);

    if (recentPlays.length === 0 && favoriteAudios.length === 0) {
      return res.json({
        tracks: [],
        tasteProfile: null,
        message: 'Listen to or favorite some music to unlock your Daily Mix',
      });
    }

    const tasteSignals = [
      ...recentPlays.map((rp, i) => ({ audio: rp.audio, weight: Math.max(1, 10 - Math.floor(i / 5)), source: 'recent' })),
      ...favoriteAudios.map((audio) => ({ audio, weight: 10, source: 'favorite' })),
    ].filter((s) => s.audio);

    const genreWeights = {};
    const artistWeights = {};
    const recentAudioIds = recentPlays.map((r) => r.audioId);
    const hardExcludeIds = new Set(recentAudioIds.slice(0, 3));

    for (const { audio, weight } of tasteSignals) {
      if (audio.genre) {
        genreWeights[audio.genre] = (genreWeights[audio.genre] || 0) + weight;
      }
      artistWeights[audio.artist] = (artistWeights[audio.artist] || 0) + weight;
    }

    const topGenres = Object.entries(genreWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([g]) => g);

    const topArtists = Object.entries(artistWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([a]) => a);

    const orConditions = [
      ...(topGenres.length ? [{ genre: { in: topGenres } }] : []),
      ...(topArtists.length ? [{ artist: { in: topArtists } }] : []),
    ];

    const candidates = orConditions.length > 0
      ? await prisma.audio.findMany({
          where: {
            id: { notIn: [...hardExcludeIds] },
            OR: orConditions,
          },
          take: 200,
        })
      : [];

    let pool = candidates;

    if (pool.length < MIX_SIZE) {
      const fallback = await prisma.audio.findMany({
        where: { id: { notIn: [...hardExcludeIds, ...pool.map((a) => a.id)] } },
        orderBy: { playCount: 'desc' },
        take: MIX_SIZE * 2,
      });
      pool = [...pool, ...fallback];
    }

    const scored = pool
      .map((audio) => ({ audio, score: scoreTrack(audio, genreWeights, artistWeights) }))
      .sort((a, b) => b.score - a.score);

    const discoveryTarget = Math.ceil(MIX_SIZE * 0.5);
    const favoritesTarget = Math.ceil(MIX_SIZE * 0.35);

    const discoveryTracks = seededShuffle(
      scored.slice(0, Math.min(60, scored.length)),
      dateSeed(userId)
    ).slice(0, discoveryTarget).map((s) => s.audio);

    const favoriteTracks = seededShuffle(
      favoriteAudios
        .filter((a) => !hardExcludeIds.has(a.id))
        .map((audio) => ({ audio, score: 1 })),
      dateSeed(userId) + 2
    ).slice(0, favoritesTarget).map((s) => s.audio);

    const usedIds = new Set([...hardExcludeIds]);
    const tracks = [];

    const addTrack = (track) => {
      if (!track || usedIds.has(track.id) || tracks.length >= MIX_SIZE) return;
      usedIds.add(track.id);
      tracks.push(track);
    };

    // Interleave discovery + favorites for variety
    const maxLen = Math.max(discoveryTracks.length, favoriteTracks.length);
    for (let i = 0; i < maxLen; i++) {
      addTrack(discoveryTracks[i]);
      addTrack(favoriteTracks[i]);
    }

    // Pad with recent listens
    if (tracks.length < MIX_SIZE) {
      const historyPad = recentPlays
        .map((r) => r.audio)
        .filter((a) => a && !usedIds.has(a.id))
        .filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i);

      for (const track of seededShuffle(
        historyPad.map((audio) => ({ audio, score: 1 })),
        dateSeed(userId) + 1
      ).map((s) => s.audio)) {
        addTrack(track);
      }
    }

    // Pad with more favorites (including ones skipped earlier due to interleave cap)
    if (tracks.length < MIX_SIZE) {
      for (const track of seededShuffle(
        favoriteAudios.map((audio) => ({ audio, score: 1 })),
        dateSeed(userId) + 3
      ).map((s) => s.audio)) {
        addTrack(track);
      }
    }

    // Last resort: popular library tracks
    if (tracks.length < MIX_SIZE) {
      const anyTracks = await prisma.audio.findMany({
        where: { id: { notIn: [...usedIds] } },
        orderBy: { playCount: 'desc' },
        take: MIX_SIZE,
      });
      for (const track of anyTracks) addTrack(track);
    }

    // Tiny library: fill from all taste signals
    if (tracks.length === 0 && tasteSignals.length > 0) {
      const unique = [];
      const seen = new Set();
      for (const { audio } of tasteSignals) {
        if (audio && !seen.has(audio.id)) {
          seen.add(audio.id);
          unique.push(audio);
        }
      }
      for (const track of seededShuffle(
        unique.map((audio) => ({ audio, score: 1 })),
        dateSeed(userId)
      ).map((s) => s.audio)) {
        addTrack(track);
      }
    }

    res.json({
      tracks,
      tasteProfile: {
        topGenres,
        topArtists,
        basedOn: recentPlays.length + favorites.length,
        favoriteCount: favorites.length,
        recentCount: recentPlays.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
