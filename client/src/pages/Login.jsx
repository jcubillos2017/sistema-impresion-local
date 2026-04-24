import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { Printer, Lock, User, ArrowRight } from "lucide-react"; // Iconos modernos

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);

  // Manejar cambios en los inputs
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Enviar formulario al Backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Conexión real con tu Backend
      const response = await axios.post(
        "http://localhost:3001/api/auth/login",
        formData,
      );

      // Si llegamos aquí, el login fue exitoso
      const { token, user } = response.data;

      // Guardamos la "Llave" en el navegador
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      toast.success(`¡Bienvenido, ${user.full_name}!`);

      // Redirigir al Dashboard
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      const msg =
        error.response?.data?.message || "Error al conectar con el servidor";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Tarjeta del Login */}
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl transform transition-all hover:scale-[1.01]">
        {/* Encabezado con Icono */}
        <div className="text-center mb-8">
          <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Printer className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800">Inicia Sesión</h2>
          <p className="text-slate-500 text-sm mt-2">
            Sistema de Gestión de Impresoras
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input Usuario */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              name="username"
              required
              placeholder="Nombre de Usuario"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-gray-700 bg-gray-50 focus:bg-white focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
              onChange={handleChange}
            />
          </div>

          {/* Input Contraseña */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              name="password"
              required
              placeholder="Contraseña"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-gray-700 bg-gray-50 focus:bg-white focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
              onChange={handleChange}
            />
          </div>

          {/* Botón de Acción */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              "Validando..."
            ) : (
              <>
                Ingresar al Sistema <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          Versión 2.0.0 &copy; 2026 Gestión TI
        </div>
        
      </div>
      {/* --- FOOTER (PEGADO AL BORDE INFERIOR) --- */}
      <footer className="absolute bottom-6 w-full text-center z-10">
        <p className="text-slate-400 text-xs font-medium">
          &copy; {new Date().getFullYear()} Sistema de Gestión de Impresión.
        </p>
        <div className="flex justify-center gap-4 mt-2 text-[10px] text-slate-400/60 uppercase tracking-widest font-bold">
            <span>Presidencia de la Republica</span>
            <span>•</span>
            <span>Departamento de Tecnolagia de la Informacion y la Comunicacion</span>
            <span>•</span>
            <span>Subdepartamento de operaciones y Soporte</span>
            <span>•</span>
            <span>v1.0.2</span>
        </div>
      </footer>
    </div>
  );
};

export default Login;
