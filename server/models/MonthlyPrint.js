const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Printer = require('./Printer');

const MonthlyPrint = sequelize.define('MonthlyPrint', {
    period_date:  { type: DataTypes.DATEONLY, allowNull: false }, // Primer día del mes (2025-01-01)
    total_pages:  { type: DataTypes.INTEGER, defaultValue: 0 },
    color_pages:  { type: DataTypes.INTEGER, defaultValue: 0 },
    bw_pages:     { type: DataTypes.INTEGER, defaultValue: 0 },
    duplex_pages: { type: DataTypes.INTEGER, defaultValue: 0 },
    simple_pages: { type: DataTypes.INTEGER, defaultValue: 0 },

    printer_id:   { type: DataTypes.INTEGER, references: { model: Printer, key: 'id' }}
}, { 
    tableName: 'monthly_prints', 
    timestamps: false,
    indexes: [{ unique: true, fields: ['printer_id', 'period_date'] }]
});

// Relación: Una lectura pertenece a una impresora
MonthlyPrint.belongsTo(Printer, { foreignKey: 'printer_id', onDelete: 'CASCADE' });
Printer.hasMany(MonthlyPrint, { foreignKey: 'printer_id' });

module.exports = MonthlyPrint;