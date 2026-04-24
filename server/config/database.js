// server/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Creamos la instancia de conexión
const sequelize = new Sequelize(
    process.env.DB_NAME, // Nombre de la DB
    process.env.DB_USER, // Usuario
    process.env.DB_PASS, // Contraseña
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false, // Pon en true si quieres ver cada consulta SQL en la consola
        timezone: '-04:00', // Ajusta esto según tu zona horaria (ej. Chile)
    }
);

// Función para verificar conexión
const dbConnect = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a MySQL exitosa.');
    } catch (error) {
        console.error('❌ Error de conexión a MySQL:', error);
    }
};

module.exports = { sequelize, dbConnect };