import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Ensure local uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Disk Storage setup for local fallback
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
});

// Configure Cloudinary if environment variables are provided
const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// @route   POST /api/upload
router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const mime = req.file.mimetype;
    let fileType = 'other';
    if (mime.startsWith('image/')) fileType = 'image';
    else if (mime.startsWith('audio/')) fileType = 'audio';
    else if (mime.startsWith('video/')) fileType = 'video';
    else if (mime.includes('pdf') || mime.includes('document') || mime.includes('text')) fileType = 'document';

    // If Cloudinary configured, upload to Cloudinary and clean local temp file
    if (isCloudinaryConfigured) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'chatly_uploads',
          resource_type: 'auto',
        });
        // Remove temp file
        fs.unlinkSync(req.file.path);

        return res.json({
          url: result.secure_url,
          fileType,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          publicId: result.public_id,
        });
      } catch (cloudErr) {
        console.warn('[Cloudinary Upload Warning] Falling back to local storage:', cloudErr.message);
      }
    }

    // Fallback to local server URL
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    return res.json({
      url: fileUrl,
      fileType,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });
  } catch (error) {
    console.error('[Upload Error]', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
});

export default router;
