import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calculator, Save, AlertTriangle, FileText, DollarSign, Upload, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PreInvoice = () => {
    // --- ESTADOS ---
    const [billingDate, setBillingDate] = useState('2026-01-09');
    const [consumptionMonth, setConsumptionMonth] = useState('2025-01'); // Nuevo campo explícito
    const [dollarValue, setDollarValue] = useState(896.89);
    const [loadingDollar, setLoadingDollar] = useState(false);

    // Modo de cuota (Manual / Automático)
    const [isManualQuota, setIsManualQuota] = useState(false);
    const [manualQuotaValue, setManualQuotaValue] = useState(1);

    // Contadores traidos de BD
    const [consumption, setConsumption] = useState({ bw_e42540: 0, color_x57945: 0 });
    const [manualAdjustment, setManualAdjustment] = useState({ bw_e42540: 0, color_x57945: 0 });

    // Firma
    const [signerName, setSignerName] = useState('Nombre Firmante');
    const [signerRole, setSignerRole] = useState('Jefe de Operaciones');
    const [signatureFile, setSignatureFile] = useState(null);

    // HASH de seguridad (Solo una vez)
    const [securityHash] = useState(() => Math.random().toString(36).substring(7).toUpperCase());

    // Configuración Contrato
    const TOTAL_QUOTAS = 36;

    // --- CÁLCULOS AUXILIARES ---
    const getQuotaNumber = (currentDateStr) => {
        if (!currentDateStr) return 1;
        const [yearStr, monthStr] = currentDateStr.split('-');
        const currentYear = parseInt(yearStr, 10);
        const currentMonth = parseInt(monthStr, 10) - 1; // 0-based (0 = Enero)

        const startYear = 2024;
        const startMonth = 2; // 0-based (2 = Marzo)

        let months = (currentYear - startYear) * 12;
        months -= startMonth;
        months += currentMonth;

        return months + 1;
    };

    const calculatedQuota = getQuotaNumber(consumptionMonth);
    const currentQuota = isManualQuota ? (parseInt(manualQuotaValue, 10) || 1) : calculatedQuota;
    const showWarning = currentQuota >= 34;

    // Sincronizar el valor manual cuando cambia el automático
    useEffect(() => {
        if (!isManualQuota) {
            setManualQuotaValue(calculatedQuota);
        }
    }, [calculatedQuota, isManualQuota]);

    // --- 1. CARGAR DATOS DE IMPRESIÓN (Backend Local) ---
    useEffect(() => {
        const fetchConsumption = async () => {
            try {
                if (!consumptionMonth) return;
                const token = localStorage.getItem('token');
                const res = await axios.get(`http://localhost:3001/api/pre-invoices/consumption?date=${consumptionMonth}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setConsumption(res.data);
            } catch (error) {
                console.error("Error cargando consumos", error);
            }
        };
        fetchConsumption();
    }, [consumptionMonth]);

    // --- 2. CARGAR VALOR DÓLAR (API Externa) ---
    useEffect(() => {
        const fetchDollar = async () => {
            if (!billingDate) return;

            setLoadingDollar(true);
            try {
                const [year, month, day] = billingDate.split('-');
                const formattedDate = `${day}-${month}-${year}`;

                const response = await axios.get(`https://mindicador.cl/api/dolar/${formattedDate}`);

                if (response.data.serie && response.data.serie.length > 0) {
                    setDollarValue(response.data.serie[0].valor);
                } else {
                    console.log("No hay valor dólar para este día.");
                }
            } catch (error) {
                console.error("Error obteniendo dólar:", error);
            } finally {
                setLoadingDollar(false);
            }
        };

        fetchDollar();
    }, [billingDate]);


    // ------------------------------------------------------------------------------------------ CÁLCULOS MONETARIOS ------------------------------------------------------------------------------------------
    const var_e42540_price = 0.00902;
    const var_x57945_price = 0.03805;

    const effectiveBw = consumption.bw_e42540 + (manualAdjustment.bw_e42540 || 0);
    const effectiveColor = consumption.color_x57945 + (manualAdjustment.color_x57945 || 0);

    const var_e42540_costUSD = effectiveBw * var_e42540_price;
    const var_x57945_costUSD = effectiveColor * var_x57945_price;
    const total_var_costUSD = var_e42540_costUSD + var_x57945_costUSD;

    const fixed_items = [
        { model: 'E42540F', qty: 83, price: 17.03 },
        { model: 'X57945dn', qty: 26, price: 45.74 },
        { model: 'X57945dn (2 Bandejas)', qty: 2, price: 50.24 },
    ];

    const total_fixed_costUSD = fixed_items.reduce((acc, item) => acc + (item.qty * item.price), 0);
    const total_net_usd = total_var_costUSD + total_fixed_costUSD;

    const calcPeso = (usd) => Math.round(usd * (dollarValue || 0));

    const total_net_peso = calcPeso(total_net_usd);
    const total_iva = Math.round(total_net_peso * 0.19);
    const total_final = total_net_peso + total_iva;

    // --- GUARDAR ---
    const handleSave = async () => {
        if (!signatureFile) return alert('Debe subir la imagen de la firma');

        const electronicSignature = `Firmado electrónicamente por: ${signerName}\nCargo: ${signerRole}\nDepartamento: TI\nServicio: Gestión Impresión\nFecha: ${new Date().toLocaleString('es-CL')}`;

        const formData = new FormData();
        formData.append('billing_date', billingDate);
        formData.append('contract_month', currentQuota);
        formData.append('dollar_value', dollarValue);
        formData.append('total_net_peso', total_net_peso);
        formData.append('total_iva', total_iva);
        formData.append('total_final', total_final);
        formData.append('approved_by_name', signerName);
        formData.append('signature', signatureFile);
        formData.append('electronic_signature_data', electronicSignature);
        formData.append('details_snapshot', JSON.stringify({ consumption, manualAdjustment, fixed_items }));

        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:3001/api/pre-invoices', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            alert('PreFactura guardada exitosamente');
        } catch (error) {
            alert('Error al guardar');
            console.error(error);
        }
    };

    return (
        <div className="space-y-8 pb-20">
            {/* ENCABEZADO */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-blue-600" /> Módulo 9: PreFactura
                    </h2>
                    <p className="text-slate-500 text-sm">Cálculo de costos de arriendo mensual.</p>
                </div>

                {/* ********************************************************************ALERTA TERMINO DE CONTRATO ****************************************************************************/}
                {showWarning && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3 animate-pulse">
                        <AlertTriangle size={24} />
                        <div>
                            <p className="font-bold">¡ALERTA DE TÉRMINO DE CONTRATO!</p>
                            <p className="text-xs">Faltan {36 - currentQuota} meses. Opción de sumar más meses habilitada.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* CONFIGURACIÓN MENSUAL */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* 0. PERIODO A FACTURAR (CONSUMO) */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mes de Consumo</label>
                    <input
                        type="month"
                        value={consumptionMonth}
                        onChange={e => setConsumptionMonth(e.target.value)}
                        className="w-full border border-indigo-200 bg-indigo-50 p-2 rounded-lg font-bold text-slate-700 focus:border-indigo-500 outline-none transition-colors"
                        title="Selecciona el mes del que calcularás las impresiones"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Mes de impresiones a cobrar</p>
                </div>

                {/* 1. SELECCIÓN DE FECHA (CALENDARIO) */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Día de Facturación</label>
                    <input
                        type="date"
                        value={billingDate}
                        onChange={e => setBillingDate(e.target.value)}
                        className="w-full border border-blue-200 bg-blue-50 p-2 rounded-lg font-bold text-slate-700 focus:border-blue-500 outline-none transition-colors"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Obtiene UF/Dólar y define fecha emisión</p>
                </div>

                {/* 2. CUOTA */}
                <div>
                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-1">
                        <label>N° Cuota</label>
                        <label className="flex items-center gap-1 cursor-pointer text-blue-600 hover:text-blue-800">
                            <input
                                type="checkbox"
                                checked={isManualQuota}
                                onChange={e => setIsManualQuota(e.target.checked)}
                                className="cursor-pointer"
                            />
                            Manual
                        </label>
                    </div>
                    {isManualQuota ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={manualQuotaValue}
                                onChange={e => setManualQuotaValue(e.target.value)}
                                className={`w-full border p-2 rounded-lg font-bold outline-none ${showWarning ? 'bg-red-50 text-red-700 border-red-300 focus:border-red-500' : 'bg-white text-slate-700 border-slate-300 focus:border-blue-500'}`}
                                min="1"
                            />
                            <span className="text-slate-500 font-bold text-sm whitespace-nowrap">DE {TOTAL_QUOTAS}</span>
                        </div>
                    ) : (
                        <div className={`p-2 rounded-lg font-bold border transition-colors ${showWarning ? 'bg-red-100 text-red-700 border-red-300' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {currentQuota} DE {TOTAL_QUOTAS}
                        </div>
                    )}
                </div>

                {/* 3. VALOR DÓLAR (AUTOMÁTICO) */}
                <div>
                    {/*  */}
                    <label className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-1">
                        <span>Valor Dólar</span>
                        {loadingDollar && <span className="text-blue-500 flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Buscando...</span>}
                    </label>
                    <div className="relative">
                        <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input
                            type="number"
                            value={dollarValue}
                            onChange={e => setDollarValue(e.target.value)}
                            className={`w-full border p-2 pl-8 rounded-lg font-bold transition-all ${loadingDollar ? 'bg-slate-100 text-slate-400' : 'bg-white text-green-700 border-green-200 focus:border-green-500'}`}
                            step="0.01"
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                        {loadingDollar ? 'Consultando API...' : 'Valor obtenido de API externa para la fecha seleccionada.'}
                    </p>
                </div>
            </div>

            {/* TABLA 1: COSTO VARIABLE */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2">
                    <Calculator size={18} className="text-blue-500" /> Costo Variable
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-3">Modelo</th>
                            <th className="p-3 text-right">Valor Copia (USD)</th>
                            <th className="p-3 text-right">N° Copias (BD + Ajuste)</th>
                            <th className="p-3 text-right">Costo USD</th>
                            <th className="p-3 text-right bg-blue-50 text-blue-800">Costo Neto Peso</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        <tr>
                            <td className="p-3">E42540F (Mono)</td>
                            <td className="p-3 text-right">{var_e42540_price}</td>
                            <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <span className="text-slate-500" title="Valor BD">{consumption.bw_e42540.toLocaleString()}</span>
                                    <input
                                        type="number"
                                        value={manualAdjustment.bw_e42540}
                                        onChange={e => setManualAdjustment({ ...manualAdjustment, bw_e42540: Number(e.target.value) })}
                                        className="w-20 border border-slate-300 rounded p-1 text-right text-xs"
                                        title="Ajuste manual (+/-)"
                                    />
                                    <span className="font-bold">{effectiveBw.toLocaleString()}</span>
                                </div>
                            </td>
                            <td className="p-3 text-right">{var_e42540_costUSD.toFixed(7)}</td>
                            <td className="p-3 text-right font-bold bg-blue-50/50 text-blue-900">$ {calcPeso(var_e42540_costUSD).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td className="p-3">X57945dn (Color)</td>
                            <td className="p-3 text-right">{var_x57945_price}</td>
                            <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <span className="text-slate-500" title="Valor BD">{consumption.color_x57945.toLocaleString()}</span>
                                    <input
                                        type="number"
                                        value={manualAdjustment.color_x57945}
                                        onChange={e => setManualAdjustment({ ...manualAdjustment, color_x57945: Number(e.target.value) })}
                                        className="w-20 border border-slate-300 rounded p-1 text-right text-xs"
                                        title="Ajuste manual (+/-)"
                                    />
                                    <span className="font-bold">{effectiveColor.toLocaleString()}</span>
                                </div>
                            </td>
                            <td className="p-3 text-right">{var_x57945_costUSD.toFixed(7)}</td>
                            <td className="p-3 text-right font-bold bg-blue-50/50 text-blue-900">$ {calcPeso(var_x57945_costUSD).toLocaleString()}</td>
                        </tr>
                        <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                            <td className="p-3 text-right" colSpan="2">TOTAL VARIABLE</td>
                            <td className="p-3 text-right">{(effectiveBw + effectiveColor).toLocaleString()}</td>
                            <td className="p-3 text-right">{total_var_costUSD.toFixed(7)}</td>
                            <td className="p-3 text-right text-blue-900">$ {calcPeso(total_var_costUSD).toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* TABLA 2: COSTO FIJO */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2">
                    <DollarSign size={18} className="text-blue-500" /> Costo Fijo
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-3">Modelo</th>
                            <th className="p-3 text-center">Cantidad</th>
                            <th className="p-3 text-right">Renta Unitaria (USD)</th>
                            <th className="p-3 text-right">Costo USD</th>
                            <th className="p-3 text-right bg-blue-50 text-blue-800">Costo Neto Peso</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {fixed_items.map((item, idx) => {
                            const cost = item.qty * item.price;
                            return (
                                <tr key={idx}>
                                    <td className="p-3">{item.model}</td>
                                    <td className="p-3 text-center">{item.qty}</td>
                                    <td className="p-3 text-right">{item.price}</td>
                                    <td className="p-3 text-right">{cost.toFixed(2)}</td>
                                    <td className="p-3 text-right font-bold bg-blue-50/50 text-blue-900">$ {calcPeso(cost).toLocaleString()}</td>
                                </tr>
                            )
                        })}
                        <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                            <td className="p-3 text-right" colSpan="3">TOTAL FIJO</td>
                            <td className="p-3 text-right">{total_fixed_costUSD.toFixed(2)}</td>
                            <td className="p-3 text-right text-blue-900">$ {calcPeso(total_fixed_costUSD).toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* TABLA 3: COSTO TOTAL MES */}
            <div className="flex justify-end">
                <div className="bg-slate-800 text-white rounded-xl shadow-lg p-6 w-full md:w-1/2 lg:w-1/3">
                    <h3 className="text-lg font-bold mb-4 border-b border-slate-600 pb-2 uppercase tracking-wider">Costo Total Mes</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Fecha:</span>
                            <span className="font-mono">{format(new Date(billingDate), 'MMM-yy', { locale: es }).toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Costo NETO:</span>
                            <span className="font-bold text-lg">$ {total_net_peso.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">IVA (19%):</span>
                            <span className="font-bold text-lg text-slate-300">$ {total_iva.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pt-4 border-t border-slate-600">
                            <span className="font-bold text-xl text-green-400">TOTAL A PAGAR:</span>
                            <span className="font-black text-2xl text-green-400">$ {total_final.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN APROBACIÓN Y FIRMA */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">Aprobación y Firma</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Formulario Datos Firmante */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Aprobado Por</label>
                            <input type="text" value={signerName} onChange={e => setSignerName(e.target.value)} className="w-full border p-2 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cargo</label>
                            <input type="text" value={signerRole} onChange={e => setSignerRole(e.target.value)} className="w-full border p-2 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Imagen de Firma (JPG)</label>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 cursor-pointer relative">
                                <input type="file" accept="image/jpeg, image/png" onChange={e => setSignatureFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="text-slate-400" />
                                    <span className="text-xs text-slate-600">{signatureFile ? signatureFile.name : "Subir Firma"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* *************************************************************************Previsualización Firma Electrónica *****************************************************************/}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col items-center justify-center text-center">
                        <div className="mb-4 h-20 flex items-center justify-center">
                            {signatureFile ? (
                                <img src={URL.createObjectURL(signatureFile)} alt="Firma" className="max-h-full object-contain mix-blend-multiply" />
                            ) : (
                                <span className="text-slate-300 italic">Vista previa imagen firma</span>
                            )}
                        </div>
                        <div className="text-xs font-mono text-slate-600 border-t border-slate-300 pt-2 w-full">
                            <p className="font-bold">FIRMADO ELECTRÓNICAMENTE</p>
                            <p>Nombre: {signerName}</p>
                            <p>Cargo: {signerRole}</p>
                            <p>Departamento: Tecnologia de la Informacion y la Comunicacion</p>
                            <p>Fecha: {new Date().toLocaleString('es-CL')}</p>
                            <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-widest">{securityHash}-HASH-SECURE</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-200 transition-all">
                        <Save size={20} /> Guardar PreFactura
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PreInvoice;