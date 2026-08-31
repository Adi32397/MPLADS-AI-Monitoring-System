const express = require('express');
const router = express.Router();
const stateService = require('../services/stateService');

// Bulk Import CSV
router.post('/csv', async (req, res) => {
  try {
    const data = req.body.data;
    const authorizedState = req.body.state; // Passed by the frontend based on the logged-in user

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data format. Expected an array of rows.' });
    }

    if (!authorizedState) {
      return res.status(400).json({ error: 'Authorized state parameter is required for bulk import.' });
    }

    const result = await stateService.processBulkImport(data, authorizedState);
    res.json(result);
  } catch (error) {
    console.error("Bulk Import Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
