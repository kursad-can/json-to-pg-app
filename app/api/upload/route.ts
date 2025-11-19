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

        // Check for "records" array pattern and flatten if found
        // Pattern: Array<{ records: Array<Object> }>
        const hasRecords = data.every((item: any) => item && Array.isArray(item.records));
        if (hasRecords) {
            data = data.flatMap((item: any) => item.records);
        }

        if (data.length === 0) {
            return NextResponse.json({ error: 'No records found in JSON' }, { status: 400 });
        }

        // 1. Discover all keys and infer types by scanning ALL rows
        const columnMap = new Map<string, { name: string; type: string; originalKey: string }>();

        for (const row of data) {
            Object.keys(row).forEach((key) => {
                const value = row[key];
                const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_');

                let currentType = 'TEXT'; // Default fallback
                if (value === null || value === undefined) {
                    // If null, we can't infer much, keep existing or wait for non-null
                    return;
                } else if (typeof value === 'number') {
                    currentType = Number.isInteger(value) ? 'INTEGER' : 'DOUBLE PRECISION';
                } else if (typeof value === 'boolean') {
                    currentType = 'BOOLEAN';
                } else if (typeof value === 'object') {
                    // Arrays and Objects -> JSONB
                    currentType = 'JSONB';
                }

                // Update map logic:
                // If new key, add it.
                // If existing key, check for type compatibility.
                // Hierarchy: JSONB > TEXT > DOUBLE PRECISION > INTEGER > BOOLEAN (roughly)
                // Actually, simplest robust way:
                // - If we see Object/Array -> JSONB
                // - If we see mixed types (e.g. number and string) -> TEXT (or JSONB)
                // - If we see mixed numbers (int and float) -> DOUBLE PRECISION

                if (!columnMap.has(safeKey)) {
                    columnMap.set(safeKey, { name: safeKey, type: currentType, originalKey: key });
                } else {
                    const existing = columnMap.get(safeKey)!;
                    if (existing.type !== currentType) {
                        // Type conflict resolution
                        if (existing.type === 'JSONB' || currentType === 'JSONB') {
                            existing.type = 'JSONB';
                        } else if (existing.type === 'TEXT' || currentType === 'TEXT') {
                            existing.type = 'TEXT';
                        } else if (
                            (existing.type === 'INTEGER' && currentType === 'DOUBLE PRECISION') ||
                            (existing.type === 'DOUBLE PRECISION' && currentType === 'INTEGER')
                        ) {
                            existing.type = 'DOUBLE PRECISION';
                        } else {
                            // Fallback for other mismatches (e.g. boolean vs number)
                            existing.type = 'TEXT';
                        }
                    }
                }
            });
        }

        const columns = Array.from(columnMap.values());

        const pool = getDbPool(connectionString);
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Create Table
            const createTableSQL = `
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          _generated_id SERIAL PRIMARY KEY,
          ${columns.map((c) => `"${c.name}" ${c.type}`).join(',\n          ')}
        );
      `;
            await client.query(createTableSQL);

            // Insert Data
            for (const row of data) {
                const values = columns.map(c => {
                    const val = row[c.originalKey];
                    if (val === undefined || val === null) return null;
                    if (c.type === 'JSONB' && typeof val !== 'string') {
                        return JSON.stringify(val);
                    }
                    return val;
                });

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
