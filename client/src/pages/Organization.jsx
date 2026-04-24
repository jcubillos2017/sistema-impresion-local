import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx'; 
import { ChevronRight, ChevronDown, Plus, Trash2, Building, Folder, FolderOpen, MapPin, FileSpreadsheet, Edit, Save, X } from 'lucide-react';

const Organization = () => {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para Modal (Crear / Editar)
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [newItem, setNewItem] = useState({ type: 'direccion', nombre: '', parentId: '' });
  const [parentsList, setParentsList] = useState([]); 

  const API_URL = 'http://localhost:3001/api/org';
  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const fetchTree = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/tree`, getAuthHeaders());
      setTree(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Error cargando organización');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // --- LÓGICA DE IMPORTACIÓN EXCEL ---
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
          const cleanKey = normalizeStr(key);
          if (cleanKey === 'servicio') newRow['Servicio'] = row[key];
          else if (cleanKey === 'direccion') newRow['Direccion'] = row[key];
          else if (cleanKey === 'departamento') newRow['Departamento'] = row[key];
          else if (cleanKey === 'subdepartamento') newRow['Subdepartamento'] = row[key];
          else if (cleanKey === 'seccion') newRow['Seccion'] = row[key];
          else if (cleanKey === 'ubicacion') newRow['Ubicacion'] = row[key];
        });
        return newRow;
      });

      const firstRow = cleanData[0];
      if (!firstRow || !Object.prototype.hasOwnProperty.call(firstRow, 'Servicio')) {
        return toast.error("Error formato: Falta columna 'Servicio'");
      }

      if(!window.confirm(`¿Importar ${cleanData.length} filas?`)) return;

      const toastId = toast.loading("Procesando estructura...");
      try {
        await axios.post(`${API_URL}/import`, cleanData, getAuthHeaders());
        toast.success("Estructura importada", { id: toastId });
        fetchTree(); 
      } catch (error) {
        console.error(error);
        toast.error("Error al importar", { id: toastId });
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- COMPONENTE DE NODO DEL ÁRBOL ---
  const TreeNode = ({ label, type, id, children, icon, color }) => {
    const [isOpen, setIsOpen] = useState(false);
    const Icono = icon;

    // Abrir Modal para Editar
    const handleEditClick = (e) => {
      e.stopPropagation();
      setIsEditing(true);
      setEditingId(id);
      // Precargamos los datos para editar solo el nombre
      setNewItem({ type, nombre: label, parentId: '' }); 
      setShowModal(true);
    };

    const handleDelete = async (e) => {
      e.stopPropagation(); 
      if (!window.confirm(`¿Eliminar ${type} "${label}" y todo su contenido?`)) return;
      try {
        await axios.delete(`${API_URL}/${type}/${id}`, getAuthHeaders());
        toast.success('Eliminado');
        fetchTree();
      } catch (error) {
        console.error(error);
        toast.error('Error al eliminar');
      }
    };

    return (
      <div className="ml-6 mt-2">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors group ${isOpen ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
        >
          {children && children.length > 0 ? (
            isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />
          ) : <div className="w-4" />} 
          
          <Icono size={18} className={color} />
          
          <span className="font-medium text-slate-700">{label}</span>
          <span className="text-xs text-slate-400 uppercase ml-2 border px-1 rounded">{type}</span>

          <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* BOTÓN EDITAR */}
            <button onClick={handleEditClick} className="p-1 text-slate-400 hover:text-accent hover:bg-white rounded">
                <Edit size={14} />
            </button>
            {/* BOTÓN ELIMINAR */}
            <button onClick={handleDelete} className="p-1 text-slate-400 hover:text-red-500 hover:bg-white rounded">
                <Trash2 size={14} />
            </button>
          </div>
        </div>

        {isOpen && children && (
          <div className="border-l-2 border-slate-100 ml-3">
            {children}
          </div>
        )}
      </div>
    );
  };

  // --- LÓGICA DE GUARDADO (Crear o Editar) ---
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        // MODO EDICIÓN: PUT
        await axios.put(`${API_URL}/${newItem.type}/${editingId}`, { nombre: newItem.nombre }, getAuthHeaders());
        toast.success('Actualizado correctamente');
      } else {
        // MODO CREACIÓN: POST
        await axios.post(`${API_URL}/create`, newItem, getAuthHeaders());
        toast.success('Creado exitosamente');
      }
      setShowModal(false);
      fetchTree();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar');
    }
  };

  // Abrir modal para crear desde cero
  const openCreateModal = () => {
    setIsEditing(false);
    setNewItem({ type: 'direccion', nombre: '', parentId: '' });
    setShowModal(true);
  };

  // Cargar lista de padres cuando cambia el tipo (Solo en modo creación)
  useEffect(() => {
    if (isEditing) return; // En edición no cambiamos padres
    if (newItem.type === 'direccion') {
      setParentsList([]);
    } else if (newItem.type === 'departamento') {
      setParentsList(tree.map(d => ({ id: d.id, nombre: d.nombre })));
    } else if (newItem.type === 'subdepartamento') {
      const allDepts = tree.flatMap(dir => dir.Departamentos || []);
      setParentsList(allDepts.map(d => ({ id: d.id, nombre: d.nombre })));
    } else if (newItem.type === 'seccion') {
       const allSubs = tree.flatMap(dir => dir.Departamentos || []).flatMap(dep => dep.Subdepartamentos || []);
       setParentsList(allSubs.map(s => ({ id: s.id, nombre: s.nombre })));
    }
  }, [newItem.type, tree, isEditing]); 

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Estructura Organizacional</h2>
          <p className="text-slate-500 text-sm">Define la jerarquía para ubicar las impresoras</p>
        </div>
        
        <div className="flex gap-2">
            <div className="relative">
                <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="Cargar Excel Masivo"
                />
                <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-colors">
                    <FileSpreadsheet size={20} /> Importar Excel
                </button>
            </div>

            <button 
              onClick={openCreateModal}
              className="bg-accent hover:bg-sky-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/30"
            >
              <Plus size={20} /> Agregar Nivel
            </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[400px]">
        {loading ? <p>Cargando árbol...</p> : (
          tree.length === 0 ? <p className="text-center text-slate-400 mt-10">No hay estructura definida.</p> :
          
          tree.map(dir => (
            <TreeNode key={dir.id} label={dir.nombre} type="direccion" id={dir.id} icon={Building} color="text-indigo-600">
              {dir.Departamentos?.map(dep => (
                <TreeNode key={dep.id} label={dep.nombre} type="departamento" id={dep.id} icon={Folder} color="text-blue-500">
                  {dep.Subdepartamentos?.map(sub => (
                    <TreeNode key={sub.id} label={sub.nombre} type="subdepartamento" id={sub.id} icon={FolderOpen} color="text-amber-500">
                      {sub.Seccions?.map(sec => (
                        <TreeNode key={sec.id} label={sec.nombre} type="seccion" id={sec.id} icon={MapPin} color="text-red-500" />
                      ))}
                    </TreeNode>
                  ))}
                </TreeNode>
              ))}
            </TreeNode>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-96">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">
                    {isEditing ? 'Editar Nombre' : 'Agregar Nuevo Elemento'}
                </h3>
                <button onClick={() => setShowModal(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              
              {/* Si estamos editando, bloqueamos el selector de tipo para no mover la jerarquía accidentalmente */}
              <div>
                <label className="block text-sm font-medium mb-1">Nivel Jerárquico</label>
                <select 
                  className="w-full border p-2 rounded-lg bg-slate-50"
                  value={newItem.type}
                  onChange={e => setNewItem({ ...newItem, type: e.target.value, parentId: '' })}
                  disabled={isEditing} 
                >
                  <option value="direccion">1. Dirección</option>
                  <option value="departamento">2. Departamento</option>
                  <option value="subdepartamento">3. Subdepartamento</option>
                  <option value="seccion">4. Sección</option>
                </select>
              </div>

              {/* Selector de Padre (Solo visible al crear y si no es Dirección) */}
              {!isEditing && newItem.type !== 'direccion' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Pertenece a:</label>
                  <select 
                    className="w-full border p-2 rounded-lg"
                    value={newItem.parentId}
                    onChange={e => setNewItem({ ...newItem, parentId: e.target.value })}
                    required
                  >
                    <option value="">-- Seleccionar Padre --</option>
                    {parentsList.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                  value={newItem.nombre}
                  onChange={e => setNewItem({ ...newItem, nombre: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-2 text-slate-500 hover:bg-slate-50 rounded">Cancelar</button>
                <button type="submit" className="bg-accent hover:bg-sky-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <Save size={18} /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organization;