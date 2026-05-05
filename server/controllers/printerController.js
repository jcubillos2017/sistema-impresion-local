const Printer = require('../models/Printer');
const { Direccion, Departamento, Subdepartamento, Seccion } = require('../models/Organization');
const { sequelize } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 1. Obtener todas las impresoras
exports.getPrinters = async (req, res) => {
    try {
        const printers = await Printer.findAll({
            include: [{
                model: Seccion,
                required: false,
                include: [{
                    model: Subdepartamento,
                    required: false,
                    include: [{
                        model: Departamento,
                        required: false,
                        include: [{
                            model: Direccion,
                            required: false
                        }]
                    }]
                }]
            }]
        });
        res.json(printers);
    } catch (error) {
        console.error("Error obteniendo impresoras:", error);
        res.status(500).json({ message: 'Error obteniendo impresoras' });
    }
};

// 2. Crear (Manual)
exports.createPrinter = async (req, res) => {
    try {
        const { serial_number, brand, model, type, inventory_code, seccion_id, observacion, ip_hostname } = req.body;
        const exists = await Printer.findOne({ where: { serial_number } });
        if (exists) return res.status(400).json({ message: 'Serie ya existe' });

        const newPrinter = await Printer.create({
            serial_number, brand, model, type, inventory_code, seccion_id, status: 'active', observacion, ip_hostname
        });
        res.status(201).json(newPrinter);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al crear' });
    }
};

// 3. Actualizar
exports.updatePrinter = async (req, res) => {
    try {
        const { id } = req.params;
        const printer = await Printer.findByPk(id);
        if (!printer) return res.status(404).json({ message: 'Impresora no encontrada' });
        await printer.update(req.body);
        res.json(printer);
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando' });
    }
};

// 4. Eliminar
exports.deletePrinter = async (req, res) => {
    try {
        const { id } = req.params;
        await Printer.destroy({ where: { id } });
        res.json({ message: 'Eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando' });
    }
};

// 5. IMPORTACIÓN MASIVA (Depurada y Blindada)
exports.importPrinters = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const rawData = req.body; 
        let processed = 0;

        console.log(`📥 Iniciando carga de ${rawData.length} impresoras...`);

        for (const row of rawData) {
            const serial = row['Serie']?.trim();
            if (!serial) continue;

            // --- Lógica de Ubicación "Efecto Espejo" ---
            let seccionId = null;
            
            // 1. Obtenemos la Dirección
            const nombreDir = row['Direccion']?.trim();
            
            // Validamos si tenemos datos para armar la ruta
            if (nombreDir) {
                // LÓGICA DE CASCADA (Relleno de vacíos)
                // Si falta dato, toma el del nivel superior
                const nombreDep = (row['Departamento'] && row['Departamento'].trim() !== "") 
                                  ? row['Departamento'].trim() 
                                  : nombreDir;
                                  
                const nombreSub = (row['Subdepartamento'] && row['Subdepartamento'].trim() !== "") 
                                  ? row['Subdepartamento'].trim() 
                                  : nombreDep;
                                  
                const nombreSec = (row['Seccion'] && row['Seccion'].trim() !== "") 
                                  ? row['Seccion'].trim() 
                                  : nombreSub;

                // Debug en consola para ver qué está leyendo
                console.log(`🔍 Procesando ${serial}:`);
                console.log(`   Dir: ${nombreDir} | Dep: ${nombreDep} | Sub: ${nombreSub} | Sec: ${nombreSec}`);

                // A. Dirección
                const [dir] = await Direccion.findOrCreate({
                    where: { nombre: nombreDir },
                    defaults: { nombre: nombreDir },
                    transaction
                });

                // B. Departamento
                const [dep] = await Departamento.findOrCreate({
                    where: { nombre: nombreDep, direccion_id: dir.id },
                    defaults: { nombre: nombreDep, direccion_id: dir.id },
                    transaction
                });

                // C. Subdepartamento
                const [sub] = await Subdepartamento.findOrCreate({
                    where: { nombre: nombreSub, departamento_id: dep.id },
                    defaults: { nombre: nombreSub, departamento_id: dep.id },
                    transaction
                });

                // D. Sección (Aquí es donde se guarda el "Espejo" o la Sección real)
                const [sec] = await Seccion.findOrCreate({
                    where: { nombre: nombreSec, subdepartamento_id: sub.id },
                    defaults: { nombre: nombreSec, subdepartamento_id: sub.id },
                    transaction
                });

                seccionId = sec.id;
                console.log(`   ✅ Asignado a ID Sección: ${seccionId}`);
            } else {
                console.log(`   ⚠️ Sin Dirección, queda huerfana.`);
            }

            // --- Guardado de la Impresora ---
            await Printer.upsert({
                serial_number: serial,
                inventory_code: row['Inventario'] || null,
                brand: row['Marca'] || 'Generica',
                model: row['Modelo'] || 'Generico',
                type: row['Tipo'] || 'B/N', 
                status: 'active',
                seccion_id: seccionId 
            }, { transaction });

            processed++;
        }

        await transaction.commit();
        console.log("🚀 Importación finalizada con éxito.");
        res.json({ 
            message: `Proceso finalizado. ${processed} impresoras procesadas.` 
        });

    } catch (error) {
        await transaction.rollback();
        console.error("❌ Error CRÍTICO en importación:", error);
        res.status(500).json({ message: 'Error importando impresoras' });
    }
};

// ----------------------------------------------------------------------------CONFIGURACIÓN DE ALMACENAMIENTO
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Carpeta destino
    },
    filename: (req, file, cb) => {
        // Nombre único: serie-fecha.pdf
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF'));
        }
    }
}).single('file'); // 'file' es el nombre del campo en el formulario

// --- NUEVA FUNCIÓN: SUBIR RESOLUCIÓN ---
exports.uploadResolution = (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        
        try {
            const { id } = req.params;
            if (!req.file) return res.status(400).json({ message: 'No se subió ningún archivo' });

            const printer = await Printer.findByPk(id);
            if (!printer) return res.status(404).json({ message: 'Impresora no encontrada' });

            // Guardamos solo el nombre del archivo en la BD
            printer.resolution_file = req.file.filename;
            await printer.save();

            res.json({ message: 'Resolución subida correctamente', filename: req.file.filename });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error interno al subir archivo' });
        }
    });
};

// --- NUEVA FUNCIÓN: ELIMINAR RESOLUCIÓN ---
exports.deleteResolution = async (req, res) => {
    try {
        const { id } = req.params;
        const printer = await Printer.findByPk(id);

        if (!printer) {
            return res.status(404).json({ message: 'Impresora no encontrada' });
        }

        // 1. Borrar archivo del disco (si existe)
        if (printer.resolution_file) {
            const filePath = path.join(__dirname, '../uploads/', printer.resolution_file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); // Borrado físico
            }
        }

        // 2. Borrar referencia en la BD
        printer.resolution_file = null;
        await printer.save();

        res.json({ message: 'Resolución eliminada correctamente' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar el archivo' });
    }
};
