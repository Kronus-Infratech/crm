const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadToR2 } = require('../utils/s3Storage');
const { protect } = require('../middleware/auth');
const { HTTP_STATUS } = require('../config/constants');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

/**
 * @desc    Upload file to Cloudflare R2
 * @route   POST /api/upload
 * @access  Private
 */
router.post('/', protect, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const { buffer, originalname, mimetype, size } = req.file;
    const fileExt = originalname.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;

    const publicUrl = await uploadToR2(buffer, fileName, mimetype);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: {
        name: originalname,
        url: publicUrl,
        type: mimetype.includes('pdf') ? 'PDF' : 'IMAGE',
        size: size,
      },
    });
  } catch (error) {
    console.error("Upload Route Error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'File upload failed',
    });
  }
});

module.exports = router;
