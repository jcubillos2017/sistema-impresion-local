const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // <--- IMPORTANTE: Necesitamos esto aquí

exports.login = async (req, res) => {
    try {
        // Recibimos username y password del frontend
        const { username, password } = req.body;

        // 1. Buscar al usuario por su username
        const user = await User.findOne({ where: { username } });

        // Si no existe el usuario
        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas (Usuario no encontrado)' });
        }

        // 2. COMPARAR CONTRASEÑA (Aquí estaba el error antes)
        // Usamos bcrypt.compare directamente en lugar de user.matchPassword
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas (Contraseña incorrecta)' });
        }

        // 3. VERIFICAR SI ESTÁ ACTIVO (Tu nueva seguridad)
        if (user.is_active === false) {
            return res.status(403).json({ message: '⛔ Tu cuenta ha sido bloqueada. Contacta al administrador.' });
        }

        // 4. Generar Token
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // 5. Responder al Frontend
        res.json({
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                username: user.username,
                role: user.role,
                is_active: user.is_active
            }
        });

    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ message: 'Error en el servidor al iniciar sesión' });
    }
};

// Si tienes una función de registro aquí también, puedes dejarla o usar la de userController
// Pero asegúrate de exportar 'login'