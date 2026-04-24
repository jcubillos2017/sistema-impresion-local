const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { Seccion, Subdepartamento, Departamento, Direccion } = require('./Organization');

const Printer = sequelize.define('Printer', {
    serial_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    inventory_code: { type: DataTypes.STRING },
    brand: { type: DataTypes.STRING, defaultValue: 'HP' }, // Marca por defecto
    model: { type: DataTypes.STRING },
    type: { type: DataTypes.ENUM('B/N', 'Color'), allowNull: false },
    location: { type: DataTypes.STRING }, // Ubicación específica (ej: "Oficina 304")
    observacion: { type: DataTypes.STRING(100), allowNull: true },
    // Contadores iniciales o actuales
    status: { type: DataTypes.ENUM('active', 'blocked', 'maintenance'), defaultValue: 'active' },
    resolution_file: {type: DataTypes.STRING, allowNull: true},
}, { tableName: 'printers', timestamps: false });

// --- Relaciones ---
// Relacionamos la impresora con la jerarquía.
// Para simplificar, la asignamos a una SECCIÓN (el nivel más bajo), 
// y a través de ella sabremos su Depto y Dirección.
Printer.belongsTo(Seccion, { foreignKey: 'seccion_id' });

module.exports = Printer;