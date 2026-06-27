const ytdlp = require('yt-dlp-exec');
const { getAudioMetadata } = require('./audioService');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

async function downloadYouTubeAudio(url, outputPath) {
  try {
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.m4a`;
    const m4aPath = path.join(outputPath, filename);
    const mp3Path = path.join(outputPath, filename.replace('.m4a', '.mp3'));

    // Download audio using yt-dlp without conversion (faster, more reliable)
    const downloadPromise = ytdlp(url, {
      output: m4aPath,
      format: '140', // Use format 140 (m4a audio only) for faster download
      noCheckCertificates: true,
      noWarnings: true,
      noPlaylist: true,
      playlistItems: '1',
    });

    // Add timeout of 5 minutes
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Download timeout after 5 minutes')), 5 * 60 * 1000);
    });

    await Promise.race([downloadPromise, timeoutPromise]);

    // Convert m4a to mp3 using our existing audioService
    const { spawn } = require('child_process');
    const absoluteM4aPath = path.resolve(m4aPath);
    const absoluteMp3Path = path.resolve(mp3Path);
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn(process.env.FFMPEG_PATH || 'C:\\ffmpeg\\bin\\ffmpeg.exe', [
        '-i', absoluteM4aPath,
        '-c:a', 'libmp3lame',
        '-q:a', '2',
        absoluteMp3Path
      ]);
      ffmpeg.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}`));
      });
      ffmpeg.on('error', reject);
    });

    // Clean up m4a file
    fs.unlinkSync(m4aPath);

    // Get metadata from the downloaded file
    const metadata = await getAudioMetadata(mp3Path);

    // Try to get video info for title/artist
    let title = 'Unknown Title';
    let artist = 'Unknown Artist';

    try {
      const info = await ytdlp(url, {
        dumpJson: true,
        noWarnings: true,
        noCheckCertificates: true,
      });
      title = info.title || title;
      artist = info.uploader || artist;
    } catch (infoError) {
      // If we can't get info, use the filename
      console.warn('Could not fetch video info, using defaults');
    }

    return { filePath: mp3Path, title, artist };
  } catch (error) {
    throw new Error(`Failed to download YouTube audio: ${error.message}`);
  }
}

module.exports = { downloadYouTubeAudio };
