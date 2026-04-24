# 🖨️ Sistema de Gestión de Impresión (PrintManager)

Sistema integral para la administración, monitoreo y auditoría de flotas de impresoras corporativas. Permite la gestión de inventario, estructura organizacional y la importación masiva de contadores mensuales para análisis de uso.

## 🚀 Características Principales

Actualmente, el sistema cuenta con los siguientes módulos estables:

* **📊 Dashboard Interactivo:** Visualización de KPIs globales, gráficos de tendencia histórica y distribución de impresión (Color/BN).
* **🔐 Autenticación y Seguridad:** Login seguro con JWT (JSON Web Tokens) y gestión de roles (Admin/User).
* **🏢 Maestro Organizacional:** Gestión jerárquica de Departamentos y Ubicaciones físicas.
* **🖨️ Maestro de Impresoras:** Inventario completo con marcas, modelos, series y asociación a ubicaciones.
* **📂 Importación Inteligente:** Módulo de carga masiva de lecturas mediante Excel (.xlsx).
    * Soporte para fechas en formato Excel Serial o Texto.
    * Detección automática de columnas (Serie, Color, BN, Duplex, Simple).
    * Validación de existencia de series.

## 🛠️ Stack Tecnológico

### Frontend
* **React + Vite:** Framework principal.
* **Tailwind CSS:** Estilizado moderno y responsivo.
* **Recharts:** Librería para gráficos estadísticos.
* **Lucide React:** Iconografía.
* **Axios:** Consumo de API.

### Backend
* **Node.js + Express:** Servidor API REST.
* **Sequelize ORM:** Manejo de base de datos.
* **MySQL:** Base de datos relacional.
* **XLSX (SheetJS):** Procesamiento de archivos Excel.
* **JWT & Bcrypt:** Seguridad y encriptación.

## 📋 Prerrequisitos

* Node.js (v16 o superior).
* MySQL Server (XAMPP, WAMP o instalación nativa).
* Git.

## ⚙️ Instalación y Configuración

Sigue estos pasos para desplegar el proyecto localmente:

### 1. Clonar el repositorio
```bash
git clone [https://github.com/TU_USUARIO/sistema-impresion.git](https://github.com/TU_USUARIO/sistema-impresion.git)
cd sistema-impresion

2. Configurar Base de DatosCrea una base de datos vacía en MySQL (ej: print_db). El sistema creará las tablas automáticamente al iniciar.3. Configurar Backend (Servidor)Navega a la carpeta del servidor e instala las dependencias:Bashcd server
npm install
Crea un archivo .env en la carpeta server/ con las siguientes variables:Fragmento de códigoPORT=3001
DB_NAME=print_db
DB_USER=root
DB_PASS=tu_contraseña_mysql
DB_HOST=localhost
JWT_SECRET=tu_palabra_secreta_super_segura
4. Configurar Frontend (Cliente)Navega a la carpeta del cliente e instala las dependencias:Bashcd ../client
npm install
▶️ EjecuciónNecesitas dos terminales abiertas:Terminal 1 (Backend):Bashcd server
npm run dev
(Deberías ver: "Base de datos sincronizada" y "Servidor corriendo en puerto 3001")Terminal 2 (Frontend):Bashcd client
npm run dev
📄 Formato de Importación ExcelPara la carga masiva de contadores, el archivo Excel debe contener al menos las siguientes columnas (el sistema detecta nombres similares):Numero de SerieFecha / PeriodoContador TotalColorB/NDuplexSimplesMX3CRD...2024-1170455179186600👤 Usuarios por DefectoSi has ejecutado el script de inicialización (seed.js o resetAdmin.js), las credenciales por defecto son:Usuario: adminContraseña: admin (o la que hayas definido en el script).🤝 ContribuciónHaz un Fork del proyecto.Crea tu rama de características (git checkout -b feature/NuevaCaracteristica).Haz Commit de tus cambios (git commit -m 'Agrega nueva característica').Haz Push a la rama (git push origin feature/NuevaCaracteristica).Abre un Pull Request.Desarrollado con ❤️ para la gestión eficiente de impresión.
### Recomendación final antes de subir:

Si tienes alguna captura de pantalla del Dashboard funcionando (aunque sea con datos de prueba), te recomiendo mucho que la guardes en una carpeta `screenshots` y la agregues al README. Eso hace que el repositorio se vea mucho más profesional en GitHub.

Puedes agregarla así en el markdown:
`![Vista del Dashboard](./screenshots/dashboard-preview.png)`


*****************************************************************************************************************************************************************************************************
# 🖨️ Sistema de Gestión de Impresiones (Print Management System)

Sistema integral para el control, monitoreo y análisis de consumo de impresoras en entornos corporativos. Permite gestionar inventarios, importar lecturas masivas desde Excel y generar reportes jerárquicos por departamentos.

![Estado del Proyecto](https://img.shields.io/badge/Estado-En_Desarrollo-yellow)
![Licencia](https://img.shields.io/badge/Licencia-MIT-blue)

## 🚀 Características Principales

* **📊 Dashboard Interactivo:** Visualización de KPIs, tendencias de impresión y distribución de consumo (Color vs B/N).
* **📂 Carga Masiva (Excel):** Importación inteligente de lecturas mensuales mediante archivos `.xlsx`, con detección automática de fechas y validación de series.
* **🏢 Estructura Organizacional Jerárquica:** Mapeo de impresoras a **Direcciones > Departamentos > Subdepartamentos > Secciones**.
* **📈 Cálculo Automático de Consumo:** Algoritmo que calcula la diferencia entre la lectura actual y la del mes anterior para determinar el consumo real.
* **🖨️ Inventario de Dispositivos:** CRUD completo de impresoras con estados (Activa, Mantenimiento, etc.).
* **📑 Reportes Avanzados:**
    * Reporte de Totales (Contadores absolutos).
    * Reporte de Consumo (Diferencias mes a mes).
    * **Reporte Departamental:** Filtros en cascada y ranking de áreas con mayor consumo.
* **🔒 Seguridad:** Autenticación de usuarios y protección de rutas mediante JWT.

## 🛠️ Tecnologías Utilizadas

### Frontend
* **React.js:** Biblioteca principal de interfaz.
* **Tailwind CSS:** Estilizado moderno y responsivo.
* **Axios:** Consumo de API REST.
* **Lucide React:** Iconografía.
* **Recharts:** Gráficos estadísticos.
* **XLSX (SheetJS):** Procesamiento y exportación de Excel.

### Backend
* **Node.js & Express:** Servidor y API RESTful.
* **MySQL:** Base de datos relacional.
* **Sequelize ORM:** Gestión de modelos y relaciones SQL complejas.
* **Multer:** Carga de archivos.
* **Date-fns:** Manipulación precisa de fechas.

## 📋 Pre-requisitos

Asegúrate de tener instalado:
* [Node.js](https://nodejs.org/) (v16 o superior)
* [MySQL Server](https://dev.mysql.com/downloads/installer/)
* Git

## 🔧 Instalación y Configuración

Sigue estos pasos para correr el proyecto localmente:


### 1. Clonar el repositorio
```bash
git clone [https://github.com/TU_USUARIO/sistema-impresion.git](https://github.com/TU_USUARIO/sistema-impresion.git)
cd sistema-impresion


****************************************************************************************************************************************************************************************************************************

# 🖨️ Sistema de Gestión de Impresión (MPS)

Un sistema ERP completo para la gestión, monitoreo y facturación de servicios de impresión corporativa. Incluye inventario, contadores, análisis de impacto ambiental (Green State), pre-facturación con firma digital y gestión de usuarios.

## 📋 Características Principales

* **Dashboard:** Métricas en tiempo real y gráficos de consumo.
* **Inventario:** Gestión de impresoras con estados visuales.
* **Contadores:** Historial de impresiones y cálculo de coberturas.
* **Estado Verde:** Análisis de impacto ambiental y eficiencia energética.
* **Pre-Facturación:** Generación automática de pre-facturas con firma digital.
* **Importación Inteligente:** Carga masiva de datos desde Excel.
* **Seguridad:** Autenticación JWT, roles (Admin/User) y bloqueo de cuentas.

## 🛠️ Tecnologías

* **Frontend:** React, Vite, Tailwind CSS, Recharts, Lucide Icons.
* **Backend:** Node.js, Express.
* **Base de Datos:** MySQL, Sequelize ORM.
* **Herramientas:** Axios, Bcrypt, JWT, XLSX.

---

## 🚀 Guía de Instalación (Paso a Paso)

Sigue estos pasos para configurar el proyecto en un **nuevo PC**.

### 1. Prerrequisitos
Asegúrate de tener instalado:
* [Node.js](https://nodejs.org/) (Versión LTS recomendada).
* [Git](https://git-scm.com/).
* **MySQL Server** (Puede ser a través de XAMPP, WAMP, o MySQL Workbench).

### 2. Clonar el Repositorio
Abre tu terminal y ejecuta:

```bash
git clone <URL_DE_TU_REPOSITORIO>
cd sistema-impresion

3. Configuración de la Base de Datos
Abre tu gestor de base de datos (phpMyAdmin, Workbench, DBeaver).

Crea una base de datos vacía. Puedes llamarla sistema_impresion (o el nombre que prefieras).

SQL
CREATE DATABASE sistema_impresion;

4. Configuración del Backend (Servidor)
Navega a la carpeta del servidor:

Bash
cd server
Instala las dependencias:

Bash
npm install

IMPORTANTE: Crea un archivo llamado .env dentro de la carpeta server/ y configura tus variables de entorno:

Fragmento de código
PORT=3001

# Configuración de Base de Datos
DB_HOST=localhost
DB_USER=root
DB_PASS=tu_contraseña_mysql
DB_NAME=sistema_impresion

# Seguridad (Cambia esto por una clave secreta real)
JWT_SECRET=palabra_secreta_super_segura

Inicia el servidor:

Bash
npm run dev
Deberías ver: "✅ Conexión a MySQL exitosa" y "Base de datos sincronizada".


5. Configuración del Frontend (Cliente)
Abre una nueva terminal (no cierres la del servidor).

Navega a la carpeta del cliente:

Bash
cd client
Instala las dependencias:

Bash
npm install
Inicia la aplicación:

Bash
npm run dev
Abre el navegador en la URL que te indique (usualmente http://localhost:5173).

👤 Primer Acceso (Usuario Admin)
Como la base de datos se crea vacía, necesitas crear el primer usuario Administrador.

Opción A: Insertar vía SQL (Rápido) Ejecuta esto en tu base de datos para crear un admin con contraseña 123456:

SQL
INSERT INTO Users (full_name, username, password, role, is_active, createdAt, updatedAt)
VALUES 
('Administrador', 'admin', '$2a$10$XwWk/x1a.eX1a.x1a.x1aeX1a.x1a.x1a.x1a.x1a.x1a.x1a', 'admin', 1, NOW(), NOW());
/* Nota: El hash de la password puede variar, se recomienda usar Postman para el primer registro si esto no funciona */
Opción B: Usar Postman

Haz un POST a http://localhost:3001/api/users.

JSON Body:

JSON
{
  "full_name": "Admin",
  "username": "admin",
  "password": "123456",
  "role": "admin",
  "is_active": true
}
📂 Estructura del Proyecto
sistema-impresion/
├── client/         # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/  # Componentes reutilizables
│   │   ├── pages/       # Vistas principales (Dashboard, Login, etc.)
│   │   └── context/     # Estados globales
│   └── ...
├── server/         # Backend (Node + Express)
│   ├── config/     # Conexión a BD
│   ├── controllers/# Lógica de negocio
│   ├── models/     # Modelos Sequelize (User, Printer, etc.)
│   ├── routes/     # Rutas de la API
│   └── ...
└── README.md

📄 Licencia
Este proyecto es propiedad privada y confidencial.


