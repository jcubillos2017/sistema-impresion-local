require('dotenv').config();
const { sequelize } = require('./config/database');

async function fixDatabase() {
    try {
        console.log("🔧 Conectando a la base de datos...");
        
        // Ejecutamos el comando SQL directo para agregar la columna
        try {
            await sequelize.query("ALTER TABLE printers ADD COLUMN resolution_file VARCHAR(255) NULL DEFAULT NULL;");
            console.log("✅ ÉXITO: Columna 'resolution_file' agregada a la tabla 'printers'.");
        } catch (error) {
            if (error.parent && error.parent.errno === 1060) {
                console.log("⚠️ AVISO: La columna 'resolution_file' ya existía. No se hicieron cambios.");
            } else throw error;
        }
        
        try {
            await sequelize.query("ALTER TABLE printers ADD COLUMN ip_hostname VARCHAR(255) NULL DEFAULT NULL;");
            console.log("✅ ÉXITO: Columna 'ip_hostname' agregada a la tabla 'printers'.");
        } catch (error) {
            if (error.parent && error.parent.errno === 1060) {
                console.log("⚠️ AVISO: La columna 'ip_hostname' ya existía. No se hicieron cambios.");
            } else throw error;
        }
        
    } catch (error) {
        console.error("❌ ERROR:", error.original ? error.original.sqlMessage : error.message);
    } finally {
        await sequelize.close();
        process.exit();
    }
}

fixDatabase();