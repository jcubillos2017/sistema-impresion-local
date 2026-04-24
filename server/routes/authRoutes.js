const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');

// Definimos la ruta POST /login
// (Express le sumará el prefijo /api/auth que pondremos en index.js)
// Ruta POST: http://localhost:3001/api/auth/login
router.post('/login', login);

module.exports = router;