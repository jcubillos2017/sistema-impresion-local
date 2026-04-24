const Printer = require('../models/Printer');
const MonthlyPrint = require('../models/MonthlyPrint');
const { sequelize } = require('../config/database');

exports.getStats = async (req, res) => {
    try {
        // 1. Contadores Básicos
        const totalPrinters = await Printer.count();
        const activePrinters = await Printer.count({ where: { status: 'active' } });
        
        // 2. Suma de impresiones (Total histórico importado)
        // Nota: En un sistema real, filtraríamos por el "Mes Actual". 
        // Aquí sumamos todo lo que haya en la tabla de importación.
        const printStats = await MonthlyPrint.findAll({
            attributes: [
                [sequelize.fn('SUM', sequelize.col('total_pages')), 'grandTotal'],
                [sequelize.fn('SUM', sequelize.col('color_pages')), 'colorTotal'],
                [sequelize.fn('SUM', sequelize.col('bw_pages')), 'bwTotal']
            ],
            raw: true
        });

        const stats = printStats[0] || {};

        // 3. Datos para Gráfico (Top 5 Impresoras más usadas)
        const topPrinters = await MonthlyPrint.findAll({
            attributes: [
                'printer_id',
                [sequelize.fn('SUM', sequelize.col('total_pages')), 'total']
            ],
            include: [{ model: Printer, attributes: ['serial_number', 'model'] }],
            group: ['printer_id'],
            order: [[sequelize.col('total'), 'DESC']],
            limit: 5
        });

        res.json({
            printers: { total: totalPrinters, active: activePrinters },
            prints: {
                total: parseInt(stats.grandTotal) || 0,
                color: parseInt(stats.colorTotal) || 0,
                bw: parseInt(stats.bwTotal) || 0
            },
            topPrinters: topPrinters.map(item => ({
                name: item.Printer ? item.Printer.model : 'Desconocida',
                serial: item.Printer ? item.Printer.serial_number : 'N/A',
                value: parseInt(item.dataValues.total)
            }))
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error obteniendo estadísticas' });
    }
};