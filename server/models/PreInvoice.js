const { DataTypes } = require('sequelize');
const {sequelize} = require('../config/database');

const PreInvoice = sequelize.define('PreInvoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  billing_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  contract_month: { // N° Cuota (ej: 22)
    type: DataTypes.INTEGER,
    allowNull: false
  },
  dollar_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  // Totales
  total_net_peso: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  total_iva: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  total_final: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // Firma
  approved_by_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  approved_by_signature_path: { // Ruta imagen JPG
    type: DataTypes.STRING,
    allowNull: true
  },
  electronic_signature_data: { // Texto de la firma digital
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Snapshot de datos (Guardamos el JSON con el detalle por si cambian precios a futuro)
  details_snapshot: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'pre_invoices',
  timestamps: true
});

module.exports = PreInvoice;