const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    registerUser, 
    loginUser, 
    getMe,
    getAllUsers,
    updateUser,
    deleteUser 
} = require('../controllers/userController');

router.post('/', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

// Rutas de Gestión
router.get('/', protect, getAllUsers);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, deleteUser);

module.exports = router;