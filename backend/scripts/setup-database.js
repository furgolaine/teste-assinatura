const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

const runMigrations = async () => {
  try {
    console.log('🔄 Running database migrations...');
    
    const migrationFile = path.join(__dirname, '../database/migrations/001_create_tables.sql');
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
    
    await pool.query(migrationSQL);
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

const runSeeds = async () => {
  try {
    console.log('🔄 Running database seeds...');
    
    const seedFile = path.join(__dirname, '../database/seeds/001_initial_data.sql');
    const seedSQL = fs.readFileSync(seedFile, 'utf8');
    
    await pool.query(seedSQL);
    console.log('✅ Seeds completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
};

const setupDatabase = async () => {
  try {
    console.log('🚀 Setting up database...');
    
    await runMigrations();
    await runSeeds();
    
    console.log('✅ Database setup completed successfully');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Run if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = {
  runMigrations,
  runSeeds,
  setupDatabase
};

