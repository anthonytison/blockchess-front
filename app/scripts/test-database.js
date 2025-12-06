#!/usr/bin/env node

// Test script to verify database configuration is working

require('dotenv').config();

async function testDatabaseConfig() {
  console.log('🧪 Testing database configuration...');
  
  try {
    const DATABASE_TYPE = process.env.DATABASE_TYPE || 'sqlite';
    console.log(`📊 Database type: ${DATABASE_TYPE}`);
    
    if (DATABASE_TYPE === 'sqlite') {
      const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || './data/blockchess.db';
      console.log(`📁 SQLite path: ${SQLITE_DB_PATH}`);
      
      // Test SQLite connection
      const Database = require('better-sqlite3');
      const db = new Database(SQLITE_DB_PATH);
      
      // Test query
      const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      console.log(`✅ SQLite tables found: ${result.map(r => r.name).join(', ')}`);
      
      // Test games table structure
      const columns = db.prepare("PRAGMA table_info(games)").all();
      console.log(`📋 Games table columns: ${columns.map(c => c.name).join(', ')}`);
      
      db.close();
      
    } else if (DATABASE_TYPE === 'postgres') {
      const config = {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'blockchess_db',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || '',
        ssl: process.env.POSTGRES_SSL === 'true'
      };
      
      console.log(`🐘 PostgreSQL host: ${config.host}:${config.port}`);
      console.log(`🗄️  Database: ${config.database}`);
      console.log(`👤 User: ${config.user}`);
      
      // Test PostgreSQL connection
      const { Pool } = require('pg');
      const pool = new Pool({
        ...config,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
      });
      
      // Test query
      const client = await pool.connect();
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      console.log(`✅ PostgreSQL tables found: ${result.rows.map(r => r.table_name).join(', ')}`);
      
      // Test games table structure
      const columns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'games' AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      console.log(`📋 Games table columns: ${columns.rows.map(c => c.column_name).join(', ')}`);
      
      client.release();
      await pool.end();
    }
    
    console.log('🎉 Database configuration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database configuration test failed:', error.message);
    process.exit(1);
  }
}

testDatabaseConfig();