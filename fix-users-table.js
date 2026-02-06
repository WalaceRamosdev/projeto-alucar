const { Client } = require('pg');

const connectionString = 'postgresql://alucar_admin:fZrwCBtWULay0oxIAnuXbT2OR0WI1x6r@dpg-d62gtvonputs73b3cem0-a.oregon-postgres.render.com/alucar';

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function fixTable() {
    try {
        await client.connect();
        console.log('✅ Conectado ao banco!');

        console.log('🏗️ Adicionando colunas de localização na tabela users...');
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS city TEXT,
            ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
            ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
        `);

        console.log('🚀 Tabela users corrigida com sucesso!');
    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        await client.end();
    }
}

fixTable();
