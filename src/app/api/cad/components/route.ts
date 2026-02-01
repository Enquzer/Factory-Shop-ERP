import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

async function getDb() {
  return open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });
}

export async function POST(req: Request) {
    try {
        const { name, data, type, category } = await req.json();
        const db = await getDb();
        
        await db.exec(`
          CREATE TABLE IF NOT EXISTS cad_components (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT DEFAULT 'custom',
            data TEXT NOT NULL,
            category TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        const id = Math.random().toString(36).substr(2, 9);
        await db.run(
            'INSERT INTO cad_components (id, name, data, type, category) VALUES (?, ?, ?, ?, ?)',
            [id, name, data, type || 'custom', category || 'General']
        );

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        const db = await getDb();
        const components = await db.all('SELECT * FROM cad_components ORDER BY created_at DESC');
        return NextResponse.json(components);
    } catch (error: any) {
        // Table might not exist yet
        return NextResponse.json([]);
    }
}
