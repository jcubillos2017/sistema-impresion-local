const { sequelize } = require('./config/database'); // O const db = require('./config/database'); dependiendo de tu export
const User = require('./models/User');
const bcrypt = require('bcryptjs'); // <--- 1. IMPORTAMOS BCRYPT

const seedAdmin = async () => {
    try {
        console.log('🌱 Conectando a la Base de Datos...');
        // Si usas sequelize exportado como objeto, o directamente db. Ajusta si te da error aquí.
        await sequelize.authenticate();

        await User.destroy({ where: { username: 'jcubillos' } });
        console.log('🗑️ Usuario anterior eliminado (si existía).');

        // 2. ENCRIPTAMOS LA CONTRASEÑA MANUALMENTE AQUÍ
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        // 3. Creamos el usuario con la contraseña cifrada
        const adminUser = await User.create({
            username: 'jcubillos',
            password: hashedPassword, // <--- Guardamos el Hash, no el texto plano
            role: 'admin',
            full_name: 'Administrador Sistema',
            is_active: true
        });

        console.log('✅ Usuario Administrador creado con éxito.');
        console.log('👤 Usuario:', adminUser.username);
        console.log('🔑 Pass:', 'admin123');
        
        process.exit();
    } catch (error) {
        console.error('❌ Error en el seed:', error);
        process.exit(1);
    }
};

seedAdmin();