require('dotenv').config();
const { sequelize } = require('./config/database');

async function fixDatabase() {
    try {
        console.log("🔧 Conectando a la base de datos...");
        
        // Ejecutamos el comando SQL directo para agregar la columna
        await sequelize.query("ALTER TABLE printers ADD COLUMN resolution_file VARCHAR(255) NULL DEFAULT NULL;");
        
        console.log("✅ ÉXITO: Columna 'resolution_file' agregada a la tabla 'printers'.");
    } catch (error) {
        // El error 1060 significa que la columna ya existe
        if (error.parent && error.parent.errno === 1060) {
            console.log("⚠️ AVISO: La columna 'resolution_file' ya existía. No se hicieron cambios.");
        } else {
            console.error("❌ ERROR:", error.original ? error.original.sqlMessage : error.message);
        }
    } finally {
        await sequelize.close();
        process.exit();
    }
}

fixDatabase();