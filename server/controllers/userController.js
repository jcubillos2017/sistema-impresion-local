const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// --- AUXILIAR: GENERAR TOKEN ---
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// --- 1. REGISTRO ---
const registerUser = async (req, res) => {
    try {
        const { full_name, username, password, role, is_active } = req.body;

        if (!full_name || !username || !password) {
            return res.status(400).json({ message: 'Rellena todos los campos' });
        }

        const userExists = await User.findOne({ where: { username } });
        if (userExists) return res.status(400).json({ message: 'El usuario ya existe' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            full_name,
            username,
            password: hashedPassword,
            role: role || 'user',
            is_active: is_active !== undefined ? is_active : true // Por defecto activo
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                full_name: user.full_name,
                username: user.username,
                role: user.role,
                is_active: user.is_active,
                token: generateToken(user.id),
            });
        } else {
            res.status(400).json({ message: 'Datos inválidos' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// --- 2. LOGIN (CON BLOQUEO DE SEGURIDAD) ---
const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ where: { username } });

        // Verificar usuario y contraseña
        if (user && (await bcrypt.compare(password, user.password))) {
            
            // 🔒 REGLA DE SEGURIDAD: SI ESTÁ BLOQUEADO, NO ENTRA
            if (user.is_active === false) {
                return res.status(403).json({ 
                    message: '⛔ Tu cuenta ha sido bloqueada. Contacta al administrador.' 
                });
            }

            res.json({
                _id: user.id,
                full_name: user.full_name,
                username: user.username,
                role: user.role,
                is_active: user.is_active,
                token: generateToken(user.id),
            });
        } else {
            res.status(401).json({ message: 'Credenciales inválidas' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// --- 3. PERFIL (GET ME) ---
const getMe = async (req, res) => {
    try {
        res.status(200).json(req.user);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener perfil' });
    }
};

// --- 4. OBTENER TODOS (ADMIN) ---
const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({ attributes: { exclude: ['password'] } });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
};

// --- 5. ACTUALIZAR USUARIO (ADMIN) ---
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Recibimos is_active también
        const { full_name, username, role, password, is_active } = req.body;

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        // Actualizar campos
        user.full_name = full_name || user.full_name;
        user.username = username || user.username;
        user.role = role || user.role;
        
        // Actualizar estado (si viene en el body)
        if (is_active !== undefined) {
            user.is_active = is_active;
        }

        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();
        res.json({ message: 'Usuario actualizado correctamente', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar usuario' });
    }
};

// --- 6. ELIMINAR USUARIO (ADMIN) ---
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user && req.user.id == id) {
            return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
        }
        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        await user.destroy();
        res.json({ message: 'Usuario eliminado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar usuario' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    getAllUsers,
    updateUser,
    deleteUser
};