const { Pool } = require('pg');

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Autolavado',
    password: '123456',
    port: 5432, // Puerto predeterminado de PostgreSQL
});

module.exports = pool;
