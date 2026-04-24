const express = require('express');
const router = express.Router();
const { getDashboardData, importMonthlyPrints, getConsumption, getMonthlyTotals, getDepartmentReport, getGreenReport } = require('../controllers/monthlyPrintController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', protect, getDashboardData);
router.post('/import', protect, adminOnly, importMonthlyPrints);

// --- RUTA MODULO 5 
router.get('/consumption', protect, getConsumption);
// --- RUTA MODULO 6
router.get('/totals', protect, getMonthlyTotals);
// --- RUTA MÓDULO 7 ---
router.get('/departments', protect, getDepartmentReport);
// --- RUTA MODULO 8
router.get('/green', protect, getGreenReport);


module.exports = router;