const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

['uploads/images', 'uploads/videos', 'uploads/documents'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const getFileType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  return 'document';
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = getFileType(file.mimetype);
    const folder = type === 'image' ? 'uploads/images'
                 : type === 'video' ? 'uploads/videos'
                 : 'uploads/documents';
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = crypto.randomBytes(16).toString('hex') + ext;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Недопустимый тип файла: ' + file.mimetype), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
});

// POST /api/upload/:achievement_id
router.post('/:achievement_id', authMiddleware, upload.array('files', 10), async (req, res) => {
  try {
    const { achievement_id } = req.params;

    const check = await pool.query(
      'SELECT user_id FROM achievements WHERE id = $1',
      [achievement_id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Достижение не найдено' });
    }

    if (check.rows[0].user_id !== req.user.id &&
        !['curator', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Нет прав на загрузку' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Файлы не загружены' });
    }

    const savedFiles = [];
    for (const file of req.files) {
      const fileType = getFileType(file.mimetype);
      const fileUrl = '/' + file.path.replace(/\\/g, '/'); // путь для URL

      const result = await pool.query(
        `INSERT INTO files (achievement_id, file_url, file_type, file_name, file_size, mime_type) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [achievement_id, fileUrl, fileType, file.originalname, file.size, file.mimetype]
      );
      savedFiles.push(result.rows[0]);
    }

    res.status(201).json({
      message: `Загружено файлов: ${savedFiles.length}`,
      files: savedFiles
    });
  } catch (error) {
    console.error('Ошибка загрузки:', error);
    res.status(500).json({ message: error.message || 'Ошибка сервера' });
  }
});

// DELETE /api/upload/file/:id
router.delete('/file/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT f.*, a.user_id 
      FROM files f
      JOIN achievements a ON f.achievement_id = a.id
      WHERE f.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Файл не найден' });
    }

    const file = result.rows[0];

    if (file.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Нет прав на удаление' });
    }

    const filePath = file.file_url.replace(/^\//, '');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await pool.query('DELETE FROM files WHERE id = $1', [id]);
    res.json({ message: 'Файл удалён' });
  } catch (error) {
    console.error('Ошибка удаления файла:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;