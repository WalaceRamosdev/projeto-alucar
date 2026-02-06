const { Client } = require('pg');

const connectionString = 'postgresql://alucar_admin:fZrwCBtWULay0oxIAnuXbT2OR0WI1x6r@dpg-d62gtvonputs73b3cem0-a.oregon-postgres.render.com/alucar';

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function findUser() {
    try {
        await client.connect();
        const email = 'contatowalaceramos@gmail.com';
        console.log(`🔍 Procurando usuário com o e-mail: ${email}`);

        const res = await client.query('SELECT id, name, email, role, created_at FROM users WHERE email = $1', [email]);

        if (res.rows.length > 0) {
            console.log('✅ Usuário encontrado:');
            console.table(res.rows[0]);
        } else {
            console.log('❌ Nenhum usuário encontrado com esse e-mail no banco de dados atual.');
        }
    } catch (err) {
        console.error('❌ Erro durante a busca:', err);
    } finally {
        await client.end();
    }
}

findUser();
