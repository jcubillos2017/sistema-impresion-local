// server/test-login.js

const URL = 'http://localhost:3001/api/auth/login';

// Credenciales que coinciden con tu base de datos
const credenciales = {
    username: 'admin',
    password: 'admin123' 
};

async function probarLogin() {
    console.log('🔄 Intentando iniciar sesión...');

    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credenciales)
        });

        const data = await response.json();

        console.log('------------------------------------------------');
        console.log(`Estado HTTP: ${response.status}`);
        
        if (response.ok) {
            console.log('✅ ¡LOGIN EXITOSO!');
            console.log('🔑 Tu Token JWT es:');
            console.log(data.token);
        } else {
            console.log('❌ Error en el login:', data);
        }
        console.log('------------------------------------------------');

    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
    }
}

probarLogin();