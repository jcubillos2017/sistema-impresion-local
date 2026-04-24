const { DataTypes } = require('sequelize');
const {sequelize} = require('../config/database');

const Resolution = sequelize.define('Resolution', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  serial: {
    type: DataTypes.STRING,
    allowNull: false, // El nombre/serie es obligatorio para identificar el PDF
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'resolutions',
  timestamps: true
});

module.exports = Resolution;