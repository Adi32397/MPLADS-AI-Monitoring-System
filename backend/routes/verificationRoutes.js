const express = require('express');
const router = express.Router();
const verificationService = require('../services/verificationService');
const { generateSanctionOrderPDF } = require('../services/pdfService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { pool } = require('../config/db');

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, '../uploads/site_inspections');
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.params.projectId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and WEBP are allowed.'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB per file
});

router.get('/', async (req, res) => {
  try {
    const { state, district } = req.query;
    const queue = await verificationService.getQueue(state, district);
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:projectId', async (req, res) => {
  try {
    const details = await verificationService.getProjectDetails(req.params.projectId);
    if (!details) return res.status(404).json({ error: 'Project not found' });
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:projectId/evidence', async (req, res) => {
  try {
    const details = await verificationService.getProjectDetails(req.params.projectId);
    if (!details) return res.status(404).json({ error: 'Project not found' });
    
    // Generate and stream PDF
    generateSanctionOrderPDF(details, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all site inspection photos for a project
router.get('/:projectId/site-inspection-photos', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, project_id, file_name, file_path, file_size, uploaded_at FROM project_evidence WHERE project_id = ? AND evidence_type = "SITE_INSPECTION_PHOTO" ORDER BY uploaded_at ASC',
      [req.params.projectId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST upload one or more site inspection photos
router.post('/:projectId/site-inspection-photos', upload.array('photos', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const projectId = req.params.projectId;
    const values = req.files.map(file => [
      projectId,
      'SITE_INSPECTION_PHOTO',
      file.originalname,
      `/uploads/site_inspections/${file.filename}`,
      file.size
    ]);

    const [result] = await pool.query(
      'INSERT INTO project_evidence (project_id, evidence_type, file_name, file_path, file_size) VALUES ?',
      [values]
    );

    res.json({ success: true, message: 'Photos uploaded successfully', insertedCount: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a specific site inspection photo
router.delete('/:projectId/site-inspection-photos/:photoId', async (req, res) => {
  try {
    // 1. Fetch photo to get file path
    const [rows] = await pool.query('SELECT file_path FROM project_evidence WHERE id = ? AND project_id = ?', [req.params.photoId, req.params.projectId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // 2. Delete from disk
    const filePath = path.join(__dirname, '..', rows[0].file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 3. Delete from DB
    await pool.query('DELETE FROM project_evidence WHERE id = ? AND project_id = ?', [req.params.photoId, req.params.projectId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET download all site inspection photos as ZIP
router.get('/:projectId/site-inspection-photos/download-all', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT file_path, file_name FROM project_evidence WHERE project_id = ? AND evidence_type = "SITE_INSPECTION_PHOTO"',
      [req.params.projectId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No photos found for this project' });
    }

    const zip = new AdmZip();
    rows.forEach((row, index) => {
      const filePath = path.join(__dirname, '..', row.file_path);
      if (fs.existsSync(filePath)) {
        // Prepend index to avoid duplicate file names in zip if users uploaded same name
        const uniqueName = `${String(index + 1).padStart(2, '0')}_${row.file_name}`;
        zip.addLocalFile(filePath, '', uniqueName);
      }
    });

    const zipBuffer = zip.toBuffer();
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename=Site_Inspection_Photos_${req.params.projectId}.zip`);
    res.set('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:projectId/status', async (req, res) => {
  try {
    const { status } = req.body;
    await verificationService.updateStatus(req.params.projectId, status);
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:projectId/assign', async (req, res) => {
  try {
    await verificationService.assignOfficer(req.params.projectId, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:projectId/findings', async (req, res) => {
  try {
    const result = await verificationService.submitFindings(req.params.projectId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
