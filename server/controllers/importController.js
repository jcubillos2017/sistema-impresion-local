const MonthlyPrint = require('../models/MonthlyPrint');
const Printer = require('../models/Printer');
const xlsx = require('xlsx');
const { format, addHours } = require('date-fns'); // <--- IMPORTANTE: addHours

// HELPER: Convertir fecha Excel y CORREGIR ZONA HORARIA
const getJsDateFromExcel = (excelDate) => {
    if (!excelDate) return new Date(); // Si no hay fecha, devuelve hoy (ojo con esto)
    
    let date;
    // Si viene como string o fecha JS
    if (typeof excelDate === 'string' || excelDate instanceof Date) {
        date = new Date(excelDate);
    } else {
        // Si viene como número de serie Excel
        // Excel cuenta días desde 1899-12-30
        date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    }

    // CORRECCIÓN CRÍTICA:
    // Las fechas suelen quedar a las 00:00:00. 
    // Al guardarse en BD o procesarse con zona horaria local (UTC-3/4), 
    // pueden retroceder al día anterior (ej: 30 Nov 21:00).
    // Sumamos 12 horas para asegurar que caiga al mediodía del día correcto.
    return addHours(date, 12);
};

// 1. IMPORTAR EXCEL
exports.importMonthlyPrints = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Falta el archivo Excel' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        let processedCount = 0;
        let errors = [];

        for (const row of data) {
            // Detección flexible de SERIE
            let rawSerial = row['Numero de Serie'] || row['Serial'] || row['Serie'] || row['Numero Serie'] || row['SERIAL'] || row['S/N'];
            
            if (!rawSerial) continue; // Si no hay serie, saltar

            const serial = rawSerial.toString().trim();

            // Detección flexible de FECHA
            let rawDate = row['Fecha'] || row['Periodo'] || row['Mes'];
            
            // Procesamos la fecha con la corrección de horas
            let periodDate = getJsDateFromExcel(rawDate);
            
            // Validación extra: Si la fecha es inválida, usamos la actual (con cuidado)
            if (isNaN(periodDate.getTime())) {
                periodDate = new Date();
                periodDate = addHours(periodDate, 12); // También corregimos la actual por si acaso
            }

            // Formateamos: Ahora al ser 12:00 PM, aunque reste 4 horas, seguirá siendo el mismo mes/día
            const formattedDate = format(periodDate, 'yyyy-MM-01');

            try {
                const printer = await Printer.findOne({ where: { serial_number: serial } });

                if (printer) {
                    await MonthlyPrint.upsert({
                        printer_id: printer.id,
                        period_date: formattedDate,
                        // Mapeo de contadores
                        total_pages: row['Contador Total'] || row['Total'] || row['TOTAL'] || 0,
                        bw_pages: row['B/N'] || row['BN'] || row['Negro'] || row['Mono'] || 0,
                        color_pages: row['Color'] || row['COLOR'] || 0,
                        simple_pages: row['Simples'] || 0,
                        duplex_pages: row['Duplex'] || 0
                    });
                    processedCount++;
                } else {
                    errors.push(`Serie desconocida: ${serial}`);
                }
            } catch (err) {
                console.error(`Error importando ${serial}:`, err.message);
            }
        }

        res.json({ message: `Importación completada: ${processedCount} registros procesados.`, details: errors });

    } catch (error) {
        console.error("Error crítico en importación:", error);
        res.status(500).json({ message: 'Error interno al procesar el Excel' });
    }
};

// 2. ELIMINAR PERIODO (Corrección de errores)
exports.deletePeriodData = async (req, res) => {
    try {
        const { date } = req.params; // YYYY-MM
        if (!date) return res.status(400).json({ message: 'Fecha requerida' });

        const targetDate = date + '-01'; 

        const deleted = await MonthlyPrint.destroy({
            where: { period_date: targetDate }
        });

        res.json({ message: `Registros del periodo ${date} eliminados (${deleted} registros borrados).` });
    } catch (error) {
        console.error("Error borrando periodo:", error);
        res.status(500).json({ message: 'Error al eliminar los datos.' });
    }
};