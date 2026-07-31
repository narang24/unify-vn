const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { Pool } = require('pg');

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    try {
        console.log('Starting migration...');
        await migrate(db, { migrationsFolder: './drizzle' });
        console.log('MIGRATIONS APPLIED SUCCESSFULLY (or already up to date)');
    } catch (err) {
        console.error('MIGRATION FAILED WITH ERROR:');
        console.error(err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}
main();