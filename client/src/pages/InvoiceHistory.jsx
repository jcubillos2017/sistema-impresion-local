import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Eye, X, CheckCircle, Trash2, EyeClosed, EyeClosedIcon, ScanEye } from 'lucide-react'; // Asegúrate de tener Trash2 aquí
import { format } from 'date-fns';

const InvoiceHistory = () => {
    const [invoices, setInvoices] = useState([]);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    //---------------------------------------------------------------------- Cargar Historial-------

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('http://localhost:3001/api/pre-invoices', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setInvoices(res.data);
            } catch (error) {
                console.error("Error cargando historial", error);
            }
        };

        fetchHistory();
    }, []);

    // --- LÓGICA ELIMINAR (Esta es la función que daba el error) ---
    const handleDelete = async (id, e) => {
        e.stopPropagation(); // Evita que se abra el modal al hacer click en borrar

        if (!window.confirm("¿Estás seguro de eliminar esta PreFactura? Esta acción no se puede deshacer.")) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:3001/api/pre-invoices/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Actualizar lista visualmente sin recargar
            setInvoices(invoices.filter(inv => inv.id !== id));
            alert("PreFactura eliminada.");
        } catch (error) {
            console.error(error);
            alert("Error al eliminar.");
        }
    };

    // Calcular totales acumulados
    const totalNeto = invoices.reduce((acc, inv) => acc + (Number(inv.total_net_peso) || 0), 0);
    const totalIva = invoices.reduce((acc, inv) => acc + (Number(inv.total_iva) || 0), 0);
    const totalFinal = invoices.reduce((acc, inv) => acc + (Number(inv.total_final) || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="text-indigo-600" /> Historial de PreFacturas
                </h2>

                <div className="flex flex-wrap gap-6 md:gap-8 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase">Neto Acumulado</p>
                        <p className="text-lg font-mono font-bold text-slate-700">$ {totalNeto.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase">IVA Acumulado</p>
                        <p className="text-lg font-mono font-bold text-slate-700">$ {totalIva.toLocaleString()}</p>
                    </div>
                    <div className="text-right border-l-2 border-slate-200 pl-6 md:pl-8">
                        <p className="text-xs font-bold text-slate-400 uppercase">Total Acumulado</p>
                        <p className="text-xl font-mono font-bold text-green-600">$ {totalFinal.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* TABLA DE RESUMEN */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Fecha Facturación</th>
                            <th className="p-4">N° Cuota</th>
                            <th className="p-4">Aprobado Por</th>
                            <th className="p-4 text-right">Valor Dólar</th>
                            <th className="p-4 text-right">Total a Pagar</th>
                            <th className="p-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {invoices.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-slate-400">No hay prefacturas guardadas aún.</td></tr>
                        ) : (
                            invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-medium text-slate-700">
                                        {format(
                                            new Date(
                                                new Date(inv.billing_date).getTime() + 
                                                new Date(inv.billing_date).getTimezoneOffset() * 60000
                                            ), 
                                            'dd-MM-yyyy'
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-blue-100 text-blue-700 py-1 px-3 rounded-full text-xs font-bold">
                                            Cuota {inv.contract_month}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-600">{inv.approved_by_name}</td>
                                    <td className="p-4 text-right font-mono">$ {inv.dollar_value}</td>
                                    <td className="p-4 text-right font-bold text-green-600">$ {inv.total_final.toLocaleString()}</td>

                                    {/* BOTONES DE ACCIÓN */}
                                    <td className="p-4 text-center flex justify-center gap-2">
                                        <button
                                            onClick={() => setSelectedInvoice(inv)}
                                            className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 p-2 rounded-lg hover:bg-indigo-100 transition-all"
                                            title="Ver Detalle"
                                        >
                                            <Eye size={18} />
                                        </button>

                                        {/* --- AQUÍ SE USA LA FUNCIÓN --- */}
                                        <button
                                            onClick={(e) => handleDelete(inv.id, e)}
                                            className="text-red-600 hover:text-red-800 bg-red-50 p-2 rounded-lg hover:bg-red-100 transition-all"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL DE DETALLE */}
            {selectedInvoice && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                        {/* Header Modal */}
                        <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <CheckCircle size={20} className="text-green-400" />
                                Detalle PreFactura #{selectedInvoice.id}
                            </h3>
                            <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Body Modal */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[80vh] overflow-y-auto">

                            {/* Columna Izquierda: Datos */}
                            <div className="space-y-4 text-sm">
                                <div>
                                    <p className="text-slate-400 text-xs uppercase font-bold">Fecha de Facturación</p>
                                    <p className="font-medium text-lg">
                                        {format(
                                            new Date(
                                                new Date(selectedInvoice.billing_date).getTime() + 
                                                new Date(selectedInvoice.billing_date).getTimezoneOffset() * 60000
                                            ), 
                                            'dd MMMM yyyy'
                                        )}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-slate-400 text-xs uppercase font-bold">Valor Dólar</p>
                                        <p className="font-mono">$ {selectedInvoice.dollar_value}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-xs uppercase font-bold">Cuota Contrato</p>
                                        <p className="font-mono">{selectedInvoice.contract_month} / 36</p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-slate-500">Neto:</span>
                                        <span className="font-medium">$ {selectedInvoice.total_net_peso.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-slate-500">IVA:</span>
                                        <span className="font-medium">$ {selectedInvoice.total_iva.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between mt-2 pt-2 border-t border-slate-200 text-lg font-bold text-slate-800">
                                        <span>TOTAL:</span>
                                        <span className="text-green-600">$ {selectedInvoice.total_final.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Columna Derecha: Firma */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-4">Firma Digital</p>

                                {selectedInvoice.approved_by_signature_path ? (
                                    <div className="bg-white p-2 border border-slate-200 rounded mb-4 w-full h-32 flex items-center justify-center">
                                        <img
                                            src={`http://localhost:3001/uploads/${selectedInvoice.approved_by_signature_path}`}
                                            alt="Firma"
                                            className="max-h-full max-w-full object-contain mix-blend-multiply"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-32 flex items-center justify-center text-slate-300 italic">Sin imagen</div>
                                )}

                                <div className="text-[10px] text-slate-500 font-mono bg-white p-2 rounded border border-slate-200 w-full text-left whitespace-pre-wrap leading-tight">
                                    {selectedInvoice.electronic_signature_data.replace('Departamento: TI', 'Departamento: TIC')}
                                    {/*selectedInvoice.electronic_signature_data*/}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceHistory;