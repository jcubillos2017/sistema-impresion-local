const {
  Seccion,
  Subdepartamento,
  Departamento,
  Direccion,
} = require("../models/Organization");
const MonthlyPrint = require("../models/MonthlyPrint");
const Printer = require("../models/Printer");
const { sequelize } = require("../config/database");
const { Op } = require("sequelize");
const {
  startOfMonth,
  endOfMonth,
  subMonths,
  parseISO,
  format,
} = require("date-fns");

//const { default: Organization } = require("../../client/src/pages/Organization");

// --- Helper MAESTRO para Fechas ---
// Corrige el problema de que la fecha se atrase un día por la zona horaria
const parseExcelDate = (value) => {
  try {
    if (!value) return new Date();

    let date;

    // CASO 1: Número Serial de Excel (ej: 45321)
    if (typeof value === "number") {
      // Excel cuenta desde 1900, JS maneja milisegundos
      date = new Date(Math.round((value - 25569) * 86400 * 1000));
    }
    // CASO 2: Texto (ej: "2024-10-01")
    else {
      date = new Date(value);
    }

    // --- EL FIX: FORZAR MEDIODÍA (UTC 12:00) ---
    // Al ponerlo a las 12:00 UTC, si tu PC está en Chile (UTC-3/UTC-4),
    // bajará a las 08:00 AM o 09:00 AM, pero SEGUIRÁ SIENDO EL MISMO DÍA.
    // Si lo dejáramos en 00:00, bajaría al día anterior (20:00 PM).
    date.setUTCHours(12, 0, 0, 0);

    // Validación extra
    if (isNaN(date.getTime())) {
      console.warn(`⚠️ Fecha inválida: "${value}". Usando hoy.`);
      return new Date();
    }
    return date;
  } catch (e) {
    console.error("Error parseando fecha:", e);
    return new Date();
  }
};

// 1. Dashboard Data
exports.getDashboardData = async (req, res) => {
  try {
    const prints = await MonthlyPrint.findAll({
      include: [
        { model: Printer, attributes: ["serial_number", "model", "brand"] },
      ],
      order: [["period_date", "ASC"]],
    });
    res.json(prints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo datos" });
  }
};

// 2. IMPORTACIÓN MASIVA
exports.importMonthlyPrints = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const rawData = req.body;
    let processed = 0;
    let errors = 0;

    console.log(`📥 PROCESANDO CARGA DE LECTURAS: ${rawData.length} filas.`);

    for (const [index, row] of rawData.entries()) {
      const serial = row["Numero de Serie"]?.toString().trim();
      if (!serial) continue;

      const printer = await Printer.findOne({
        where: { serial_number: serial },
      });

      if (!printer) {
        console.log(
          `❌ Fila ${index + 1}: Serie "${serial}" NO encontrada. Ignorada.`,
        );
        errors++;
        continue;
      }

      // Aplicamos la corrección de fecha aquí
      const periodDate = parseExcelDate(row["Fecha"]);

      const safeNumber = (val) => {
        const num = Number(val);
        return isNaN(num) ? 0 : num;
      };

      await MonthlyPrint.upsert(
        {
          printer_id: printer.id,
          period_date: periodDate,
          total_pages: safeNumber(row["Contador Total"]),
          color_pages: safeNumber(row["Color"]),
          bw_pages: safeNumber(row["B/N"]),
          duplex_pages: safeNumber(row["Duplex"]),
          simple_pages: safeNumber(row["Simples"]),
        },
        {
          conflictFields: ["printer_id", "period_date"],
          transaction,
        },
      );

      processed++;
    }

    await transaction.commit();
    console.log("✅ Importación finalizada correctamente.");

    res.json({
      message: `Proceso finalizado. ${processed} lecturas guardadas. ${errors} series no encontradas.`,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ ERROR IMPORTACIÓN:", error);
    res.status(500).json({ message: "Error interno al procesar el archivo." });
  }
};

// ---------------------------------------------------------------------------------------FUNCION MODULO 5: CALCULO DE CONSUMO ------------------------------------------------

// ... existing imports ...

exports.getConsumption = async (req, res) => {
  try {
    // Recibimos inicio y fin del rango
    let { startPeriod, endPeriod, serial } = req.query;

    console.log(`📊 Calculando consumo rango: ${startPeriod} a ${endPeriod}`);

    // 1. Obtener lista de todos los periodos disponibles (para los selectores)
    const allPeriodsData = await MonthlyPrint.findAll({
      attributes: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("period_date"), "%Y-%m"),
          "month",
        ],
      ],
      group: [
        sequelize.fn("DATE_FORMAT", sequelize.col("period_date"), "%Y-%m"),
      ],
      order: [[sequelize.literal("month"), "DESC"]],
    });
    const periodList = allPeriodsData.map((p) => p.get("month"));

    // 2. Definir valores por defecto si no vienen en la URL
    // Por defecto: Fin = Último mes disponible, Inicio = Ese mismo mes
    if (!endPeriod && periodList.length > 0) endPeriod = periodList[0];
    if (!startPeriod) startPeriod = endPeriod;

    if (!endPeriod) return res.json({ data: [], periods: [] });

    // 3. Calcular fechas para la consulta SQL
    // Fecha Final (Lectura Actual)
    const dateEndObj = parseISO(endPeriod + "-01");

    // Fecha Inicial (Lectura Base) -> Restamos 1 mes al inicio seleccionado
    // Ejemplo: Si selecciono Enero a Marzo, necesito (Lectura Marzo) - (Lectura Diciembre)
    const dateStartObj = parseISO(startPeriod + "-01");
    const datePrevObj = subMonths(dateStartObj, 1);

    // 4. Filtro por serie (si existe)
    const printerFilter = {};
    if (serial) {
      printerFilter.serial_number = { [Op.like]: `%${serial}%` };
    }

    // 5. Buscar Lectura FINAL (Al cierre del rango)
    const endReadings = await MonthlyPrint.findAll({
      where: {
        period_date: {
          [Op.between]: [startOfMonth(dateEndObj), endOfMonth(dateEndObj)],
        },
      },
      include: [
        {
          model: Printer,
          where: printerFilter,
          attributes: ["id", "serial_number", "model", "brand", "location"],
          include: [{ model: Seccion, attributes: ["nombre"] }], //TRAEMOS EL NOMBRE DE LA SECCIÓN
        },
      ],
    });

    // 6. Buscar Lectura BASE (El mes anterior al inicio del rango)
    const startReadings = await MonthlyPrint.findAll({
      where: {
        period_date: {
          [Op.between]: [startOfMonth(datePrevObj), endOfMonth(datePrevObj)],
        },
      },
    });

    // Mapa para búsqueda rápida
    const startMap = {};
    startReadings.forEach((r) => (startMap[r.printer_id] = r));

    // 7. CÁLCULO DE DIFERENCIA (Consumo del Rango)
    const report = endReadings.map((curr) => {
      const prev = startMap[curr.printer_id];

      // Si no hay lectura previa (es una impresora nueva en este rango), asumimos 0
      const prevTotal = prev ? prev.total_pages : 0;

      return {
        printer_id: curr.Printer.id,
        serial: curr.Printer.serial_number,
        model: curr.Printer.model,
        brand: curr.Printer.brand,

        //Organization: curr.Printer.location || 'Sin Asignar',
        organization: curr.Printer.Seccion
          ? curr.Printer.Seccion.nombre
          : curr.Printer.location || "No Asignada",
        type: curr.color_pages > 0 ? "Color" : "B/N", // Detectar tipo

        // Lecturas
        current_reading: curr.total_pages,
        previous_reading: prevTotal,

        // Consumos (Restas)
        consumption: Math.max(0, curr.total_pages - prevTotal),
        consumption_color: Math.max(
          0,
          curr.color_pages - (prev ? prev.color_pages : 0),
        ),
        consumption_bn: Math.max(0, curr.bw_pages - (prev ? prev.bw_pages : 0)),
        consumption_duplex: Math.max(
          0,
          curr.duplex_pages - (prev ? prev.duplex_pages : 0),
        ),
        consumption_simple: Math.max(
          0,
          curr.simple_pages - (prev ? prev.simple_pages : 0),
        ),
      };
    });

    // 8. Ordenar por defecto (Mayor consumo)
    report.sort((a, b) => b.consumption - a.consumption);

    res.json({
      startPeriod, // Devolvemos lo que se usó
      endPeriod,
      periods: periodList,
      data: report,
    });
  } catch (error) {
    console.error("Error backend consumo:", error);
    res.status(500).json({ message: "Error interno" });
  }
};

// ---------------------------------------------------------------------------------------FUNCION MODULO 5: CALCULO DE CONSUMO ------------------------------------------------

// ... (imports existentes) ...

// --- NUEVA FUNCIÓN: MÓDULO 6 - TOTALES (LECTURAS) ---
exports.getMonthlyTotals = async (req, res) => {
  try {
    let { period, serial } = req.query;

    // 1. Obtener lista de periodos disponibles
    const allPeriodsData = await MonthlyPrint.findAll({
      attributes: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("period_date"), "%Y-%m"),
          "month",
        ],
      ],
      group: [
        sequelize.fn("DATE_FORMAT", sequelize.col("period_date"), "%Y-%m"),
      ],
      order: [[sequelize.literal("month"), "DESC"]],
    });
    const periodList = allPeriodsData.map((p) => p.get("month"));

    // 2. Si no envían periodo, usar el último disponible
    if (!period && periodList.length > 0) {
      period = periodList[0];
    }

    if (!period) return res.json({ period: "", periods: [], data: [] });

    // 3. Configurar Filtros
    const dateTarget = parseISO(period + "-01");

    const printerFilter = {};
    if (serial) {
      printerFilter.serial_number = { [Op.like]: `%${serial}%` };
    }

    // 4. Buscar Datos (Incluyendo Organización)
    const readings = await MonthlyPrint.findAll({
      where: {
        period_date: {
          [Op.between]: [startOfMonth(dateTarget), endOfMonth(dateTarget)],
        },
      },
      include: [
        {
          model: Printer,
          where: printerFilter,
          attributes: ["id", "serial_number", "model", "brand", "location"],
          include: [{ model: Seccion, attributes: ["nombre"] }], // Usamos 'nombre' como corregimos antes
        },
      ],
      order: [["total_pages", "DESC"]], // Ordenar por mayor contador total
    });

    // 5. Formatear respuesta
    const report = readings.map((row) => ({
      printer_id: row.Printer.id,
      serial: row.Printer.serial_number,
      model: row.Printer.model,
      brand: row.Printer.brand,
      organization: row.Printer.Seccion
        ? row.Printer.Seccion.nombre
        : row.Printer.location || "No Asignada",

      // Contadores Absolutos (Lecturas)
      total_counter: row.total_pages,
      color_counter: row.color_pages,
      bn_counter: row.bw_pages,
      duplex_counter: row.duplex_pages,
      simple_counter: row.simple_pages,

      // Detectar tipo
      type: row.color_pages > 0 ? "Color" : "B/N",
    }));

    res.json({
      period,
      periods: periodList,
      data: report,
    });
  } catch (error) {
    console.error("Error obteniendo totales:", error);
    res.status(500).json({ message: "Error interno al obtener totales" });
  }
};

// --- NUEVA FUNCIÓN: MÓDULO 7 - REPORTE POR DEPARTAMENTOS ---
exports.getDepartmentReport = async (req, res) => {
    try {
        console.log("🚀 EJECUTANDO REPORTE DEPARTAMENTOS (VÍA SQL PURO + CÁLCULO)");

        let { startPeriod, endPeriod } = req.query;

        // 1. Obtener lista de periodos
        const [periodos] = await sequelize.query(`
            SELECT DISTINCT DATE_FORMAT(period_date, '%Y-%m') as month 
            FROM monthly_prints 
            ORDER BY month DESC
        `);
        const periodList = periodos.map(p => p.month);

        // Validación de fechas
        if (!endPeriod && periodList.length > 0) endPeriod = periodList[0];
        if (!startPeriod) startPeriod = endPeriod;

        if (!endPeriod) return res.json({ periods: [], data: [] });

        // 2. Definir Fechas para el Cálculo
        // Fecha FINAL (El mes que seleccionaste como fin)
        const dateEndStr = endPeriod + '-01'; 
        
        // Fecha INICIAL (Un mes ANTES del inicio seleccionado para poder restar)
        // Si seleccionas "Marzo", necesitamos la lectura de "Febrero" para saber cuánto se imprimió.
        const dateStartObj = parseISO(startPeriod + '-01');
        const datePrevObj = subMonths(dateStartObj, 1); // Restamos 1 mes
        const datePrevStr = format(datePrevObj, 'yyyy-MM-dd');

        console.log(`📅 Calculando consumo entre: ${datePrevStr} (Base) y ${dateEndStr} (Final)`);

        // 3. CONSULTA SQL MAESTRA
        // Traemos AMBAS lecturas en una sola consulta usando CASE WHEN
        const query = `
            SELECT 
                p.id as printer_id,
                p.serial_number as serial,
                p.model,
                p.location,
                
                -- Jerarquía (COALESCE para evitar nulos)
                COALESCE(dir.nombre, 'Sin Asignar') as direccion,
                COALESCE(dep.nombre, 'Sin Asignar') as departamento,
                COALESCE(sub.nombre, 'Sin Asignar') as subdepartamento,
                COALESCE(sec.nombre, p.location, 'Sin Asignar') as seccion,

                -- Lecturas Específicas
                MAX(CASE WHEN mp.period_date = :endParam THEN mp.total_pages ELSE 0 END) as reading_end,
                MAX(CASE WHEN mp.period_date = :startParam THEN mp.total_pages ELSE 0 END) as reading_start

            FROM printers p
            -- Unimos con lecturas solo en las 2 fechas que nos interesan
            LEFT JOIN monthly_prints mp ON p.id = mp.printer_id 
                AND (mp.period_date = :endParam OR mp.period_date = :startParam)
            
            -- Uniones de Organización
            LEFT JOIN secciones sec ON p.seccion_id = sec.id
            LEFT JOIN subdepartamentos sub ON sec.subdepartamento_id = sub.id
            LEFT JOIN departamentos dep ON sub.departamento_id = dep.id
            LEFT JOIN direcciones dir ON dep.direccion_id = dir.id

            GROUP BY p.id
            HAVING reading_end > 0 -- Solo mostrar impresoras que tengan lectura final
            ORDER BY reading_end DESC
        `;

        const [results] = await sequelize.query(query, {
            replacements: { endParam: dateEndStr, startParam: datePrevStr }
        });

        console.log(`✅ Registros procesados: ${results.length}`);

        // 4. Mapeo y Resta en Javascript
        const report = results.map(row => {
            // Cálculo del consumo: Lectura Final - Lectura Inicial
            // Si la lectura inicial es 0 (printer nuevo), el consumo es todo el contador actual.
            let consumption = row.reading_end - row.reading_start;
            if (consumption < 0) consumption = 0; // Evitar negativos si hubo cambio de placa

            return {
                printer_id: row.printer_id,
                serial: row.serial,
                model: row.model,
                
                direccion: row.direccion,
                departamento: row.departamento,
                subdepartamento: row.subdepartamento,
                seccion: row.seccion,

                total_counter: row.reading_end, // El contador actual
                consumption: consumption        // El consumo calculado del periodo
            };
        });

        res.json({
            startPeriod,
            endPeriod,
            periods: periodList,
            data: report
        });

    } catch (error) {
        console.error("❌ ERROR EN SQL CONTROLLER:", error);
        res.status(500).json({ message: "Error interno en base de datos" });
    }
};
// --- NUEVA FUNCIÓN: MÓDULO 8 - ESTADO VERDE ---
exports.getGreenReport = async (req, res) => {
    try {
        console.log("🍃 EJECUTANDO REPORTE ESTADO VERDE");

        let { startPeriod, endPeriod } = req.query;

        // 1. Obtener lista de periodos
        const [periodos] = await sequelize.query(`
            SELECT DISTINCT DATE_FORMAT(period_date, '%Y-%m') as month 
            FROM monthly_prints 
            ORDER BY month DESC
        `);
        const periodList = periodos.map(p => p.month);

        if (!endPeriod && periodList.length > 0) endPeriod = periodList[0];
        if (!startPeriod) startPeriod = endPeriod;

        if (!endPeriod) return res.json({ periods: [], data: [] });

        // 2. Definir Fechas (Mes Actual vs Mes Anterior)
        const dateEndStr = endPeriod + '-01'; 
        const dateStartObj = parseISO(startPeriod + '-01');
        const datePrevObj = subMonths(dateStartObj, 1);
        const datePrevStr = format(datePrevObj, 'yyyy-MM-dd');

        // 3. CONSULTA SQL EXPANDIDA (Trae todos los contadores)
        const query = `
            SELECT 
                p.id as printer_id,
                p.serial_number as serial,
                p.resolution_file,
                p.model,
                p.brand,
                p.type,
                p.location,
                COALESCE(sec.nombre, 'Sin Asignar') as seccion,

                -- TOTALES
                MAX(CASE WHEN mp.period_date = :endParam THEN mp.total_pages ELSE 0 END) as total_end,
                MAX(CASE WHEN mp.period_date = :startParam THEN mp.total_pages ELSE 0 END) as total_start,

                -- B/N
                MAX(CASE WHEN mp.period_date = :endParam THEN mp.bw_pages ELSE 0 END) as bw_end,
                MAX(CASE WHEN mp.period_date = :startParam THEN mp.bw_pages ELSE 0 END) as bw_start,

                -- COLOR
                MAX(CASE WHEN mp.period_date = :endParam THEN mp.color_pages ELSE 0 END) as color_end,
                MAX(CASE WHEN mp.period_date = :startParam THEN mp.color_pages ELSE 0 END) as color_start,

                -- SIMPLE
                MAX(CASE WHEN mp.period_date = :endParam THEN mp.simple_pages ELSE 0 END) as simple_end,
                MAX(CASE WHEN mp.period_date = :startParam THEN mp.simple_pages ELSE 0 END) as simple_start,

                -- DUPLEX
                MAX(CASE WHEN mp.period_date = :endParam THEN mp.duplex_pages ELSE 0 END) as duplex_end,
                MAX(CASE WHEN mp.period_date = :startParam THEN mp.duplex_pages ELSE 0 END) as duplex_start

            FROM printers p
            LEFT JOIN monthly_prints mp ON p.id = mp.printer_id 
                AND (mp.period_date = :endParam OR mp.period_date = :startParam)
            LEFT JOIN secciones sec ON p.seccion_id = sec.id
            GROUP BY p.id
            HAVING total_end > 0
            ORDER BY total_end DESC
        `;

        const [results] = await sequelize.query(query, {
            replacements: { endParam: dateEndStr, startParam: datePrevStr }
        });

        // 4. Calcular Consumos (Deltas)
        const report = results.map(row => {
            // Función auxiliar para restar evitando negativos
            const calc = (end, start) => Math.max(0, end - start);

            return {
                printer_id: row.printer_id,
                serial: row.serial,
                model: row.model,
                brand: row.brand,
                type: row.type,
                resolution_file: row.resolution_file,
                location: row.location || row.seccion, // Usamos sección si no hay ubicación específica
                
                // Consumos Calculados
                consumption_total: calc(row.total_end, row.total_start),
                consumption_bw: calc(row.bw_end, row.bw_start),
                consumption_color: calc(row.color_end, row.color_start),
                consumption_simple: calc(row.simple_end, row.simple_start),
                consumption_duplex: calc(row.duplex_end, row.duplex_start)
            };
        });

        res.json({
            startPeriod,
            endPeriod,
            periods: periodList,
            data: report
        });

    } catch (error) {
        console.error("❌ ERROR EN GREEN REPORT:", error);
        res.status(500).json({ message: "Error interno" });
    }
};