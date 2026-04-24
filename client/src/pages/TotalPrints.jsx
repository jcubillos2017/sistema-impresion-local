import { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx'; 
import { Calendar, BarChart3, Search, ArrowUpDown, Filter, Download, Printer, Layers, Droplet } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const TotalPrints = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]); 
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [sortConfig, setSortConfig] = useState({ key: 'total_counter', direction: 'desc' });

  const API_URL = 'http://localhost:3001/api/prints/totals';
  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const fetchData = async (period = '') => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}?period=${period}`, getAuthHeaders());
      setData(res.data.data || []);
      setPeriods(res.data.periods || []);
      if (!selectedPeriod && res.data.period) setSelectedPeriod(res.data.period);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePeriodChange = (e) => {
    const val = e.target.value;
    setSelectedPeriod(val);
    fetchData(val);
  };

  const getProcessedData = () => {
    let processed = [...data];

    if (filterText) {
      const lower = filterText.toLowerCase();
      processed = processed.filter(item => 
        item.model.toLowerCase().includes(lower) ||
        item.serial.toLowerCase().includes(lower) ||
        (item.organization && item.organization.toLowerCase().includes(lower))
      );
    }

    if (filterType !== 'ALL') {
      processed = processed.filter(item => {
        const isColor = item.type === 'Color';
        return filterType === 'Color' ? isColor : !isColor;
      });
    }

    processed.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      if (typeof valA === 'string') {
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    });

    return processed;
  };

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleExport = () => {
    const dataToExport = getProcessedData();
    const excelRows = dataToExport.map(item => ({
      "MODELO": item.model,
      "N SERIE": item.serial,
      "ORGANIZACION": item.organization || "No Asignada",
      "LECTURA TOTAL": item.total_counter,
      "LECTURA COLOR": item.color_counter,
      "LECTURA B/N": item.bn_counter,
      "LECTURA DUPLEX": item.duplex_counter,
      "LECTURA SIMPLE": item.simple_counter
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lecturas Mensuales");
    XLSX.writeFile(workbook, `Lecturas_${selectedPeriod}.xlsx`);
  };

  const tableData = getProcessedData();
  
  // --- LÓGICA PARA LAS TARJETAS ---
  // 1. Total General
  const grandTotal = tableData.reduce((acc, curr) => acc + curr.total_counter, 0);
  
  // 2. Obtener Top 1 y Top 2 (Ya vienen ordenados o los ordenamos por seguridad)
  const sortedByVolume = [...tableData].sort((a,b) => b.total_counter - a.total_counter);
  const topPrinter1 = sortedByVolume[0];
  const topPrinter2 = sortedByVolume[1];

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    try {
        return format(parseISO(dateStr + '-01'), 'MMMM yyyy', { locale: es }).toUpperCase();
    } catch { return dateStr; }
  };

  return (
    <div className="space-y-8">
      
      {/* HEADER Y FILTROS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-blue-600" /> Lecturas Totales
          </h2>
          <p className="text-slate-500 text-sm">Visualización de contadores totales por periodo.</p>
        </div>

        <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center bg-white p-2 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 grow">
                <Search size={18} className="text-slate-400" />
                <input 
                    type="text" placeholder="Buscar..." 
                    className="bg-transparent outline-none text-sm w-full min-w-[100px]"
                    value={filterText} onChange={e => setFilterText(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                <Filter size={18} className="text-slate-500" />
                <select 
                    className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer"
                    value={filterType} onChange={e => setFilterType(e.target.value)}
                >
                    <option value="ALL">Todos</option>
                    <option value="Color">Color</option>
                    <option value="BW">B/N</option>
                </select>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                <Calendar size={18} className="text-blue-600" />
                <select 
                    className="bg-transparent font-bold text-blue-700 outline-none cursor-pointer text-sm"
                    value={selectedPeriod} onChange={handlePeriodChange}
                >
                    {periods.map(p => <option key={p} value={p}>{formatDateLabel(p)}</option>)}
                </select>
            </div>
            <button 
                onClick={handleExport}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 font-bold text-sm"
            >
                <Download size={18} /> <span className="hidden md:inline">Excel</span>
            </button>
        </div>
      </div>

      {/* --- TARJETAS PERSONALIZADAS --- */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* CARD 1: TOTAL PERIODO */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-start relative overflow-hidden">
                <div className="z-10 relative">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">TOTAL PERIODO</p>
                    <h3 className="text-4xl font-black text-slate-800 tracking-tight">{grandTotal.toLocaleString()}</h3>
                    <p className="text-xs text-slate-400 mt-2 font-medium">Volumen total mensual</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl z-10">
                    <Layers size={28} className="text-emerald-500" />
                </div>
                {/* Decoración de fondo */}
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-50 rounded-full opacity-50"></div>
            </div>

            {/* CARD 2: TOP IMPRESORA 1 */}
            {topPrinter1 ? (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-600 text-xs uppercase truncate w-3/4" title={topPrinter1.model}>
                            {topPrinter1.model}
                        </h4>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Printer size={20} className="text-blue-500" />
                        </div>
                    </div>
                    
                    <h3 className="text-3xl font-black text-slate-800 mb-4">{topPrinter1.total_counter.toLocaleString()}</h3>
                    
                    <div className="space-y-1 text-[11px] text-slate-500 border-t border-slate-50 pt-3">
                        <div className="flex justify-between">
                            <span>Color: <b className="text-slate-700">{topPrinter1.color_counter?.toLocaleString() || 0}</b></span>
                            <span>B/N: <b className="text-slate-700">{topPrinter1.bn_counter?.toLocaleString() || 0}</b></span>
                        </div>
                        <div className="flex justify-between">
                            <span>Duplex: <b className="text-slate-700">{topPrinter1.duplex_counter?.toLocaleString() || 0}</b></span>
                            <span>Simple: <b className="text-slate-700">{topPrinter1.simple_counter?.toLocaleString() || 0}</b></span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-300">Sin datos</div>
            )}

            {/* CARD 3: TOP IMPRESORA 2 */}
            {topPrinter2 ? (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-600 text-xs uppercase truncate w-3/4" title={topPrinter2.model}>
                            {topPrinter2.model}
                        </h4>
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <Droplet size={20} className="text-purple-500" />
                        </div>
                    </div>
                    
                    <h3 className="text-3xl font-black text-slate-800 mb-4">{topPrinter2.total_counter.toLocaleString()}</h3>
                    
                    <div className="space-y-1 text-[11px] text-slate-500 border-t border-slate-50 pt-3">
                        <div className="flex justify-between">
                            <span>Color: <b className="text-slate-700">{topPrinter2.color_counter?.toLocaleString() || 0}</b></span>
                            <span>B/N: <b className="text-slate-700">{topPrinter2.bn_counter?.toLocaleString() || 0}</b></span>
                        </div>
                        <div className="flex justify-between">
                            <span>Duplex: <b className="text-slate-700">{topPrinter2.duplex_counter?.toLocaleString() || 0}</b></span>
                            <span>Simple: <b className="text-slate-700">{topPrinter2.simple_counter?.toLocaleString() || 0}</b></span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-300">Sin datos</div>
            )}

        </div>
      )}

      {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando lecturas...</div>
      ) : (
        <>
          {/* TABLA PRINCIPAL */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <tr>
                        <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('model')}>
                          Dispositivo <ArrowUpDown size={12} className="inline ml-1"/>
                        </th>
                        <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('organization')}>
                          Organización <ArrowUpDown size={12} className="inline ml-1"/>
                        </th>
                        <th className="p-4 text-center">Tipo</th>
                        <th className="p-4 text-right font-bold text-blue-600 bg-blue-50/30 cursor-pointer" onClick={() => handleSort('total_counter')}>
                           Lectura Total <ArrowUpDown size={12} className="inline ml-1"/>
                        </th>
                        <th className="p-4 text-right text-purple-600">Lectura Color</th>
                        <th className="p-4 text-right text-slate-600">Lectura B/N</th>
                        <th className="p-4 text-right text-indigo-600">Duplex</th>
                        <th className="p-4 text-right text-cyan-600">Simple</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {tableData.map(item => (
                        <tr key={item.printer_id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4">
                                <div className="font-bold text-slate-700">{item.model}</div>
                                <div className="text-xs text-slate-400 font-mono">{item.serial}</div>
                            </td>
                            <td className="p-4">
                                <div className="text-slate-600 text-xs uppercase font-semibold">{item.organization}</div>
                            </td>
                            <td className="p-4 text-center">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                  item.type === 'Color' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {item.type}
                                </span>
                            </td>
                            <td className="p-4 text-right font-bold text-blue-600 bg-blue-50/30 text-base">
                                {item.total_counter.toLocaleString()}
                            </td>
                            <td className="p-4 text-right text-purple-600 font-medium">
                                {item.color_counter.toLocaleString()}
                            </td>
                            <td className="p-4 text-right text-slate-600 font-medium">
                                {item.bn_counter.toLocaleString()}
                            </td>
                            <td className="p-4 text-right text-indigo-600 font-medium">
                                {item.duplex_counter?.toLocaleString() || 0}
                            </td>
                            <td className="p-4 text-right text-cyan-600 font-medium">
                                {item.simple_counter?.toLocaleString() || 0}
                            </td>
                        </tr>
                    ))}
                    {tableData.length === 0 && (
                        <tr><td colSpan="8" className="p-10 text-center text-slate-400">No hay datos.</td></tr>
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

export default TotalPrints;