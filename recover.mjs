// Recovery script — run from the root movies/ folder:
// node recover.mjs

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = path.join(__dirname, 'server', 'movies.db');
const WAL = DB + '-wal';
const SHM = DB + '-shm';

console.log('📂 Database path:', DB);
console.log('📄 movies.db size:', fs.statSync(DB).size, 'bytes');
console.log('📄 movies.db-wal size:', fs.existsSync(WAL) ? fs.statSync(WAL).size + ' bytes' : 'NOT FOUND');
console.log('📄 movies.db-shm size:', fs.existsSync(SHM) ? fs.statSync(SHM).size + ' bytes' : 'NOT FOUND');

// Try to open db and force checkpoint using better-sqlite3
try {
    const { default: Database } = await import('./server/node_modules/better-sqlite3/lib/index.js');
    const db = new Database(DB);

    // Force WAL checkpoint
    console.log('\n⚙️  Forcing WAL checkpoint...');
    db.pragma('wal_checkpoint(TRUNCATE)');

    const count = db.prepare('SELECT COUNT(*) as count FROM movies').get();
    console.log(`✅ Movies found in database: ${count.count}`);

    if (count.count === 0) {
        console.log('\n⚠️  No movies found after checkpoint. The WAL file may be mismatched.');
        console.log('   Trying to copy WAL header from original db to match...');
    }

    db.close();
} catch (err) {
    console.error('❌ Error:', err.message);
}
