const express = require('express');
const router = express.Router();

// AQUÍ ESTABA EL ERROR: Faltaba agregar 'importOrgHierarchy' dentro de las llaves
const { getFullHierarchy, createItem, deleteItem, importOrgHierarchy, updateItem } = require('../controllers/orgController');

const { protect, adminOnly } = require('../middleware/authMiddleware');

// Rutas
router.get('/tree', protect, getFullHierarchy);
router.post('/create', protect, adminOnly, createItem);
router.put('/:type/:id', protect, adminOnly, updateItem);
router.delete('/:type/:id', protect, adminOnly, deleteItem);
// Ruta de importación masiva
router.post('/import', protect, adminOnly, importOrgHierarchy);

module.exports = router;