import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const connectionString = formData.get('connectionString') as string;
        const tableName = formData.get('tableName') as string;

        if (!file || !connectionString || !tableName) {
            return NextResponse.json(
                { error: 'Missing file, connection string, or table name' },
                { status: 400 }
            );
        }

        const text = await file.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON file' }, { status: 400 });
        }

        if (!Array.isArray(data)) {
            // If it's a single object, wrap it in an array
            data = [data];
        }

        if (data.length === 0) {
            return NextResponse.json({ error: 'JSON array is empty' }, { status: 400 });
        }

        // Infer schema from the first item (or merge keys from all items - simpler to take first for now)
        // A more robust approach would be to scan all items to find all possible keys and widest types.
        const sample = data[0];
        const columns = Object.keys(sample).map((key) => {
            const value = sample[key];
            let type = 'TEXT'; // Default
            if (typeof value === 'number') {
                type = Number.isInteger(value) ? 'INTEGER' : 'DOUBLE PRECISION';
            } else if (typeof value === 'boolean') {
                type = 'BOOLEAN';
            } else if (value instanceof Date) { // JSON.parse won't produce Date objects automatically, but we could check string format
                type = 'TIMESTAMP';
            }
            // Simple sanitization of column names
            const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
            return { name: safeKey, type, originalKey: key };
        });

        const pool = getDbPool(connectionString);
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Create Table
            const createTableSQL = `
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          id SERIAL PRIMARY KEY,
          ${columns.map((c) => `"${c.name}" ${c.type}`).join(',\n          ')}
        );
      `;
            await client.query(createTableSQL);

            // Insert Data
            // We'll do single inserts for simplicity, or batch them. Batch is better.
            // Construct param placeholders ($1, $2, etc.)

            for (const row of data) {
                const values = columns.map(c => row[c.originalKey]);
                const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
                const insertSQL = `
          INSERT INTO "${tableName}" (${columns.map(c => `"${c.name}"`).join(', ')})
          VALUES (${placeholders})
        `;
                await client.query(insertSQL, values);
            }

            await client.query('COMMIT');
        } catch (err: any) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
            await pool.end(); // Close pool since we create it per request
        }

        return NextResponse.json({ success: true, count: data.length });
    } catch (error: any) {
        console.error('Import error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
