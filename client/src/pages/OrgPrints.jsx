import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx'; 
import { Calendar, Building2, Search, ArrowUpDown, Download, PieChart, Layers, Filter, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const OrgPrints = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]); 
  const [periods, setPeriods] = useState([]);
  
  // Filtros de Fecha
  const [startPeriod, setStartPeriod] = useState('');
  const [endPeriod, setEndPeriod] = useState('');
  
  // Filtros Jerárquicos
  const [selectedDir, setSelectedDir] = useState('');
  const [selectedDepto, setSelectedDepto] = useState('');
  const [selectedSub, setSelectedSub] = useState('');

  const [filterText, setFilterText] = useState(''); 
  const [sortConfig, setSortConfig] = useState({ key: 'consumption', direction: 'desc' }); // Por defecto ordenar por consumo

  const API_URL = 'http://localhost:3001/api/prints/departments';
  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  // --- CARGA DE DATOS ---
  const fetchData = useCallback(async (start = '', end = '') => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}?startPeriod=${start}&endPeriod=${end}`, getAuthHeaders());
      // Aseguramos que data sea siempre un array
      setData(Array.isArray(res.data.data) ? res.data.data : []); 
      setPeriods(res.data.periods || []);
      
      if (!start && res.data.startPeriod) {
        setStartPeriod(res.data.startPeriod);
        setEndPeriod(res.data.endPeriod);
      }
    } catch (error) {
      console.error("Error cargando departamentos:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  const handleRangeChange = (type, value) => {
    if (type === 'start') {
      setStartPeriod(value);
      if (value > endPeriod) setEndPeriod(value); 
      fetchData(value, (value > endPeriod ? value : endPeriod));
    } else {
      setEndPeriod(value);
      if (value < startPeriod) setStartPeriod(value);
      fetchData((value < startPeriod ? value : startPeriod), value);
    }
  };

  // --- FILTROS EN CASCADA ---
  const uniqueDirections = useMemo(() => {
    const dirs = [...new Set(data.map(item => item.direccion || ''))]; // Evitar nulos
    return dirs.filter(d => d).sort();
  }, [data]);

  const availableDeptos = useMemo(() => {
    if (!selectedDir) return [];
    const deptos = data
        .filter(item => item.direccion === selectedDir)
        .map(item => item.departamento || '');
    return [...new Set(deptos)].filter(d => d).sort();
  }, [data, selectedDir]);

  const availableSubs = useMemo(() => {
    if (!selectedDepto) return [];
    const subs = data
        .filter(item => item.departamento === selectedDepto)
        .map(item => item.subdepartamento || '');
    return [...new Set(subs)].filter(s => s).sort();
  }, [data, selectedDepto]);

  const handleDirChange = (e) => {
      setSelectedDir(e.target.value);
      setSelectedDepto('');
      setSelectedSub('');
  };
  
  const handleDeptoChange = (e) => {
      setSelectedDepto(e.target.value);
      setSelectedSub('');
  };

  // --- PROCESAMIENTO BLINDADO (AQUÍ ESTABA EL ERROR) ---
  const getProcessedData = () => {
      if (!data) return [];
      
      return data.filter(item => {
          // 1. Filtro Texto (BLINDADO CON || '')
          // Convertimos a string y luego a minúsculas para que nunca falle por null
          const serialSafe = (item.serial || '').toString().toLowerCase();
          const seccionSafe = (item.seccion || '').toString().toLowerCase();
          const textSafe = filterText.toLowerCase();

          const matchesText = serialSafe.includes(textSafe) || seccionSafe.includes(textSafe);

          // 2. Filtros Jerárquicos
          const matchesDir = selectedDir ? item.direccion === selectedDir : true;
          const matchesDepto = selectedDepto ? item.departamento === selectedDepto : true;
          const matchesSub = selectedSub ? item.subdepartamento === selectedSub : true;

          return matchesText && matchesDir && matchesDepto && matchesSub;
      });
  };

  const filteredData = getProcessedData();

  const sortedData = [...filteredData].sort((a, b) => {
    // Protección contra valores nulos en el ordenamiento
    let valA = a[sortConfig.key] ?? ''; 
    let valB = b[sortConfig.key] ?? '';

    if (typeof valA === 'string') {
      return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
  });

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // --- RANKING ---
  const deptRanking = filteredData.reduce((acc, curr) => {
    // Agrupación dinámica inteligente
    let groupName = 'Desconocido';
    if (selectedDepto) groupName = curr.seccion;
    else if (selectedDir) groupName = curr.departamento;
    else groupName = curr.direccion;
    
    // Fallback por si acaso
    if (!groupName) groupName = 'Sin Asignar';

    if (!acc[groupName]) acc[groupName] = 0;
    acc[groupName] += (Number(curr.consumption) || 0); // Asegurar que sumamos números
    return acc;
  }, {});

  const topGroups = Object.entries(deptRanking)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const handleExport = () => {
    const excelRows = sortedData.map(item => ({
      "DIRECCION": item.direccion,
      "DEPARTAMENTO": item.departamento,
      "SUBDEPARTAMENTO": item.subdepartamento,
      "SECCION": item.seccion,
      "MODELO": item.model,
      "SERIE": item.serial,
      "CONSUMO": item.consumption,
      "CONTADOR TOTAL": item.total_counter
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte_Org");
    XLSX.writeFile(workbook, `Org_Print_${startPeriod}.xlsx`);
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    try { return format(parseISO(dateStr + '-01'), 'MMM yy', { locale: es }).toUpperCase(); } catch { return dateStr; }
  };

  const clearFilters = () => {
      setSelectedDir('');
      setSelectedDepto('');
      setSelectedSub('');
      setFilterText('');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-indigo-500" /> Impresiones por Departamento
          </h2>
          <p className="text-slate-500 text-xs">Visión jerárquica del consumo y contadores.</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100">
                <Calendar size={18} className="text-indigo-600" />
                <div className="flex items-center gap-2 text-sm">
                  <select className="bg-transparent font-bold text-indigo-700 outline-none cursor-pointer"
                      value={startPeriod} onChange={(e) => handleRangeChange('start', e.target.value)}>
                      {periods.map(p => <option key={p} value={p}>{formatDateLabel(p)}</option>)}
                  </select>
                  <span className="text-indigo-400">➜</span>
                  <select className="bg-transparent font-bold text-indigo-700 outline-none cursor-pointer"
                      value={endPeriod} onChange={(e) => handleRangeChange('end', e.target.value)}>
                      {periods.map(p => <option key={p} value={p}>{formatDateLabel(p)}</option>)}
                  </select>
                </div>
            </div>
            <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-bold text-sm shadow-sm">
                <Download size={18} /> <span className="hidden md:inline">Excel</span>
            </button>
        </div>
      </div>

      {/* 2. FILTROS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dirección</label>
              <div className="relative">
                  <select className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 outline-none focus:border-indigo-500 transition-colors"
                      value={selectedDir} onChange={handleDirChange}>
                      <option value="">Todas las Direcciones</option>
                      {uniqueDirections.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
              </div>
          </div>

          <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Departamento</label>
              <div className="relative">
                  <select className={`w-full border text-sm rounded-lg p-2.5 outline-none transition-colors ${!selectedDir ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                      value={selectedDepto} onChange={handleDeptoChange} disabled={!selectedDir}>
                      <option value="">{selectedDir ? 'Todos los Departamentos' : 'Seleccione Dirección...'}</option>
                      {availableDeptos.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
              </div>
          </div>

          <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subdepartamento</label>
              <div className="relative">
                  <select className={`w-full border text-sm rounded-lg p-2.5 outline-none transition-colors ${!selectedDepto ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                      value={selectedSub} onChange={(e) => setSelectedSub(e.target.value)} disabled={!selectedDepto}>
                      <option value="">{selectedDepto ? 'Todos los Subdepartamentos' : 'Seleccione Depto...'}</option>
                      {availableSubs.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
              </div>
          </div>

          <div className="flex gap-2">
             <div className="relative grow">
                <input type="text" placeholder="Buscar serie / sección..." 
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 pl-9 outline-none focus:border-indigo-500"
                    value={filterText} onChange={(e) => setFilterText(e.target.value)} />
                <Search size={16} className="absolute left-3 top-3 text-slate-400"/>
             </div>
             {(selectedDir || filterText) && (
                 <button onClick={clearFilters} className="p-2.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 border border-red-100 transition-colors" title="Limpiar Filtros">
                     <X size={18} />
                 </button>
             )}
          </div>
      </div>

      {/* 3. RANKING */}
      {!loading && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                <PieChart size={16} /> 
                {selectedDepto ? 'Secciones con Mayor Consumo' : (selectedDir ? 'Departamentos con Mayor Consumo' : 'Direcciones con Mayor Consumo')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {topGroups.map((group, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-indigo-100 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-bl">#{idx+1}</div>
                        <h4 className="font-bold text-slate-700 text-sm truncate mb-1" title={group.name}>{group.name}</h4>
                        <p className="text-xl font-black text-indigo-600">{group.total.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400">impresiones</p>
                    </div>
                ))}
                {topGroups.length === 0 && <p className="text-sm text-slate-400 col-span-5 text-center">No hay datos para rankear.</p>}
            </div>
        </div>
      )}

      {/* 4. TABLA */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                    <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('departamento')}>
                        Departamento <ArrowUpDown size={12} className="inline"/>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('subdepartamento')}>
                        Sub / Sección <ArrowUpDown size={12} className="inline"/>
                    </th>
                    <th className="p-4">Dispositivo</th>
                    <th className="p-4 text-right font-bold text-emerald-600 bg-emerald-50/30 cursor-pointer" onClick={() => handleSort('consumption')}>
                        Consumo <ArrowUpDown size={12} className="inline"/>
                    </th>
                    <th className="p-4 text-right text-blue-600 cursor-pointer" onClick={() => handleSort('total_counter')}>
                        Total <ArrowUpDown size={12} className="inline"/>
                    </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
                {sortedData.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 align-top">
                            <div className="font-bold text-slate-700">{item.departamento}</div>
                            <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                                <Building2 size={10}/> {item.direccion}
                            </div>
                        </td>
                        <td className="p-4 align-top">
                            <div className="font-medium text-slate-600">{item.subdepartamento}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                <Layers size={10}/> <span className="font-semibold text-slate-500">{item.seccion}</span>
                            </div>
                        </td>
                        <td className="p-4 align-top">
                            <div className="text-slate-700 font-bold text-xs">{item.model}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.serial}</div>
                        </td>
                        <td className="p-4 text-right font-bold text-emerald-600 bg-emerald-50/30 text-base">
                            {Number(item.consumption).toLocaleString()}
                        </td>
                        <td className="p-4 text-right text-blue-600 font-medium">
                            {Number(item.total_counter).toLocaleString()}
                        </td>
                    </tr>
                ))}
                {sortedData.length === 0 && (
                    <tr><td colSpan="5" className="p-10 text-center text-slate-400">No hay datos que coincidan con los filtros.</td></tr>
                )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrgPrints;