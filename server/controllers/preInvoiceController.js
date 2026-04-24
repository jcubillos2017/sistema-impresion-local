const PreInvoice = require('../models/PreInvoice');
const MonthlyPrint = require('../models/MonthlyPrint');
const Printer = require('../models/Printer');
const { Op } = require('sequelize');
const path = require('path');
const multer = require('multer');
const { subMonths, parseISO, format } = require('date-fns');
const fs = require('fs');

// Configuración Multer para Firma
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'signature-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage }).single('signature');

// 1. OBTENER CONSUMO PARA PRE-FACTURA
exports.getMonthConsumption = async (req, res) => {
    try {
        const { date } = req.query; // YYYY-MM
        if (!date) return res.status(400).json({ message: 'Fecha requerida' });

        // Fechas - Cálculo seguro sin zona horaria
        const [yearStr, monthStr] = date.split('-');
        let year = parseInt(yearStr, 10);
        let month = parseInt(monthStr, 10);
        
        let prevMonth = month - 1;
        let prevYear = year;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear -= 1;
        }

        const currentStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const prevStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;

        // Buscar datos
        const currentPrints = await MonthlyPrint.findAll({
            where: { period_date: currentStr },
            include: [{ model: Printer }]
        });

        const previousPrints = await MonthlyPrint.findAll({
            where: { period_date: prevStr }
        });

        const prevMap = {};
        previousPrints.forEach(p => { prevMap[p.printer_id] = p; });

        let bw_e42540 = 0;
        let total_x57945 = 0; // Cambiamos nombre variable para reflejar que es TOTAL

        currentPrints.forEach(curr => {
            const model = (curr.Printer.model || '').toLowerCase();
            const prev = prevMap[curr.printer_id];

            // 1. Calcular Diferencias (Consumo del mes)
            let consumptionBW = 0;
            let consumptionColor = 0;

            if (prev) {
                consumptionBW = (curr.bw_pages || 0) - (prev.bw_pages || 0);
                consumptionColor = (curr.color_pages || 0) - (prev.color_pages || 0);
                
                if (consumptionBW < 0) consumptionBW = 0;
                if (consumptionColor < 0) consumptionColor = 0;
            } else {
                consumptionBW = 0; 
                consumptionColor = 0;
            }

            // 2. Acumular según regla de negocio
            if (model.includes('e42540')) {
                // Para E42540 solo sumamos B/N
                bw_e42540 += consumptionBW;
            } else if (model.includes('x57945')) {
                // CORRECCIÓN: Para X57945 sumamos (B/N + Color)
                // "el contador de la impresora a color es uno"
                total_x57945 += (consumptionBW + consumptionColor);
            }
        });

        res.json({
            bw_e42540,
            color_x57945: total_x57945 // Enviamos el total acumulado
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error obteniendo consumos' });
    }
};

// 2. GUARDAR PRE-FACTURA (Intacto)
exports.createPreInvoice = (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        try {
            const { 
                billing_date, contract_month, dollar_value, 
                total_net_peso, total_iva, total_final,
                approved_by_name, electronic_signature_data, details_snapshot
            } = req.body;

            const newInvoice = await PreInvoice.create({
                billing_date,
                contract_month,
                dollar_value,
                total_net_peso,
                total_iva,
                total_final,
                approved_by_name,
                approved_by_signature_path: req.file ? req.file.filename : null,
                electronic_signature_data,
                details_snapshot: JSON.parse(details_snapshot || '{}')
            });
            res.json({ message: 'PreFactura guardada correctamente', id: newInvoice.id });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al guardar pre-factura' });
        }
    });
};

// 3. LISTAR HISTORIAL
exports.getAllPreInvoices = async (req, res) => {
    try {
        const list = await PreInvoice.findAll({ order: [['billing_date', 'DESC']] });
        res.json(list);
    } catch (error) {
        res.status(500).json({ message: 'Error listando facturas' });
    }
};
// 4. ELIMINAR PREFACTURA
exports.deletePreInvoice = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Buscar la factura para obtener el nombre de la imagen
        const invoice = await PreInvoice.findByPk(id);
        
        if (!invoice) {
            return res.status(404).json({ message: 'PreFactura no encontrada' });
        }

        // 2. Eliminar el archivo de imagen de la firma (si existe)
        if (invoice.approved_by_signature_path) {
            const filePath = path.join(__dirname, '../uploads', invoice.approved_by_signature_path);
            
            // Verificamos si el archivo existe antes de intentar borrarlo
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); // Borrado físico del archivo
            }
        }

        // 3. Eliminar registro de la BD
        await invoice.destroy();

        res.json({ message: 'PreFactura eliminada correctamente' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar la prefactura' });
    }
};