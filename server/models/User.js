const { DataTypes } = require('sequelize');
const db = require('../config/database').sequelize;

const User = db.define('User', {
    full_name: {
       type: DataTypes.STRING,
        allowNull: false
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: 'user'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    timestamps: false // <--- AGREGA ESTO: Evita que busque createdAt/updatedAt
});

module.exports = User;