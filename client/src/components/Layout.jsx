import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Users,
  Building2,
  Printer,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
  Leaf,
} from "lucide-react";
import { useState } from "react";

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Recuperar datos del usuario logueado
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Definimos el menú de navegación
  const menuItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      path: "/usuarios",
      label: "Maestro Usuarios",
      icon: Users,
      role: "admin",
    }, // Solo admin
    { path: "/organizacion", label: "Maestro Organización", icon: Building2 },
    { path: "/impresoras", label: "Maestro Impresoras", icon: Printer },
    { path: "/importar", label: "Importación", icon: FileSpreadsheet },
    // NUEVO ENLACE MODULO 5:
    { path: "/consumption", label: "Consumo Periodo", icon: TrendingUp },
    // NUEVO ENLACE MODULO 6:
    { path: "/totals", label: "Totales Periodo", icon: BarChart3 },
    // NUEVO ENLACE MODULO 7:
    {
      path: "/org-prints",
      label: "Impresion por Departamento",
      icon: Building2,
    },
    // NUEVO ENLACE MODULO 8:
    { path: "/green-state", label: "Estado Verde", icon: Leaf },
    // NUEVO ENLACE MODULO 9:
    {
      path: "/pre-invoice",
      label: "Pre-Factura",
      icon: FileSpreadsheet,
      role: "admin",
    }, // Solo admin
    {
      path: "/invoice-history",
      label: "Historial Pre-Facturas",
      icon: FileSpreadsheet,
      active: location.pathname === "invoice-history",
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* --- --------------------------------------------------------------SIDEBAR (Barra Lateral) -------- ---------------------------------------------------------------------------------- */}
      <aside
        className={`${isSidebarOpen ? "w-64" : "w-20"} bg-slate-900 text-white transition-all duration-300 flex flex-col shadow-xl`}
      >
        {/* Logo / Título */}
        <div className="h-16 flex items-center justify-center border-b border-slate-700">
          {isSidebarOpen ? (
            <h1 className="text-xl font-bold text-accent tracking-wider">
              GESTIÓN TI
            </h1>
          ) : (
            <Printer className="text-accent w-8 h-8" />
          )}
        </div>

        {/* Menú de Navegación */}
        <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            // Validar rol (si el item requiere admin y el usuario no lo es, no lo mostramos)
            if (item.role && user.role !== item.role) return null;

            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-accent text-white shadow-lg shadow-blue-500/30"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-6 h-6 min-w-[24px]" />
                {isSidebarOpen && (
                  <span className="font-medium truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 flex flex-col items-center gap-4">
          <img
            src="/palacio-la-moneda-Cvh-FX3V.svg"
            alt="Palacio La Moneda"
            className="w-full max-w-xs mx-auto"
          />
        </div>

        {/* Footer del Sidebar (Botón Salir) */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-red-400 hover:text-red-300 transition-colors w-full px-2"
          >
            <LogOut className="w-6 h-6" />
            {isSidebarOpen && (
              <span className="font-medium">Cerrar Sesión</span>
            )}
          </button>
        </div>
      </aside>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Superior */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-10">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800">
                {user.full_name}
              </p>
              <p className="text-xs text-slate-500 capitalize">{user.role}</p>
            </div>
            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold">
              {user.username?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Área de Módulos (Aquí se renderizan las páginas) */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
