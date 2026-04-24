const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getMonthConsumption, createPreInvoice, getAllPreInvoices, deletePreInvoice } = require('../controllers/preInvoiceController');

router.get('/consumption', protect, getMonthConsumption);
router.get('/', protect, getAllPreInvoices);
router.post('/', protect, createPreInvoice);
router.delete('/:id', protect, deletePreInvoice);

module.exports = router;