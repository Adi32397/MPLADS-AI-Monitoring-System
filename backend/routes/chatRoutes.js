const express = require('express');
const router = express.Router();
const { generateChatResponse } = require('../services/chatService');

router.post('/', async (req, res) => {
  try {
    const { message, role, state } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userContext = {
      role: role || 'public',
      state: state || ''
    };

    const reply = await generateChatResponse(message, userContext);
    
    res.json({ reply });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

module.exports = router;
