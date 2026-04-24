import { useState } from 'react';
import axios from 'axios';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, FileText, Search, Trash2 } from 'lucide-react'; // <--- Agregamos Trash2

const Import = () => {
  // --- ESTADOS EXCEL ---
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);
  
  // --- ESTADO CORRECCIÓN (BORRAR MES) ---
  const [deletePeriod, setDeletePeriod] = useState('');

  // --- ESTADOS PDF (INDEPENDIENTE) ---
  const [pdfFile, setPdfFile] = useState(null);
  const [serial, setSerial] = useState('');
  const [pdfMessage, setPdfMessage] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // URLS
  const API_URL = 'http://localhost:3001/api/import';
  const RES_URL = 'http://localhost:3001/api/resolutions'; 

  // --- HELPER PARA CABECERAS ---
  const getAuthHeaders = () => {
    return {
      headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
      }
    };
  };

  // 1. LÓGICA EXCEL
  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUploadExcel = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true); setMessage(null); setLog([]);

    try {
      const res = await axios.post(API_URL, formData, getAuthHeaders());
      setMessage({ type: 'success', text: res.data.message });
      setLog(res.data.details || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error al subir Excel' });
    } finally {
      setLoading(false);
    }
  };

  // 1.5 LÓGICA ELIMINAR PERIODO (CORRECCIÓN)
  const handleDeletePeriod = async () => {
      if (!deletePeriod) return alert('Por favor, selecciona el mes que deseas borrar.');
      
      const confirmMsg = `⚠️ PELIGRO ⚠️\n\n¿Estás seguro de ELIMINAR todos los contadores del mes: ${deletePeriod}?\n\nEsta acción no se puede deshacer. Úsala solo si cargaste datos por error.`;
      
      if (!window.confirm(confirmMsg)) return;

      try {
          // Usamos axios.delete con la URL + fecha (ej: .../api/import/2026-02)
          // Nota: axios.delete requiere 'headers' en el segundo argumento, no en el tercero como post/put
          // Pero como getAuthHeaders() devuelve un objeto { headers: ... }, debemos pasarlo directo.
          // Sin embargo, para DELETE, config va en el 2do argumento.
          
          await axios.delete(`${API_URL}/${deletePeriod}`, {
             headers: getAuthHeaders().headers 
          });

          alert(`✅ Los datos del periodo ${deletePeriod} han sido eliminados correctamente.`);
          setDeletePeriod(''); // Limpiar selector
      } catch (error) {
          console.error(error);
          alert('Error al intentar eliminar el periodo. Revisa la consola.');
      }
  };

  // 2. LÓGICA PDF (INDEPENDIENTE)
  const handlePdfChange = (e) => setPdfFile(e.target.files[0]);

  const handleUploadPdf = async (e) => {
      e.preventDefault();
      
      if (!pdfFile) {
          setPdfMessage({ type: 'error', text: 'Seleccione un archivo PDF.' });
          return;
      }
      if (!serial.trim()) {
          setPdfMessage({ type: 'error', text: 'Escriba un número de serie o nombre.' });
          return;
      }

      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('serial', serial.trim());

      setPdfLoading(true);
      setPdfMessage(null);

      try {
          await axios.post(RES_URL, formData, getAuthHeaders());
          
          setPdfMessage({ type: 'success', text: '✅ Resolución guardada correctamente.' });
          setSerial('');
          setPdfFile(null);
          const input = document.getElementById('pdfInput');
          if (input) input.value = ''; 

      } catch (error) {
          console.error(error);
          setPdfMessage({ type: 'error', text: error.response?.data?.message || 'Error al subir PDF.' });
      } finally {
          setPdfLoading(false);
      }
  };

  return (
    <div className="space-y-8">
      
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <Upload className="text-indigo-600" /> Centro de Importación
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* TARJETA 1: CARGA MASIVA EXCEL */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-100 p-2 rounded-lg"><FileSpreadsheet className="text-green-600" size={24}/></div>
                  <h3 className="font-bold text-lg text-slate-700">Contadores Mensuales</h3>
              </div>
              <p className="text-sm text-slate-500 mb-6">Sube el archivo Excel (.xlsx) con los contadores.</p>
              
              <form onSubmit={handleUploadExcel} className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                      <input type="file" onChange={handleFileChange} accept=".xlsx" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                  </div>
                  <button type="submit" disabled={loading || !file} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex justify-center items-center gap-2">
                      {loading ? 'Procesando...' : <><Upload size={20}/> Importar Excel</>}
                  </button>
              </form>
              
              {message && (
                  <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                      <div className="text-sm">{message.text}</div>
                  </div>
              )}
              {log.length > 0 && (
                  <div className="mt-4 max-h-40 overflow-y-auto bg-slate-900 text-slate-300 p-3 rounded-lg text-xs font-mono">
                      {log.map((l, i) => <div key={i}>{l}</div>)}
                  </div>
              )}

              {/* --- ZONA DE CORRECCIÓN (ELIMINAR MES) --- */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-red-500 uppercase mb-2 flex items-center gap-2">
                      <Trash2 size={14}/> Zona de Corrección
                  </h4>
                  <p className="text-xs text-slate-400 mb-3">
                      Si cargaste un mes con fecha errónea (ej: pusiste fecha actual en vez de fecha del periodo), bórralo aquí.
                  </p>
                  <div className="flex gap-2 items-center">
                      <input 
                          type="month" 
                          value={deletePeriod} 
                          onChange={(e) => setDeletePeriod(e.target.value)}
                          className="border border-slate-200 text-sm p-2 rounded-lg text-slate-600 outline-none focus:border-red-300 w-full"
                      />
                      <button 
                          onClick={handleDeletePeriod}
                          className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-100 hover:text-red-700 transition-colors whitespace-nowrap"
                      >
                          Eliminar Mes
                      </button>
                  </div>
              </div>

          </div>

          {/* TARJETA 2: CARGA RESOLUCIONES (INDEPENDIENTE) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
              <div className="flex items-center gap-3 mb-4">
                  <div className="bg-red-100 p-2 rounded-lg"><FileText className="text-red-600" size={24}/></div>
                  <h3 className="font-bold text-lg text-slate-700">Resoluciones (PDF)</h3>
              </div>
              <p className="text-sm text-slate-500 mb-6">Sube una resolución PDF. No requiere inventario previo.</p>

              <form onSubmit={handleUploadPdf} className="space-y-4">
                  {/* Input Serie */}
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre / Serie de Referencia</label>
                      <div className="relative">
                          <input 
                              type="text" 
                              placeholder="Ej: CNB123456" 
                              value={serial}
                              onChange={(e) => setSerial(e.target.value)}
                              className="w-full border border-slate-300 rounded-lg p-2.5 pl-9 outline-none focus:border-red-500"
                          />
                          <Search size={18} className="absolute left-3 top-2.5 text-slate-400"/>
                      </div>
                  </div>

                  {/* Input Archivo */}
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Archivo PDF</label>
                      <input 
                          id="pdfInput"
                          type="file" 
                          onChange={handlePdfChange} 
                          accept=".pdf" 
                          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer border border-slate-200 rounded-lg" 
                      />
                  </div>

                  <button type="submit" disabled={pdfLoading || !pdfFile || !serial} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 disabled:opacity-50 transition-all flex justify-center items-center gap-2">
                      {pdfLoading ? 'Subiendo...' : <><Upload size={20}/> Guardar Resolución</>}
                  </button>
              </form>

              {/* Mensajes del PDF */}
              {pdfMessage && (
                  <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${pdfMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {pdfMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                      <div className="text-sm font-medium">{pdfMessage.text}</div>
                  </div>
              )}
          </div>

      </div>
    </div>
  );
};

export default Import;