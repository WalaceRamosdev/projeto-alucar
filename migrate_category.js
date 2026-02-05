const { query, pool } = require('./src/controllers/../../src/config/db');

async function migrate() {
    try {
        await query("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'carro' NOT NULL");
        console.log("Column 'category' ensured in vehicles table.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
