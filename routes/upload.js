import express from 'express';
import multer from 'multer';
import { authenticateSession } from '../middleware/auth.js';
import { uploadFileToS3, deleteFileFromS3 } from '../utils/s3Manager.js';

const router = express.Router();

// Configure multer to use memory storage (for S3 upload)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default
  },
  fileFilter: (req, file, cb) => {
    // Accept images, html, and zip files
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/html',
      'application/zip',
      'application/x-zip-compressed'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: images, HTML, ZIP`));
    }
  }
});

// Helper to determine S3 folder based on file type
const getS3Folder = (fieldName, mimetype) => {
  if (fieldName === 'gif' || mimetype === 'image/gif') {
    return 'gif';
  } else if (fieldName === 'icon' || fieldName === 'thumbnail') {
    return 'thumbnail';
  } else if (fieldName === 'htmlZip' || mimetype === 'text/html' || mimetype.includes('zip')) {
    return 'games';
  }
  return 'assets';
};

// Upload multiple files to S3
router.post('/files', authenticateSession, upload.fields([
  { name: 'gif', maxCount: 1 },
  { name: 'icon', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
  { name: 'htmlZip', maxCount: 1 }
]), async (req, res, next) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = {};

    // Process each uploaded file
    for (const [fieldName, files] of Object.entries(req.files)) {
      const file = files[0];
      const folder = getS3Folder(fieldName, file.mimetype);
      
      // Preserve original name for ZIP files (HTML games)
      const preserveOriginalName = fieldName === 'htmlZip' || file.mimetype.includes('zip');
      
      // Upload to S3
      const s3Result = await uploadFileToS3(file, folder, preserveOriginalName);
      
      uploadedFiles[fieldName] = {
        filename: s3Result.key.split('/').pop(),
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        path: s3Result.path,
        url: s3Result.url,
        s3Key: s3Result.key
      };
    }

    res.json({
      success: true,
      message: 'Files uploaded successfully to S3',
      data: uploadedFiles
    });
  } catch (error) {
    next(error);
  }
});

// Upload single file to S3
router.post('/file', authenticateSession, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const folder = getS3Folder(req.file.fieldname, req.file.mimetype);
    // Preserve original name for ZIP files (HTML games)
    const preserveOriginalName = req.file.fieldname === 'htmlZip' || req.file.mimetype.includes('zip');
    const s3Result = await uploadFileToS3(req.file, folder, preserveOriginalName);

    res.json({
      success: true,
      message: 'File uploaded successfully to S3',
      data: {
        filename: s3Result.key.split('/').pop(),
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: s3Result.path,
        url: s3Result.url,
        s3Key: s3Result.key
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete file from S3
router.delete('/file', authenticateSession, async (req, res, next) => {
  try {
    const { filePath, s3Key } = req.body;
    
    if (!filePath && !s3Key) {
      return res.status(400).json({
        success: false,
        message: 'File path or S3 key is required'
      });
    }

    const keyToDelete = s3Key || filePath;
    await deleteFileFromS3(keyToDelete);

    res.json({
      success: true,
      message: 'File deleted successfully from S3'
    });
  } catch (error) {
    next(error);
  }
});

export default router;