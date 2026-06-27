const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { WaveFile } = require('wavefile');

/**
 * Get audio file duration using FFmpeg
 * @param {String} filePath - Path to audio file
 * @returns {Promise<Number>} Duration in seconds
 */
function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata.format.duration);
      }
    });
  });
}

/**
 * Transcode audio to different formats
 * @param {String} inputPath - Input file path
 * @param {String} outputPath - Output file path
 * @param {String} format - Target format (mp3, ogg, etc.)
 * @returns {Promise<void>}
 */
function transcodeAudio(inputPath, outputPath, format = 'mp3') {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);

    switch (format) {
      case 'mp3':
        command = command.audioCodec('libmp3lame').audioBitrate(192);
        break;
      case 'ogg':
        command = command.audioCodec('libvorbis').audioBitrate(192);
        break;
      case 'm4a':
        command = command.audioCodec('aac').audioBitrate(192);
        break;
      default:
        command = command.audioCodec('libmp3lame').audioBitrate(192);
    }

    command
      .toFormat(format)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

/**
 * Generate waveform data from audio file
 * @param {String} filePath - Path to audio file
 * @param {String} outputPath - Path to save waveform JSON
 * @returns {Promise<void>}
 */
async function generateWaveform(filePath, outputPath) {
  return new Promise((resolve, reject) => {
    // Extract audio as WAV for waveform analysis
    const tempWavPath = path.join(path.dirname(outputPath), 'temp_' + path.basename(outputPath, '.json') + '.wav');
    
    ffmpeg(filePath)
      .toFormat('wav')
      .audioChannels(1)
      .audioFrequency(44100)
      .on('end', () => {
        try {
          // Read WAV file and extract waveform data
          const buffer = fs.readFileSync(tempWavPath);
          const wav = new WaveFile(buffer);
          
          // Get PCM data
          const samples = wav.getSamples();
          const numSamples = samples.length;
          
          // Downsample to 1000 points for visualization
          const points = 1000;
          const step = Math.floor(numSamples / points);
          const waveform = [];
          
          for (let i = 0; i < points; i++) {
            const start = i * step;
            const end = start + step;
            let max = 0;
            
            for (let j = start; j < end && j < numSamples; j++) {
              const sample = Math.abs(samples[j]);
              if (sample > max) max = sample;
            }
            
            waveform.push(max);
          }
          
          // Normalize waveform to 0-1 range
          const maxVal = Math.max(...waveform);
          const normalizedWaveform = waveform.map(v => maxVal > 0 ? v / maxVal : 0);
          
          // Save as JSON
          fs.writeFileSync(outputPath, JSON.stringify(normalizedWaveform));
          
          // Clean up temp file
          fs.unlinkSync(tempWavPath);
          
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (err) => {
        reject(err);
      })
      .save(tempWavPath);
  });
}

/**
 * Extract metadata from audio file
 * @param {String} filePath - Path to audio file
 * @returns {Promise<Object>} Audio metadata
 */
function getAudioMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const format = metadata.format;
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
        
        resolve({
          duration: format.duration,
          format: path.extname(filePath).substring(1),
          bitrate: format.bit_rate,
          sampleRate: audioStream?.sample_rate,
          channels: audioStream?.channels,
          codec: audioStream?.codec_name,
        });
      }
    });
  });
}

module.exports = {
  getAudioDuration,
  transcodeAudio,
  generateWaveform,
  getAudioMetadata,
};
