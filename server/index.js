const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const resolutionRoutes = require('./routes/resolutionRoutes');
const preInvoiceRoutes = require('./routes/preInvoiceRoutes');
require('dotenv').config();

const { dbConnect, sequelize } = require('./config/database');

// Inicializar App
const app = express();
const PORT = process.env.PORT || 3001;

// --- MIDDLEWARES ---
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.json({ limit: '50mb' }));


// --- RUTAS ---
app.get('/api/health', (req, res) => { res.json({ status: 'OK', message: 'API funcionando correctamente' });
});

// 2. HACER PÚBLICA LA CARPETA UPLOADS
// Esto permite acceder a http://localhost:3001/uploads/archivo.pdf
//app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------------------------------------------------------
// REEMPLAZA LA LÍNEA DE 'app.use('/uploads'...' POR ESTO:
// ---------------------------------------------------------

app.use('/uploads', (req, res, next) => {
    // 1. Permite acceso desde cualquier origen (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // 2. IMPORTANTE: Elimina la protección que impide usar iframes
    res.removeHeader('X-Frame-Options'); 
    
    // 3. Permite explícitamente que localhost:5173 incruste el contenido
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' http://localhost:5173 http://127.0.0.1:5173 *");

    next();
}, express.static(path.join(__dirname, 'uploads')));

// Importamos las rutas de autenticación
// Aquí ocurre la magia: conecta /api/auth con el archivo authRoutes.js
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/org', require('./routes/orgRoutes'));
app.use('/api/printers', require('./routes/printerRoutes'));
app.use('/api/import', require('./routes/importRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/prints', require('./routes/monthlyPrintRoutes'));
app.use('/api/resolutions', resolutionRoutes);
app.use('/api/pre-invoices', preInvoiceRoutes);
app.use('/uploads', express.static('uploads'));

// --- INICIALIZACIÓN ---
const startServer = async () => {
    // 1. Conectar DB
    await dbConnect();
    
    sequelize.sync().then(() => {    
    console.log('✅ Base de datos sincronizada y actualizada');
    app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en: http://localhost:${PORT}`);
    });
});


    // 2. Sincronizar modelos (crea tablas si no existen)
    //await sequelize.sync({ force: false });

    // 3. Arrancar servidor
    //app.listen(PORT, () => {
    //    console.log(`🚀 Servidor corriendo en: http://localhost:${PORT}`);
    //});
};

startServer();