const Resolution = require('../models/Resolution');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'indep-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Solo PDF'));
    }
}).single('file');

// 1. OBTENER TODAS
exports.getAllResolutions = async (req, res) => {
    try {
        const list = await Resolution.findAll({ order: [['createdAt', 'DESC']] });
        res.json(list);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener lista' });
    }
};

// 2. SUBIR RESOLUCIÓN (INDEPENDIENTE)
exports.createResolution = (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        if (!req.file) return res.status(400).json({ message: 'Falta archivo PDF' });
        
        try {
            const { serial } = req.body;
            if (!serial) return res.status(400).json({ message: 'Falta el número de serie' });

            const newRes = await Resolution.create({
                serial: serial.toUpperCase(),
                filename: req.file.filename
            });

            res.json({ message: 'Archivo guardado', data: newRes });
        } catch (error) {
            res.status(500).json({ message: 'Error guardando en BD' });
        }
    });
};

// 3. EDITAR SERIE
exports.updateResolutionSerial = async (req, res) => {
    try {
        const { id } = req.params;
        const { serial } = req.body;
        await Resolution.update({ serial }, { where: { id } });
        res.json({ message: 'Serie actualizada' });
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando' });
    }
};

// 4. ELIMINAR RESOLUCIÓN
exports.deleteResolution = async (req, res) => {
    try {
        const item = await Resolution.findByPk(req.params.id);
        if (!item) return res.status(404).json({ message: 'No encontrado' });

        // Borrar archivo físico
        const filePath = path.join(__dirname, '../uploads/', item.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        // Borrar de BD
        await item.destroy();
        res.json({ message: 'Eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando' });
    }
};