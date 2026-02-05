const { Client } = require('pg');

const connectionString = 'postgresql://alucar_admin:fZrwCBtWULay0oxIAnuXbT2OR0WI1x6r@dpg-d62gtvonputs73b3cem0-a.oregon-postgres.render.com/alucar';

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        await client.connect();
        console.log('✅ Conectado ao banco!');

        // 1. Limpar tudo
        console.log('🧹 Limpando banco...');
        await client.query('DROP TABLE IF EXISTS contacts CASCADE;');
        await client.query('DROP TABLE IF EXISTS vehicle_images CASCADE;');
        await client.query('DROP TABLE IF EXISTS vehicles CASCADE;');
        await client.query('DROP TABLE IF EXISTS users CASCADE;');
        await client.query('DROP TABLE IF EXISTS categories CASCADE;');

        // 2. Criar Tabelas Reais
        console.log('🏗️ Criando tabelas...');

        // Habilitar extenção para UUID se necessário
        await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

        await client.query(`
            CREATE TABLE users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                whatsapp TEXT NOT NULL,
                role TEXT CHECK (role IN ('OWNER', 'DRIVER')) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE vehicles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
                category TEXT DEFAULT 'carro',
                brand TEXT NOT NULL,
                model TEXT NOT NULL,
                year INTEGER NOT NULL,
                mileage INTEGER NOT NULL,
                gearbox TEXT CHECK (gearbox IN ('Manual', 'Automático')) NOT NULL,
                fuel_type TEXT CHECK (fuel_type IN ('Gasolina', 'Etanol', 'Flex', 'Diesel', 'GNV', 'Elétrico')) NOT NULL,
                price_amount DECIMAL(10, 2) NOT NULL,
                price_period TEXT CHECK (price_period IN ('Diário', 'Semanal', 'Mensal')) NOT NULL,
                min_rental_days INTEGER NOT NULL DEFAULT 1,
                description TEXT,
                city TEXT NOT NULL,
                state CHAR(2) NOT NULL,
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE vehicle_images (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
                image_url TEXT NOT NULL,
                is_main BOOLEAN DEFAULT FALSE,
                "order" INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Inserir Usuário e Veículos de Teste
        console.log('📝 Inserindo dados de teste...');

        const userResult = await client.query(`
            INSERT INTO users (name, email, password_hash, whatsapp, role)
            VALUES ('Admin FletMobi', 'admin@fletmobi.com', 'hash_fake_123', '5521999999999', 'OWNER')
            RETURNING id;
        `);
        const adminId = userResult.rows[0].id;

        await client.query(`
            INSERT INTO vehicles (owner_id, brand, model, year, mileage, gearbox, fuel_type, price_amount, price_period, city, state, category)
            VALUES 
            ($1, 'Chevrolet', 'Onix', 2023, 15000, 'Automático', 'Flex', 650.00, 'Semanal', 'Rio de Janeiro', 'RJ', 'carro'),
            ($1, 'Fiat', 'Argo', 2022, 22000, 'Manual', 'Flex', 600.00, 'Semanal', 'Niterói', 'RJ', 'carro'),
            ($1, 'Volkswagen', 'Gol', 2021, 45000, 'Manual', 'GNV', 550.00, 'Semanal', 'Duque de Caxias', 'RJ', 'carro');
        `, [adminId]);

        console.log('🚀 Banco de dados configurado com sucesso!');
    } catch (err) {
        console.error('❌ Erro durante a migração:', err);
    } finally {
        await client.end();
    }
}

migrate();


