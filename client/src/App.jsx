import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Importación de Componentes y Páginas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Organization from './pages/Organization';
import Printers from './pages/Printers';
import Import from './pages/Import'; 
import Consumption from './pages/Consumption';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import TotalPrints from './pages/TotalPrints';
import OrgPrints from './pages/OrgPrints';
import GreenState from './pages/GreenState';
import PreInvoice from './pages/PreInvoice';
import InvoiceHistory from './pages/InvoiceHistory';

function App() {
  return (
    <BrowserRouter>
      {/* Notificaciones globales */}
      <Toaster position="top-right" />
      
      <Routes>
        {/* Redirección inicial */}
        <Route path="/" element={<Navigate to="/login" />} />
        
        {/* Ruta pública */}
        <Route path="/login" element={<Login />} />

        {/* Rutas Protegidas (Requieren Login) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            {/* Aquí se cargan los módulos dentro del Layout */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/usuarios" element={<Users />} />
            <Route path="/organizacion" element={<Organization />} />
            <Route path="/impresoras" element={<Printers />} />
            {/* MODULO 5: RUTA CONSUMO */}
            <Route path="/consumption" element={<Consumption/>} />
            {/* MODULO 6: RUTA TOTALES MENSUALES */}
            <Route path="/totals" element={<TotalPrints/>} />
            {/* 2. USAMOS EL COMPONENTE IMPORT */}
            <Route path="/importar" element={<Import />} />
            {/* NUEVA RUTA MODULO 7 */}
            <Route path="/org-prints" element={<OrgPrints/>} />
            {/* NUEVA RUTA MODULO 8 */}
            <Route path="/green-state" element={<GreenState/>} />
            {/* NUEVA RUTA MODULO 9: PRE-FACTURA */}
            <Route path="/pre-invoice" element={<PreInvoice/>} />
            {/* NUEVA RUTA MODULO 9: HISTORIAL PRE-FACTURA */}
            <Route path="/invoice-history" element={<InvoiceHistory />} />
          </Route>
        </Route>
        
        {/* Ruta para capturar errores 404 (Página no encontrada) */}
        <Route path="*" element={<div className="text-center mt-20">Página no encontrada (404)</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;