import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { Plus, Search, Printer as PrinterIcon, MapPin, Edit, Trash2, FileSpreadsheet, Droplets, X, Save } from 'lucide-react';

const Printers = () => {
  // --- ESTADOS ---
  const [printers, setPrinters] = useState([]);
  const [orgTree, setOrgTree] = useState([]); // Árbol para los selectores
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // Estados del Modal
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPrinterId, setCurrentPrinterId] = useState(null);

  // Formulario (Incluye nuevo campo 'observacion')
  const [formData, setFormData] = useState({
    serial_number: '',
    brand: '',
    model: '',
    type: 'B/N',
    inventory_code: '',
    status: 'active',
    observacion: '' // <--- NUEVO CAMPO
  });

  // Estados Selectores en Cascada
  const [selectedDir, setSelectedDir] = useState('');
  const [selectedDep, setSelectedDep] = useState('');
  const [selectedSub, setSelectedSub] = useState('');
  const [selectedSec, setSelectedSec] = useState('');

  const API_URL = 'http://localhost:3001/api/printers';
  const ORG_URL = 'http://localhost:3001/api/org/tree';
  
  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  // --- CARGA DE DATOS ---
  const fetchPrinters = useCallback(async () => {
    try {
      const res = await axios.get(API_URL, getAuthHeaders());
      setPrinters(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Error cargando impresoras');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrgTree = useCallback(async () => {
    try {
      const res = await axios.get(ORG_URL, getAuthHeaders());
      setOrgTree(res.data);
    } catch (error) {
      console.error("Error cargando estructura:", error);
    }
  }, []);

  useEffect(() => {
    fetchPrinters();
    fetchOrgTree();
  }, [fetchPrinters, fetchOrgTree]);

  // --- MANEJO DEL FORMULARIO ---

  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData({ 
      serial_number: '', brand: '', model: '', type: 'B/N', inventory_code: '', status: 'active', observacion: '' 
    });
    setSelectedDir(''); setSelectedDep(''); setSelectedSub(''); setSelectedSec('');
    setShowModal(true);
  };

  const handleOpenEdit = (printer) => {
    setIsEditing(true);
    setCurrentPrinterId(printer.id);
    
    // Cargar datos existentes
    setFormData({
      serial_number: printer.serial_number,
      brand: printer.brand,
      model: printer.model,
      type: printer.type || 'B/N',
      inventory_code: printer.inventory_code || '',
      status: printer.status,
      observacion: printer.observacion || '' // Cargar observación o vacío
    });

    // Reconstruir cascada de selectores
    if (printer.Seccion) {
      const sec = printer.Seccion;
      const sub = sec.Subdepartamento;
      const dep = sub?.Departamento;
      const dir = dep?.Direccion;

      if (dir) setSelectedDir(dir.id);
      if (dep) setSelectedDep(dep.id);
      if (sub) setSelectedSub(sub.id);
      if (sec) setSelectedSec(sec.id);
    } else {
      setSelectedDir(''); setSelectedDep(''); setSelectedSub(''); setSelectedSec('');
    }

    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSec) return toast.error("Debes seleccionar una Ubicación final (Sección)");

    const payload = { ...formData, seccion_id: selectedSec };

    try {
      if (isEditing) {
        await axios.put(`${API_URL}/${currentPrinterId}`, payload, getAuthHeaders());
        toast.success("Impresora actualizada");
      } else {
        await axios.post(API_URL, payload, getAuthHeaders());
        toast.success("Impresora creada");
      }
      setShowModal(false);
      fetchPrinters();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Error al guardar");
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("¿Estás seguro de eliminar esta impresora?")) return;
    try {
      await axios.delete(`${API_URL}/${id}`, getAuthHeaders());
      toast.success("Eliminada correctamente");
      fetchPrinters();
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar");
    }
  };

  // --- IMPORTACIÓN EXCEL ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = ''; 

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rawData = XLSX.utils.sheet_to_json(ws);

      if (rawData.length === 0) return toast.error("Archivo vacío");

      const normalizeStr = (str) => str?.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

      const cleanData = rawData.map(row => {
        const newRow = {};
        Object.keys(row).forEach(key => {
          const k = normalizeStr(key);
          if (k === 'serie') newRow['Serie'] = row[key];
          else if (k === 'marca') newRow['Marca'] = row[key];
          else if (k === 'modelo') newRow['Modelo'] = row[key];
          else if (k === 'inventario') newRow['Inventario'] = row[key];
          else if (k === 'tipo') newRow['Tipo'] = row[key];
          else if (k === 'observacion') newRow['Observacion'] = row[key]; // Soporte opcional Excel
          else if (k === 'direccion') newRow['Direccion'] = row[key];
          else if (k === 'departamento') newRow['Departamento'] = row[key];
          else if (k === 'subdepartamento') newRow['Subdepartamento'] = row[key];
          else if (k === 'seccion') newRow['Seccion'] = row[key];
        });
        return newRow;
      });

      const firstRow = cleanData[0];
      if (!firstRow || !Object.prototype.hasOwnProperty.call(firstRow, 'Serie')) {
        return toast.error("El Excel debe tener al menos la columna 'Serie'.");
      }

      if(!window.confirm(`¿Importar ${cleanData.length} impresoras?`)) return;
      
      const toastId = toast.loading("Procesando equipos...");
      try {
        await axios.post(`${API_URL}/import`, cleanData, getAuthHeaders());
        toast.success("Impresoras importadas correctamente", { id: toastId });
        fetchPrinters();
      } catch (error) {
        console.error(error);
        toast.error("Error al importar", { id: toastId });
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- HELPERS SELECTORES ---
  const getDepartments = () => orgTree.find(d => d.id == selectedDir)?.Departamentos || [];
  const getSubdepartments = () => getDepartments()?.find(d => d.id == selectedDep)?.Subdepartamentos || [];
  const getSections = () => getSubdepartments()?.find(s => s.id == selectedSub)?.Seccions || [];

  // --- RENDER ---
  const filteredPrinters = printers.filter(p => 
    p.serial_number.toLowerCase().includes(filter.toLowerCase()) ||
    p.model.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Maestro de Impresoras</h2>
          <p className="text-slate-500 text-sm">Inventario de equipos físicos</p>
        </div>

        <div className="flex gap-2">
            <div className="relative">
                <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Cargar Excel Impresoras" />
                <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-colors">
                    <FileSpreadsheet size={20} /> Importar Excel
                </button>
            </div>
            <button onClick={handleOpenCreate}
              className="bg-accent hover:bg-sky-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/30">
                <Plus size={20} /> Nueva Impresora
            </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
        <Search className="text-slate-400" />
        <input type="text" placeholder="Buscar por serie o modelo..." className="flex-1 outline-none text-slate-600"
          value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
            <tr>
              <th className="p-4 font-semibold">Equipo</th>
              <th className="p-4 font-semibold">Ubicación (Org)</th>
              <th className="p-4 font-semibold">Serie</th>
              <th className="p-4 font-semibold text-center">Estado</th>
              <th className="p-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr><td colSpan="5" className="p-8 text-center text-slate-400">Cargando...</td></tr>
            ) : filteredPrinters.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-slate-400">No se encontraron impresoras</td></tr>
            ) : (
              filteredPrinters.map((printer) => {
                const isColor = printer.type?.toLowerCase().includes('color');
                return (
                  <tr key={printer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isColor ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                          {isColor ? <Droplets size={20} /> : <PrinterIcon size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-700">{printer.model}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${
                              isColor ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>{printer.type || 'B/N'}</span>
                          </div>
                          <p className="text-xs text-slate-400">{printer.brand}</p>
                          {/* Mostrar observación pequeña si existe */}
                          {printer.observacion && (
                            <p className="text-[10px] text-amber-600 mt-1 italic max-w-[200px] truncate">
                              Nota: {printer.observacion}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {printer.Seccion ? (
                        <div>
                          <div className="flex items-center gap-1 text-slate-700 font-medium">
                              <MapPin size={14} className="text-red-400" />
                              {printer.Seccion.nombre === printer.Seccion.Subdepartamento?.nombre 
                                  ? printer.Seccion.Subdepartamento?.nombre 
                                  : printer.Seccion.nombre}
                          </div>
                          <p className="text-xs text-slate-400 ml-5">
                              {printer.Seccion.Subdepartamento?.Departamento?.nombre} 
                              {printer.Seccion.Subdepartamento?.Departamento?.Direccion?.nombre ? ` - ${printer.Seccion.Subdepartamento.Departamento.Direccion.nombre}` : ''}
                          </p>
                        </div>
                      ) : <span className="text-slate-400 italic">Sin asignar</span>}
                    </td>
                    <td className="p-4 font-mono text-slate-600">{printer.serial_number}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${printer.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {printer.status === 'active' ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenEdit(printer)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-accent transition-colors">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(printer.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">
                {isEditing ? `Editar Impresora: ${formData.model}` : 'Nueva Impresora'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Número de Serie</label>
                  <input type="text" required className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                    value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Código Inventario</label>
                  <input type="text" className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                    value={formData.inventory_code} onChange={e => setFormData({...formData, inventory_code: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Marca</label>
                  <input type="text" required className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                    value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Modelo</label>
                  <input type="text" required className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                    value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Tipo</label>
                  <select className="w-full border p-2 rounded-lg" value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="B/N">B/N</option>
                    <option value="Color">Color</option>
                    <option value="Plotter">Plotter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Estado</label>
                  <select className="w-full border p-2 rounded-lg" value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="active">Activa</option>
                    <option value="inactive">Inactiva</option>
                    <option value="repair">En Reparación</option>
                  </select>
                </div>
                
                {/* CAMPO OBSERVACIONES */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Observaciones <span className="text-xs text-slate-400">(Máx 100 caracteres)</span>
                  </label>
                  <textarea 
                    className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-accent outline-none resize-none"
                    rows="2" maxLength="100" placeholder="Ej: Bandeja 2 defectuosa..."
                    value={formData.observacion} onChange={e => setFormData({...formData, observacion: e.target.value})}
                  />
                  <div className="text-right text-xs text-slate-400">{formData.observacion.length}/100</div>
                </div>
              </div>

              <div className="border-t border-slate-100 my-4"></div>

              <div>
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <MapPin size={18} className="text-accent" /> Ubicación
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase text-slate-400 font-bold mb-1">Dirección</label>
                    <select className="w-full border p-2 rounded-lg bg-slate-50"
                      value={selectedDir} onChange={e => {
                        setSelectedDir(e.target.value); setSelectedDep(''); setSelectedSub(''); setSelectedSec('');
                      }} required>
                      <option value="">-- Seleccionar --</option>
                      {orgTree.map(dir => (<option key={dir.id} value={dir.id}>{dir.nombre}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-slate-400 font-bold mb-1">Departamento</label>
                    <select className="w-full border p-2 rounded-lg bg-slate-50 disabled:opacity-50"
                      value={selectedDep} onChange={e => { setSelectedDep(e.target.value); setSelectedSub(''); setSelectedSec(''); }}
                      disabled={!selectedDir} required>
                      <option value="">-- Seleccionar --</option>
                      {getDepartments()?.map(dep => (<option key={dep.id} value={dep.id}>{dep.nombre}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-slate-400 font-bold mb-1">Subdepartamento</label>
                    <select className="w-full border p-2 rounded-lg bg-slate-50 disabled:opacity-50"
                      value={selectedSub} onChange={e => { setSelectedSub(e.target.value); setSelectedSec(''); }}
                      disabled={!selectedDep} required>
                      <option value="">-- Seleccionar --</option>
                      {getSubdepartments()?.map(sub => (<option key={sub.id} value={sub.id}>{sub.nombre}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-slate-400 font-bold mb-1">Sección</label>
                    <select className="w-full border p-2 rounded-lg bg-slate-50 disabled:opacity-50"
                      value={selectedSec} onChange={e => setSelectedSec(e.target.value)} disabled={!selectedSub} required>
                      <option value="">-- Seleccionar --</option>
                      {getSections()?.map(sec => (<option key={sec.id} value={sec.id}>{sec.nombre}</option>))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg font-medium">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-accent hover:bg-sky-600 text-white rounded-lg font-medium shadow-lg shadow-blue-500/30 flex items-center gap-2">
                  <Save size={18} /> {isEditing ? 'Guardar Cambios' : 'Crear Impresora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Printers;