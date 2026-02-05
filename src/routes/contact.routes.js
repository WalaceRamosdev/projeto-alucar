const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const authMiddleware = require('../middleware/auth');

router.post('/', contactController.createContact);
router.get('/me', authMiddleware, contactController.getMyMessages);

module.exports = router;
