const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// 1. Modelo Dirección
const Direccion = sequelize.define('Direccion', {
    nombre: { type: DataTypes.STRING, allowNull: false, unique: true }
}, { tableName: 'direcciones', timestamps: false });

// 2. Modelo Departamento
const Departamento = sequelize.define('Departamento', {
    nombre: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'departamentos', timestamps: false });

// 3. Modelo Subdepartamento
const Subdepartamento = sequelize.define('Subdepartamento', {
    nombre: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'subdepartamentos', timestamps: false });

// 4. Modelo Sección
const Seccion = sequelize.define('Seccion', {
    nombre: { type: DataTypes.STRING, allowNull: false },
    ubicacion: { type: DataTypes.STRING, allowNull: true } // Nueva columna Ubicación
}, { tableName: 'secciones', timestamps: false });

// --- DEFINICIÓN DE RELACIONES (La parte más importante) ---

// Dirección tiene muchos Departamentos
Direccion.hasMany(Departamento, { foreignKey: 'direccion_id', onDelete: 'CASCADE' });
Departamento.belongsTo(Direccion, { foreignKey: 'direccion_id' });

// Departamento tiene muchos Subdepartamentos
Departamento.hasMany(Subdepartamento, { foreignKey: 'departamento_id', onDelete: 'CASCADE' });
Subdepartamento.belongsTo(Departamento, { foreignKey: 'departamento_id' });

// Subdepartamento tiene muchas Secciones
Subdepartamento.hasMany(Seccion, { foreignKey: 'subdepartamento_id', onDelete: 'CASCADE' });
Seccion.belongsTo(Subdepartamento, { foreignKey: 'subdepartamento_id' });

module.exports = { Direccion, Departamento, Subdepartamento, Seccion };