const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');

// 1. IMPORTAR EL CONTROLADOR (Asegúrate de que la ruta sea correcta)
const { importMonthlyPrints, deletePeriodData } = require('../controllers/importController');

// 2. CONFIGURAR MULTER (Para leer el archivo en memoria)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 3. DEFINIR LA RUTA
// El error ocurría aquí porque 'importMonthlyPrints' era undefined.
// Ahora que lo importamos bien, Express estará feliz.
router.post('/', protect, upload.single('file'), importMonthlyPrints);

router.delete('/:date', protect, deletePeriodData);

module.exports = router;