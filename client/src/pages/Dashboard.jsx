import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { Printer, Droplets, FileText, TrendingUp, Calendar, List, Layers, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const Dashboard = () => {
  // --- ESTADOS ---
  const [loading, setLoading] = useState(true);
  
  // Datos Crudos (Toda la base de datos)
  const [allPrints, setAllPrints] = useState([]);
  
  // Estado del Filtro
  const [selectedPeriod, setSelectedPeriod] = useState(''); // Se llenará con el último mes automáticamente
  const [availablePeriods, setAvailablePeriods] = useState([]);

  const API_URL = 'http://localhost:3001/api/prints';
  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  // 1. CARGA INICIAL
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(API_URL, getAuthHeaders());
        setAllPrints(res.data);
        
        // Extraer periodos únicos (YYYY-MM) y ordenarlos (más reciente primero)
        const periods = [...new Set(res.data.map(item => item.period_date.substring(0, 7)))];
        periods.sort((a, b) => b.localeCompare(a));
        
        setAvailablePeriods(periods);
        
        // Seleccionar por defecto el mes más reciente
        if (periods.length > 0) {
          setSelectedPeriod(periods[0]);
        }
        
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. PROCESAMIENTO REACTIVO (Se ejecuta al cambiar el filtro)
  const { stats, chartData, modelStats } = useMemo(() => {
    if (allPrints.length === 0 || !selectedPeriod) {
      return { stats: { total: 0 }, chartData: [], modelStats: [] };
    }

    // A. FILTRADO POR EL MES SELECCIONADO
    const filteredData = allPrints.filter(item => item.period_date.startsWith(selectedPeriod));

    // B. CÁLCULO DE ESTADÍSTICAS
    let totalGlobal = 0;
    const modelMap = {}; 

    filteredData.forEach(item => {
      totalGlobal += item.total_pages;

      // Agrupar por Modelo (Para Tarjetas y Tabla)
      const pModel = item.Printer ? item.Printer.model : 'Desconocido';
      if (!modelMap[pModel]) {
        modelMap[pModel] = { 
          model: pModel, 
          total: 0, 
          color: 0, 
          bn: 0,
          duplex: 0, // Nuevo campo
          simple: 0  // Nuevo campo
        };
      }
      modelMap[pModel].total += item.total_pages;
      modelMap[pModel].color += item.color_pages;
      modelMap[pModel].bn += item.bw_pages;
      modelMap[pModel].duplex += item.duplex_pages; // Sumamos Duplex
      modelMap[pModel].simple += item.simple_pages; // Sumamos Simple
    });

    // C. GRÁFICO DE TENDENCIA (Usamos TODO el histórico, no solo el filtrado)
    const monthMap = {};
    allPrints.forEach(item => {
        const dateKey = item.period_date.substring(0, 7);
        if (!monthMap[dateKey]) monthMap[dateKey] = { name: dateKey, Total: 0 };
        monthMap[dateKey].Total += item.total_pages;
    });

    const chartArray = Object.values(monthMap)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(item => ({
        ...item,
        formattedDate: format(parseISO(item.name + '-01'), 'MMMM yyyy', { locale: es })
      }));

    // Ordenar Modelos por consumo total
    const modelsArray = Object.values(modelMap).sort((a, b) => b.total - a.total);

    return {
      stats: { total: totalGlobal },
      chartData: chartArray,
      modelStats: modelsArray
    };

  }, [allPrints, selectedPeriod]);

  // --- COMPONENTE TARJETA ---
  const StatCard = ({ title, value, icon, color, subtext, subtext2 }) => {
    const Icon = icon;
    const colorStyles = {
      purple: { bgIcon: 'bg-purple-50', textIcon: 'text-purple-600' },
      blue: { bgIcon: 'bg-blue-50', textIcon: 'text-blue-600' },
      emerald: { bgIcon: 'bg-emerald-50', textIcon: 'text-emerald-600' },
      slate: { bgIcon: 'bg-slate-100', textIcon: 'text-slate-600' },
    };
    const style = colorStyles[color] || colorStyles.slate;

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between min-w-[240px]">
        <div className="flex-1">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wide mb-1 truncate max-w-[180px]" title={title}>
            {title}
          </p>
          <h3 className="text-2xl font-bold text-slate-800">{value.toLocaleString()}</h3>
          
          {/* LÍNEAS DE DETALLE (Color/BN y Duplex/Simple) */}
          <div className="mt-3 text-xs font-medium space-y-1 border-t border-slate-50 pt-2">
             {subtext && <p className="text-slate-500">{subtext}</p>}
             {subtext2 && <p className="text-slate-500">{subtext2}</p>}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${style.bgIcon} ${style.textIcon} ml-4`}>
          <Icon size={24} />
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-10 text-center text-slate-400">Cargando dashboard...</div>;

  return (
    <div className="space-y-6">
      
      {/* CABECERA Y FILTRO */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Panel de Control</h2>
          <p className="text-slate-500 text-sm">Resumen de producción detallado</p>
        </div>

        {/* SELECTOR DE PERIODO */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
            <div className="pl-2 text-slate-400">
                <Calendar size={18} />
            </div>
            <select 
                className="bg-transparent text-sm font-bold text-slate-700 outline-none p-1 cursor-pointer min-w-[150px]"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
            >
                {availablePeriods.map(period => (
                    <option key={period} value={period}>
                        {format(parseISO(period + '-01'), 'MMMM yyyy', { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
                    </option>
                ))}
            </select>
        </div>
      </div>

      {/* 1. SECCIÓN TARJETAS POR MODELO (Detalle Completo) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {/* Tarjeta Total Global */}
        <StatCard 
          title="TOTAL PERIODO" 
          value={stats.total} 
          icon={Layers} 
          color="emerald" 
          subtext="Volumen total mensual"
        />

        {/* Tarjetas Dinámicas por Modelo */}
        {modelStats.map((model, idx) => {
          const hasColor = model.color > 0;
          return (
            <StatCard 
              key={idx}
              title={model.model} 
              value={model.total} 
              icon={hasColor ? Droplets : Printer} 
              color={hasColor ? 'purple' : 'blue'}
              // LINEA 1: Desglose por TIPO
              subtext={
                <span className="flex justify-between w-full gap-2">
                    <span>Color: <b>{model.color.toLocaleString()}</b></span>
                    <span>B/N: <b>{model.bn.toLocaleString()}</b></span>
                </span>
              }
              // LINEA 2: Desglose por MODO (Duplex/Simple)
              subtext2={
                 <span className="flex justify-between w-full gap-2 text-slate-400">
                    <span>Duplex: {model.duplex.toLocaleString()}</span>
                    <span>Simple: {model.simple.toLocaleString()}</span>
                </span>
              }
            />
          );
        })}
      </div>

      {/* 2. GRÁFICOS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Comparativa Vertical (Solo mes seleccionado) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500" /> Distribución del Mes
          </h3>
          <div className="h-80">
            {modelStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelStats} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="model" type="category" width={90} style={{ fontSize: '10px' }} tickFormatter={(val) => val.substring(0, 12) + '...'} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="color" name="Color" stackId="a" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={20} />
                  <Bar dataKey="bn" name="B/N" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400">Sin datos</div>}
          </div>
        </div>

        {/* Gráfico de Tendencia (Histórico Completo) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
             <TrendingUp size={20} className="text-blue-500" /> Evolución Histórica
          </h3>
          <div className="h-80">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="formattedDate" style={{ fontSize: '10px' }} />
                  <YAxis style={{ fontSize: '10px' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="Total" stroke="#3b82f6" fill="url(#colorTotal)" />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. TABLA DETALLADA */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                <List size={20} className="text-slate-500" /> Detalle Numérico del Mes
            </h3>
        </div>
        <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                    <th className="p-4 font-semibold">Modelo</th>
                    <th className="p-4 font-semibold text-right text-purple-600">Color</th>
                    <th className="p-4 font-semibold text-right text-blue-600">B/N</th>
                    <th className="p-4 font-semibold text-right text-slate-600">Duplex</th>
                    <th className="p-4 font-semibold text-right text-slate-600">Simple</th>
                    <th className="p-4 font-semibold text-right">Total</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
                {modelStats.map((model, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-medium text-slate-700">{model.model}</td>
                        <td className="p-4 text-right font-mono text-purple-700 bg-purple-50/30">
                            {model.color.toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-mono text-blue-700 bg-blue-50/30">
                            {model.bn.toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-600">
                            {model.duplex.toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-600">
                            {model.simple.toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-bold text-slate-800">
                            {model.total.toLocaleString()}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;