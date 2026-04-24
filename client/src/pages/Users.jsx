import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Shield, User as UserIcon, X, Mail } from 'lucide-react';

const Users = () => {
  // Estados
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Estado del formulario
  // CAMBIO: Adaptado a 'name' y 'email' para coincidir con el Backend
  const initialForm = { id: null, full_name: '', username: '', password: '', role: 'user', is_active: true };
  const [formData, setFormData] = useState(initialForm);

  // Obtener rol del usuario actual para saber si mostrar botones
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.role === 'admin';

  // Configuración de Axios con Token
  const api = axios.create({
    baseURL: 'http://localhost:3001/api',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

   
  // 1. Cargar Usuarios
  const fetchUsers = async () => {
    try {
      // Hacemos la petición directamente
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:3001/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  // 2. El useEffect debe tener un array vacío [] para que solo se ejecute UNA VEZ al abrir la pantalla
  useEffect(() => {
    fetchUsers();
  }, []); // <--- EL ARRAY VACÍO ES LA CLAVE PARA DETENER EL BUCLE
  
  //const fetchUsers = useCallback(async () => {
  //  try {
  //    const res = await api.get('/users');
  //    setUsers(res.data);
  //  } catch (error) {
  //    console.error(error);
  //    toast.error('Error al cargar usuarios');
  //  } finally {
  //    setLoading(false);
  //  }
  //}, [api]);

  //useEffect(() => {
  //  fetchUsers();
  //}, [fetchUsers]);

  // 2. Manejar Formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/users/${formData.id}`, formData);
        toast.success('Usuario actualizado');
      } else {
        await api.post('/users', formData);
        toast.success('Usuario creado');
      }
      setShowModal(false);
      fetchUsers(); // Recargar tabla
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error en la operación');
    }
  };

  // 3. Eliminar
  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Usuario eliminado');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo eliminar');
    }
  };

  // Abrir Modal
  const openModal = (user = null) => {
    if (user) {
      setFormData({ ...user, password: '' }); // No mostramos la password actual
      setIsEditing(true);
    } else {
      setFormData(initialForm);
      setIsEditing(false);
    }
    setShowModal(true);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando usuarios...</div>;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Maestro de Usuarios</h2>
          <p className="text-slate-500 text-sm">Gestiona el acceso al sistema</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => openModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/30"
          >
            <Plus size={20} /> Nuevo Usuario
          </button>
        )}
      </div>

      {/* Tabla Aerodinámica */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="p-4 font-semibold text-slate-600">Nombre Completo</th>
              <th className="p-4 font-semibold text-slate-600">username / Usuario</th>
              <th className="p-4 font-semibold text-slate-600">Rol</th>
              <th className="p-4 font-semibold text-slate-600">Estado</th>
              {isAdmin && <th className="p-4 font-semibold text-slate-600 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <UserIcon size={16} />
                  </div>
                  {/* CAMBIO: 'name' en lugar de 'full_name' */}
                  <span className="font-medium text-slate-700">{user.full_name}</span>
                </td>
                {/* CAMBIO: 'email' en lugar de 'username' */}
                <td className="p-4 text-slate-500">{user.username}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {user.role === 'admin' ? <Shield size={12} /> : <UserIcon size={12} />}
                    {user.role.toUpperCase()}
                  </span>
                </td>
                <td className="p-4">
                  {/* Nota: Backend actual no tiene is_active, mostramos ACTIVO por defecto para no romper diseño */}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.is_active !== false ? 'ACTIVO' : 'BLOQUEADO'}
                  </span>
                </td>
                {isAdmin && (
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => openModal(user)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(user.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL (Formulario Flotante) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">
                {isEditing ? 'Editar Usuario' : 'Crear Usuario'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                <div className="relative">
                    <UserIcon size={16} className="absolute left-3 top-3 text-slate-400"/>
                    <input 
                    type="text" 
                    className="w-full p-2 pl-9 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.full_name} // CAMBIO: name
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                    required 
                    />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">username</label>
                  <div className="relative">
                      <Mail size={16} className="absolute left-3 top-3 text-slate-400"/>
                      <input 
                        type="usermane" 
                        className="w-full p-2 pl-9 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.username} // CAMBIO: email
                        onChange={e => setFormData({...formData, username: e.target.value})}
                        required 
                        // Permitimos editar email si se desea, o puedes poner disabled={isEditing}
                      />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {isEditing ? 'Nueva Contraseña' : 'Contraseña'}
                  </label>
                  <input 
                    type="password" 
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    required={!isEditing} 
                    placeholder={isEditing ? "(Opcional)" : "******"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                  <select 
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="user">Usuario (Lectura)</option>
                    <option value="admin">Administrador (Total)</option>
                  </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                    <select 
                      className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      value={formData.is_active}
                      onChange={e => setFormData({...formData, is_active: e.target.value === 'true'})}
                    >
                      <option value="true">Activo</option>
                      <option value="false">Bloqueado</option>
                    </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/30"
                >
                  {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;