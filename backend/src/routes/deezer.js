const express = require('express');
const router = express.Router();
const https = require('https');
const ytdlp = require('yt-dlp-exec');

// Helper to fetch JSON from external API using Node's native https module (works on all Node versions)
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Scrape YouTube for video ID (lightning fast, ~100-200ms)
function scrapeYoutubeVideoId(query) {
  return new Promise((resolve, reject) => {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    https.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          // Find first "videoId":"xxxx" where it's part of a regular video result
          const regex = /"videoId":"([^"]+)"/g;
          let match;
          const videoIds = [];
          while ((match = regex.exec(data)) !== null) {
            if (match[1] && !videoIds.includes(match[1])) {
              videoIds.push(match[1]);
            }
          }
          if (videoIds.length > 0) {
            resolve(videoIds[0]);
          } else {
            reject(new Error('No video IDs found in scraped HTML'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * @route   GET /api/deezer/search
 * @desc    Search tracks on Deezer API
 * @access  Public
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query parameter "q" is required' });
    }
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(q)}`;
    const data = await fetchJSON(url);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/deezer/chart
 * @desc    Get global trending charts from Deezer API
 * @access  Public
 */
router.get('/chart', async (req, res, next) => {
  try {
    const url = 'https://api.deezer.com/chart';
    const data = await fetchJSON(url);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/deezer/youtube-id
 * @desc    Resolve Deezer song (artist + title) to YouTube video ID
 * @access  Public
 */
router.get('/youtube-id', async (req, res, next) => {
  try {
    const { artist, title } = req.query;
    if (!artist || !title) {
      return res.status(400).json({ error: 'Artist and title parameters are required' });
    }

    const searchQuery = `${artist} - ${title} (Official Audio)`;
    console.log(`[YT Resolver] Attempting to resolve: "${searchQuery}"`);

    // 1. Try fast scraping first
    try {
      const videoId = await scrapeYoutubeVideoId(searchQuery);
      if (videoId) {
        console.log(`[YT Resolver] Successfully scraped video ID: ${videoId} for "${searchQuery}"`);
        return res.json({ videoId });
      }
    } catch (scrapeErr) {
      console.warn(`[YT Resolver] Fast scraper failed: ${scrapeErr.message}. Falling back to yt-dlp...`);
    }

    // 2. Fallback to yt-dlp-exec
    try {
      const info = await ytdlp(`ytsearch1:${searchQuery}`, {
        dumpJson: true,
        noWarnings: true,
        noCheckCertificates: true,
        flatPlaylist: true,
      });

      let videoId = null;
      if (info && info.entries && info.entries.length > 0) {
        videoId = info.entries[0].id;
      } else if (info && info.id) {
        videoId = info.id;
      }

      if (videoId) {
        console.log(`[YT Resolver] yt-dlp successfully resolved video ID: ${videoId}`);
        return res.json({ videoId });
      }
    } catch (ytdlpErr) {
      console.error(`[YT Resolver] yt-dlp fallback also failed: ${ytdlpErr.message}`);
    }

    return res.status(404).json({ error: 'Could not resolve track to a YouTube Video ID' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
