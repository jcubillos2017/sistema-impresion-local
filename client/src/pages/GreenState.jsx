import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx'; 
import { Leaf, Download, Calendar, Search, Eye, FileText, X, ArrowLeft, Trash2, Edit2, Save, Ban } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const GreenState = () => {
  // --- ESTADOS TABLA PRINCIPAL ---
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]); 
  const [periods, setPeriods] = useState([]);
  const [startPeriod, setStartPeriod] = useState('');
  const [endPeriod, setEndPeriod] = useState('');
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState('');

  // --- ESTADOS GALERÍA RESOLUCIONES (INDEPENDIENTE) ---
  const [resolutions, setResolutions] = useState([]); 
  const [showModal, setShowModal] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState(null);
  const [selectedPdfTitle, setSelectedPdfTitle] = useState('');
  
  // Edición dentro del modal
  const [editingId, setEditingId] = useState(null);
  const [tempSerial, setTempSerial] = useState('');

  // URLS
  const API_URL = 'http://localhost:3001/api/prints/green';
  const RES_URL = 'http://localhost:3001/api/resolutions'; 
  const FILE_BASE_URL = 'http://localhost:3001/uploads/'; 

  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  // 1. CARGA DE DATOS TABLA
  const fetchData = useCallback(async (start = '', end = '') => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}?startPeriod=${start}&endPeriod=${end}`, getAuthHeaders());
      setData(Array.isArray(res.data.data) ? res.data.data : []);
      setPeriods(res.data.periods || []);
      if (!start && res.data.startPeriod) { setStartPeriod(res.data.startPeriod); setEndPeriod(res.data.endPeriod); }
    } catch (error) { 
        console.error("Error cargando tabla:", error);
    } finally { 
        setLoading(false); 
    }
  }, []);

  // 2. CARGA DE RESOLUCIONES (INDEPENDIENTE)
  const fetchResolutions = useCallback(async () => {
      try {
          const res = await axios.get(RES_URL, getAuthHeaders());
          setResolutions(res.data);
      } catch (error) { 
          console.error("Error cargando resoluciones:", error);
      }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  
  useEffect(() => { if (showModal) fetchResolutions(); }, [showModal, fetchResolutions]);

  // --- LÓGICA FILTROS Y CÁLCULOS ---
  const handleRangeChange = (type, value) => {
    if (type === 'start') { setStartPeriod(value); if (value > endPeriod) setEndPeriod(value); fetchData(value, value > endPeriod ? value : endPeriod); }
    else { setEndPeriod(value); if (value < startPeriod) setStartPeriod(value); fetchData(value < startPeriod ? value : startPeriod, value); }
  };

  const filteredData = data.filter(item => {
      const matchesText = (item.serial || '').toLowerCase().includes(filterText.toLowerCase()) || (item.model || '').toLowerCase().includes(filterText.toLowerCase());
      const matchesType = filterType ? item.type === filterType : true;
      return matchesText && matchesType;
  });

  const getPowerKW = (m) => { const x = (m||'').toLowerCase(); if(x.includes('x57945')) return 0.942; if(x.includes('e42540')) return 0.580; return 0.500; };
  
  const calcPercent = (part, total) => {
      if (!total || total === 0) return '0%';
      return Math.round((part / total) * 100) + '%';
  };

  // --- CÁLCULO TOTALES ---
  const totals = useMemo(() => {
      return filteredData.reduce((acc, item) => {
          acc.bw += item.consumption_bw || 0;
          acc.color += item.consumption_color || 0;
          acc.total += item.consumption_total || 0;
          acc.simple += item.consumption_simple || 0;
          acc.duplex += item.consumption_duplex || 0;
          return acc;
      }, { bw: 0, color: 0, total: 0, simple: 0, duplex: 0 });
  }, [filteredData]);

  const formatDateLabel = (d) => { try { return format(parseISO(d+'-01'), 'MMM yy', { locale: es }).toUpperCase(); } catch { return d; } };
  
  const handleExport = () => { 
    const excelRows = filteredData.map(item => ({ "Numero Serie": item.serial, "Tipo": item.type, "Modelo": item.model, "Total": item.consumption_total }));
    const ws = XLSX.utils.json_to_sheet(excelRows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Green"); XLSX.writeFile(wb, `Green_${startPeriod}.xlsx`);
  };

  // --- LÓGICA MODAL (CRUD) ---
  const handleOpenPdf = (filename, title) => { setSelectedPdfUrl(`${FILE_BASE_URL}${filename}`); setSelectedPdfTitle(title); };
  const handleCloseModal = () => { setShowModal(false); setSelectedPdfUrl(null); setEditingId(null); };
  
  const startEditing = (e, r) => { e.stopPropagation(); setEditingId(r.id); setTempSerial(r.serial); };
  const cancelEditing = (e) => { e.stopPropagation(); setEditingId(null); };
  
  const saveSerial = async (e, id) => {
      e.stopPropagation();
      try {
          await axios.put(`${RES_URL}/${id}`, { serial: tempSerial }, getAuthHeaders());
          setEditingId(null); fetchResolutions();
      } catch(error) { 
          console.error(error);
          alert('Error al actualizar'); 
      }
  };

  const handleDelete = async (e, id) => {
      e.stopPropagation();
      if(!window.confirm('¿Borrar esta resolución?')) return;
      try {
          await axios.delete(`${RES_URL}/${id}`, getAuthHeaders());
          fetchResolutions();
      } catch(error) { 
          console.error(error);
          alert('Error al borrar'); 
      }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER TABLA */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Leaf className="text-green-600" /> Estado Verde</h2><p className="text-slate-500 text-xs">Análisis de eficiencia.</p></div>
        <div className="flex gap-3 items-center">
            <div className="relative"><input type="text" placeholder="Buscar..." className="bg-white border p-2 pl-8 rounded-lg text-sm w-32" value={filterText} onChange={e=>setFilterText(e.target.value)} /><Search size={14} className="absolute left-3 top-3 text-slate-400"/></div>
            <select className="bg-white border p-2 rounded-lg text-sm" value={filterType} onChange={e=>setFilterType(e.target.value)}><option value="">Todos</option><option value="Color">Color</option><option value="B/N">B/N</option></select>
            <div className="flex items-center gap-2 bg-green-50 p-2 rounded-lg border border-green-100">
                <Calendar size={18} className="text-green-600" />
                <select className="bg-transparent font-bold text-green-700 text-sm" value={startPeriod} onChange={e=>handleRangeChange('start', e.target.value)}>{periods.map(p=><option key={p} value={p}>{formatDateLabel(p)}</option>)}</select>
                <span className="text-green-400">➜</span>
                <select className="bg-transparent font-bold text-green-700 text-sm" value={endPeriod} onChange={e=>handleRangeChange('end', e.target.value)}>{periods.map(p=><option key={p} value={p}>{formatDateLabel(p)}</option>)}</select>
            </div>
            <button onClick={handleExport} className="bg-slate-700 text-white p-2 rounded-lg"><Download size={18}/></button>
        </div>
      </div>

      {/* TABLA DE DATOS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead className="bg-green-50 text-green-800 font-bold uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                {/* FILA 1: TÍTULOS */}
                <tr>
                    <th className="p-3 border-b border-green-200">Serie</th>
                    <th className="p-3 border-b border-green-200">Tipo</th>
                    <th className="p-3 border-b border-green-200">Modelo</th>
                    <th className="p-3 border-b border-green-200">Ubicación</th>
                    <th className="p-3 border-b border-green-200 text-center">KW</th>
                    <th className="p-3 border-b border-green-200 text-right">B/N</th>
                    <th className="p-3 border-b border-green-200 text-right">% B/N</th>
                    <th className="p-3 border-b border-green-200 text-right">Color</th>
                    <th className="p-3 border-b border-green-200 text-right">% Color</th>
                    <th className="p-3 border-b border-green-200 text-right font-black">Total</th>
                    <th className="p-3 border-b border-green-200 text-right">Simple</th>
                    <th className="p-3 border-b border-green-200 text-right">Duplex</th>
                </tr>

                {/* FILA 2: TOTALES (ESTILO "RESUMEN SUPERIOR") */}
                <tr className="bg-white text-slate-700 border-b-2 border-slate-200 text-[11px]">
                    <td colSpan="5" className="p-2 text-right font-bold text-slate-400 uppercase tracking-widest bg-slate-50">
                        Total Periodo:
                    </td>
                    
                    {/* Totales B/N */}
                    <td className="p-2 text-right font-bold bg-green-50/50">{totals.bw.toLocaleString()}</td>
                    <td className="p-2 text-right font-bold text-slate-500 bg-green-50/50">{calcPercent(totals.bw, totals.total)}</td>
                    
                    {/* Totales Color */}
                    <td className="p-2 text-right font-bold text-orange-600 bg-orange-50/30">{totals.color.toLocaleString()}</td>
                    <td className="p-2 text-right font-bold text-orange-500 bg-orange-50/30">{calcPercent(totals.color, totals.total)}</td>
                    
                    {/* Total General */}
                    <td className="p-2 text-right font-black text-indigo-700 bg-indigo-50/30 text-sm border-l border-r border-indigo-100">
                        {totals.total.toLocaleString()}
                    </td>
                    
                    {/* Totales Simple/Duplex */}
                    <td className="p-2 text-right font-bold">{totals.simple.toLocaleString()}</td>
                    <td className="p-2 text-right font-bold">{totals.duplex.toLocaleString()}</td>
                </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan="12" className="p-10 text-center">Cargando...</td></tr> : filteredData.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-700">{item.serial}</td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.type==='Color'?'bg-orange-100 text-orange-700':'bg-slate-100 text-slate-600'}`}>{item.type||'-'}</span></td>
                        <td className="p-3 text-slate-600 truncate max-w-[150px]">{item.model}</td>
                        <td className="p-3 text-slate-500 truncate max-w-[150px]">{item.location}</td>
                        <td className="p-3 text-center font-bold">{getPowerKW(item.model).toString().replace('.',',')}</td>
                        
                        <td className="p-3 text-right">{item.consumption_bw.toLocaleString()}</td>
                        <td className="p-3 text-right text-slate-500">{calcPercent(item.consumption_bw, item.consumption_total)}</td>
                        
                        <td className="p-3 text-right text-orange-600">{item.consumption_color.toLocaleString()}</td>
                        <td className="p-3 text-right text-orange-400">{calcPercent(item.consumption_color, item.consumption_total)}</td>
                        
                        <td className="p-3 text-right font-black text-indigo-600">{item.consumption_total.toLocaleString()}</td>
                        <td className="p-3 text-right">{item.consumption_simple.toLocaleString()}</td>
                        <td className="p-3 text-right">{item.consumption_duplex.toLocaleString()}</td>
                    </tr>
                ))}
            </tbody>
          </table>
      </div>

      {/* FOOTER ESTÁTICO DE BOTONES */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white shadow-lg z-50 border-t border-slate-700">
          <div className="max-w-[1920px] mx-auto px-6 h-12 flex items-center justify-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">RESOLUCIONES</span>
              <button onClick={() => setShowModal(true)} className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full transition-colors shadow-md"><Eye size={20} /></button>
          </div>
      </div>

      {/* MODAL GALERÍA INDEPENDIENTE */}
      {showModal && (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-6xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                      <div className="flex items-center gap-3">
                          {selectedPdfUrl && <button onClick={()=>setSelectedPdfUrl(null)} className="p-1.5 hover:bg-slate-200 rounded-full"><ArrowLeft size={20}/></button>}
                          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><FileText className="text-red-500"/> {selectedPdfUrl ? selectedPdfTitle : 'Galería de Resoluciones'}</h3>
                      </div>
                      <button onClick={handleCloseModal} className="p-2 hover:bg-slate-200 rounded-full"><X size={20}/></button>
                  </div>
                  <div className="flex-1 bg-slate-100 relative overflow-hidden">
                      {selectedPdfUrl ? (
                          <embed src={selectedPdfUrl} type="application/pdf" className="w-full h-full" title='Visor PDF'/>
                      ) : (
                          <div className="p-6 overflow-y-auto h-full grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {resolutions.length > 0 ? resolutions.map((r) => (
                                  <div key={r.id} onClick={()=>handleOpenPdf(r.filename, r.serial)} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:bg-blue-50 transition-all group relative">
                                      <div className="relative z-10 pr-6">
                                          {editingId === r.id ? (
                                              <div className="flex items-center gap-1 mb-1" onClick={e=>e.stopPropagation()}>
                                                  <input type="text" value={tempSerial} onChange={e=>setTempSerial(e.target.value)} className="w-full border border-blue-400 rounded px-1 text-sm font-bold" autoFocus/>
                                                  <button onClick={e=>saveSerial(e, r.id)} className="text-green-600 p-1"><Save size={14}/></button>
                                                  <button onClick={cancelEditing} className="text-red-600 p-1"><Ban size={14}/></button>
                                              </div>
                                          ) : (
                                              <div className="flex items-center gap-2 mb-1 group-hover:justify-between">
                                                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-700 truncate">{r.serial}</h4>
                                                  <button onClick={e=>startEditing(e, r)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 p-1"><Edit2 size={12}/></button>
                                              </div>
                                          )}
                                          <p className="text-xs text-slate-500 truncate">Resolución Exenta</p>
                                      </div>
                                      <button onClick={e=>handleDelete(e, r.id)} className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full z-20"><Trash2 size={16}/></button>
                                  </div>
                              )) : (
                                  <div className="col-span-full flex flex-col items-center justify-center h-64 text-slate-400"><FileText size={48} className="opacity-30"/><p>No hay resoluciones.</p></div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default GreenState;