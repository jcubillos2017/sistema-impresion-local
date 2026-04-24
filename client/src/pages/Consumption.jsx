import { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Calendar,
  TrendingUp,
  Search,
  ArrowUpDown,
  Filter,
  Download,
  Droplet,
} from "lucide-react"; // Agregué Droplet para icono visual
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const Consumption = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [periods, setPeriods] = useState([]);

  const [startPeriod, setStartPeriod] = useState("");
  const [endPeriod, setEndPeriod] = useState("");

  const [filterText, setFilterText] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [sortConfig, setSortConfig] = useState({
    key: "consumption",
    direction: "desc",
  });

  const API_URL = "http://localhost:3001/api/prints/consumption";
  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  // --- CARGA DE DATOS ---
  const fetchConsumption = async (start = "", end = "") => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}?startPeriod=${start}&endPeriod=${end}`,
        getAuthHeaders(),
      );
      setReportData(res.data.data || []);
      setPeriods(res.data.periods || []);

      if (!startPeriod && res.data.startPeriod) {
        setStartPeriod(res.data.startPeriod);
        setEndPeriod(res.data.endPeriod);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsumption();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRangeChange = (type, value) => {
    if (type === "start") {
      setStartPeriod(value);
      if (value > endPeriod) setEndPeriod(value);
      fetchConsumption(value, value > endPeriod ? value : endPeriod);
    } else {
      setEndPeriod(value);
      if (value < startPeriod) setStartPeriod(value);
      fetchConsumption(value < startPeriod ? value : startPeriod, value);
    }
  };

  // --- LÓGICA DE PROCESAMIENTO ---
  const getProcessedData = () => {
    let processed = [...reportData];

    // Filtro Texto
    if (filterText) {
      const lower = filterText.toLowerCase();
      processed = processed.filter(
        (item) =>
          item.model.toLowerCase().includes(lower) ||
          item.serial.toLowerCase().includes(lower) ||
          (item.organization &&
            item.organization.toLowerCase().includes(lower)),
      );
    }

    // Filtro Tipo
    if (filterType !== "ALL") {
      processed = processed.filter((item) => {
        const isColor = item.consumption_color > 0 || item.type === "Color";
        return filterType === "Color" ? isColor : !isColor;
      });
    }

    // Ordenamiento
    processed.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      if (typeof valA === "string") {
        return sortConfig.direction === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortConfig.direction === "asc" ? valA - valB : valB - valA;
    });

    return processed;
  };

  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  };

  const handleExport = () => {
    const dataToExport = getProcessedData();
    const excelRows = dataToExport.map((item) => ({
      MODELO: item.model,
      "N SERIE": item.serial,
      ORGANIZACION: item.organization || "No Asignada",
      "B/N": item.consumption_bn,
      COLOR: item.consumption_color,
      TOTAL: item.consumption,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Consumo");
    XLSX.writeFile(
      workbook,
      `Reporte_Consumo_${startPeriod}_${endPeriod}.xlsx`,
    );
  };

  const tableData = getProcessedData();
  const top10 = [...reportData]
    .sort((a, b) => b.consumption - a.consumption)
    .slice(0, 10);

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return "";
    try {
      const date = parseISO(dateStr + "-01");
      return format(date, "MMM yy", { locale: es }).toUpperCase();
    } catch {
      return dateStr;
    }
  };

  // --- CÁLCULO DE TOTALES (NUEVO) ---
  // Se calcula sobre 'tableData' para que respete los filtros (si buscas una serie, suma solo esa serie)
  const totals = tableData.reduce(
    (acc, curr) => ({
      total: acc.total + curr.consumption,
      color: acc.color + curr.consumption_color,
      bn: acc.bn + curr.consumption_bn,
    }),
    { total: 0, color: 0, bn: 0 },
  );

  return (
    <div className="space-y-6">
      {/* HEADER Y CONTROLES */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        {/* LADO IZQUIERDO: Título y Resumen de Totales */}
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-emerald-500" /> Reporte de Consumo
            </h2>
            <p className="text-slate-500 text-xs">
              Selecciona un rango de fechas para ver el acumulado.
            </p>
          </div>

          {/* --- AQUÍ ESTÁ LA INTEGRACIÓN DE TOTALES --- */}
          {!loading && (
            <div className="flex flex-wrap gap-2 animate-fade-in">
              {/* Total General */}
              <div className="bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-md flex items-center gap-2 shadow-sm">
                <div className="p-1 bg-emerald-200 rounded-full">
                  <TrendingUp size={10} className="text-emerald-700" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                    Total
                  </span>
                  <span className="text-sm font-bold text-emerald-800">
                    {totals.total.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Total Color */}
              <div className="bg-purple-50 border border-purple-100 px-3 py-1 rounded-md flex items-center gap-2 shadow-sm">
                <div className="p-1 bg-purple-200 rounded-full">
                  <Droplet size={10} className="text-purple-700" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">
                    Color
                  </span>
                  <span className="text-sm font-bold text-purple-800">
                    {totals.color.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Total B/N */}
              <div className="bg-slate-100 border border-slate-200 px-3 py-1 rounded-md flex items-center gap-2 shadow-sm">
                <div className="p-1 bg-slate-300 rounded-full">
                  <Droplet size={10} className="text-slate-600" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    B/N
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    {totals.bn.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* LADO DERECHO: Filtros */}
        <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center mt-2 xl:mt-0">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 grow">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="bg-transparent outline-none text-sm w-full min-w-[100px]"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <Filter size={18} className="text-slate-500" />
            <select
              className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">Todos</option>
              <option value="Color">Color</option>
              <option value="BW">B/N</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
            <Calendar size={18} className="text-emerald-600" />
            <div className="flex items-center gap-2 text-sm">
              <select
                className="bg-transparent font-bold text-emerald-700 outline-none cursor-pointer"
                value={startPeriod}
                onChange={(e) => handleRangeChange("start", e.target.value)}
              >
                {periods.map((p) => (
                  <option key={p} value={p}>
                    {formatDateLabel(p)}
                  </option>
                ))}
              </select>
              <span className="text-emerald-400">➜</span>
              <select
                className="bg-transparent font-bold text-emerald-700 outline-none cursor-pointer"
                value={endPeriod}
                onChange={(e) => handleRangeChange("end", e.target.value)}
              >
                {periods.map((p) => (
                  <option key={p} value={p}>
                    {formatDateLabel(p)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 font-bold text-sm"
            title="Descargar Reporte en Excel"
          >
            <Download size={18} />
            <span className="hidden md:inline">Excel</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 animate-pulse">
          Procesando datos...
        </div>
      ) : (
        <>
          {/* TOP 10 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {top10.map((printer, idx) => (
              <div
                key={printer.printer_id}
                className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-bl">
                  #{idx + 1}
                </div>
                <p className="text-[10px] text-slate-400 font-mono truncate">
                  {printer.serial}
                </p>
                <p className="font-bold text-slate-700 text-xs truncate mb-1">
                  {printer.model}
                </p>
                <p className="text-lg font-bold text-emerald-600">
                  {printer.consumption.toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {/* TABLA PRINCIPAL */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th
                      className="p-4 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort("model")}
                    >
                      <div className="flex items-center gap-1">
                        Modelo / Serie <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th
                      className="p-4 text-center cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("consumption_color")}
                    >
                      Tipo
                    </th>
                    <th className="p-4 text-right">Inicio</th>
                    <th className="p-4 text-right">Fin</th>
                    <th
                      className="p-4 text-right font-bold text-emerald-600 bg-emerald-50/30 cursor-pointer hover:bg-emerald-100"
                      onClick={() => handleSort("consumption")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Consumo <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="p-4 text-right text-purple-600">Color</th>
                    <th className="p-4 text-right text-blue-600">B/N</th>
                    <th className="p-4 text-right text-indigo-600">Duplex</th>
                    <th className="p-4 text-right text-indigo-600">Simple</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {tableData.map((item) => (
                    <tr
                      key={item.printer_id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-bold text-slate-700">
                          {item.model}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {item.serial}
                        </div>
                        <div className="text-[10px] text-slate-300 uppercase">
                          {item.organization}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold ${
                            item.consumption_color > 0 || item.type === "Color"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.consumption_color > 0 || item.type === "Color"
                            ? "COLOR"
                            : "B/N"}
                        </span>
                      </td>
                      <td className="p-4 text-right text-slate-400 font-mono text-xs">
                        {item.previous_reading.toLocaleString()}
                      </td>
                      <td className="p-4 text-right text-slate-600 font-mono text-xs font-bold">
                        {item.current_reading.toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-bold text-emerald-600 bg-emerald-50/30 text-base">
                        {item.consumption.toLocaleString()}
                      </td>
                      <td className="p-4 text-right text-purple-600 font-medium">
                        {item.consumption_color.toLocaleString()}
                      </td>
                      <td className="p-4 text-right text-blue-600 font-medium">
                        {item.consumption_bn.toLocaleString()}
                      </td>
                      <td className="p-4 text-right text-indigo-600 font-medium">
                        {item.consumption_duplex.toLocaleString()}
                      </td>
                      <td className="p-4 text-right text-indigo-600 font-medium">
                        {item.consumption_simple.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {tableData.length === 0 && (
                    <tr>
                      <td
                        colSpan="8"
                        className="p-10 text-center text-slate-400"
                      >
                        No hay datos que coincidan con los filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Consumption;
