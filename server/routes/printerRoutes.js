const express = require('express');
const router = express.Router();


const { 
    getPrinters, 
    createPrinter, 
    updatePrinter, 
    deletePrinter, 
    importPrinters, 
    uploadResolution,
    deleteResolution
} = require('../controllers/printerController');

const { protect, adminOnly } = require('../middleware/authMiddleware');

// Rutas existentes
router.get('/', protect, getPrinters);
router.post('/', protect, adminOnly, createPrinter);
router.put('/:id', protect, adminOnly, updatePrinter);
router.delete('/:id', protect, adminOnly, deletePrinter);

// Ruta de Importación Masiva
router.post('/import', protect, adminOnly, importPrinters);
router.post('/:id/resolution', protect, uploadResolution);
router.delete('/:id/resolution', protect, deleteResolution);
module.exports = router;