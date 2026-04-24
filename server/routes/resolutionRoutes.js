const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getAllResolutions, createResolution, updateResolutionSerial, deleteResolution } = require('../controllers/resolutionController');

router.get('/', protect, getAllResolutions);
router.post('/', protect, createResolution);
router.put('/:id', protect, updateResolutionSerial);
router.delete('/:id', protect, deleteResolution);

module.exports = router;