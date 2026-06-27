const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = [
  './uploads/audio',
  './uploads/images',
  './uploads/waveforms',
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage for audio files
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/audio');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Configure storage for image files
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/images');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter for audio
const audioFileFilter = (req, file, cb) => {
  const allowedFormats = process.env.ALLOWED_AUDIO_FORMATS?.split(',') || ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
  const ext = path.extname(file.originalname).toLowerCase().substring(1);
  
  if (allowedFormats.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file format. Allowed formats: ${allowedFormats.join(', ')}`), false);
  }
};

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowedFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  const ext = path.extname(file.originalname).toLowerCase().substring(1);
  
  if (allowedFormats.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid image format. Allowed formats: ${allowedFormats.join(', ')}`), false);
  }
};

// Configure upload middleware
const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024; // 100MB default

const uploadAudio = multer({
  storage: audioStorage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: maxSize,
  },
});

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for images
  },
});

// Configure upload middleware for multiple files
const uploadBoth = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === 'audio') {
        cb(null, './uploads/audio');
      } else if (file.fieldname === 'coverArt') {
        cb(null, './uploads/images');
      } else {
        cb(null, './uploads');
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      const allowedFormats = process.env.ALLOWED_AUDIO_FORMATS?.split(',') || ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
      const ext = path.extname(file.originalname).toLowerCase().substring(1);
      if (allowedFormats.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file format. Allowed formats: ${allowedFormats.join(', ')}`), false);
      }
    } else if (file.fieldname === 'coverArt') {
      const allowedFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
      const ext = path.extname(file.originalname).toLowerCase().substring(1);
      if (allowedFormats.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid image format. Allowed formats: ${allowedFormats.join(', ')}`), false);
      }
    } else {
      cb(new Error('Unexpected file field'), false);
    }
  },
  limits: {
    fileSize: maxSize,
    files: 2,
  },
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'coverArt', maxCount: 1 },
]);

module.exports = { uploadAudio, uploadImage, uploadBoth };
