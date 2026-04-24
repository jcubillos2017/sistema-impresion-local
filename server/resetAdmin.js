const { sequelize } = require('./config/database');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const resetAdmin = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a BD exitosa.');
        
        // Sincronizar modelos (asegura que la tabla exista)
        await sequelize.sync(); 

        // 1. Buscar si existe el usuario 'admin' y borrarlo para empezar de cero
        const existingAdmin = await User.findOne({ where: { username: 'admin' } });
        if (existingAdmin) {
            console.log('🗑️  Usuario admin antiguo encontrado. Eliminando...');
            await existingAdmin.destroy();
        }

        // 2. Crear el nuevo Admin
        // Encriptamos la contraseña 'admin'
        const hashedPassword = await bcrypt.hash('admin', 10);
        
        await User.create({
            username: 'admin',
            password: hashedPassword,
            full_name: 'Administrador Sistema',
            email: 'admin@sistema.com',
            role: 'admin'
        });

        console.log('-------------------------------------------');
        console.log('✅ USUARIO ADMIN CREADO EXITOSAMENTE');
        console.log('👤 Usuario: admin');
        console.log('🔑 Clave:   admin');
        console.log('-------------------------------------------');

    } catch (error) {
        console.error('❌ Error al resetear admin:', error);
    } finally {
        await sequelize.close();
    }
};

resetAdmin();