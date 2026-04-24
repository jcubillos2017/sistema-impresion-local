const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
    let token;

    // Verificar si existe el header "Authorization" y empieza con "Bearer"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extraer el token (quitamos la palabra "Bearer ")
            token = req.headers.authorization.split(' ')[1];

            // Verificar la firma del token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Agregar los datos del usuario a la petición (req.user)
            req.user = decoded;

            next(); // Dejar pasar al siguiente paso
        } catch (error) {
            return res.status(401).json({ message: 'Token no válido o expirado' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'No autorizado, falta token' });
    }
};

// Middleware extra para verificar rol de Admin
exports.adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de Administrador.' });
    }
};