import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = path.join(__dirname, 'server', 'movies.db');
const WAL = DB + '-wal';
const SHM = DB + '-shm';

console.log('--- SQLite WAL Deep Recovery Tool ---');

if (!fs.existsSync(WAL)) {
    console.error('❌ movies.db-wal not found!');
    process.exit(1);
}

const walBuf = fs.readFileSync(WAL);
const walSize = walBuf.length;
console.log(`WAL size: ${walSize} bytes`);

if (walSize < 32) {
    console.error('❌ WAL file too small to have a header.');
    process.exit(1);
}

// 1. Inspect WAL header
// SQLite WAL header format:
// 0..3: magic number (0x377f0682 or 0x377f0683)
// 4..7: file format version (3007000)
// 8..11: page size
// 12..15: checkpoint sequence number
// 16..23: salt-1 and salt-2 (each 4 bytes, uint32 big endian)
// 24..31: checksum
const magic = walBuf.readUInt32BE(0);
const pageSize = walBuf.readUInt32BE(8);
const salt1 = walBuf.readUInt32BE(16);
const salt2 = walBuf.readUInt32BE(20);

console.log(`WAL Magic: 0x${magic.toString(16)} (expected 377f0682 or 377f0683)`);
console.log(`WAL Page Size: ${pageSize}`);
console.log(`WAL Salt-1: 0x${salt1.toString(16)}, Salt-2: 0x${salt2.toString(16)}`);

// Backup current files first
fs.copyFileSync(DB, DB + '.bak');
fs.copyFileSync(WAL, WAL + '.bak');
if (fs.existsSync(SHM)) fs.copyFileSync(SHM, SHM + '.bak');
console.log('✅ Created backups (.bak) of current db/wal/shm');

// 2. Read the page size and salt from the existing db file
const dbBuf = fs.readFileSync(DB);
console.log(`Current DB size: ${dbBuf.length} bytes`);

// In an SQLite database header:
// Offset 16-17: page size (or 1 for 65536)
// Offset 24-27: file change counter
// Offset 92-99: in-header change counter or reserved
// But when WAL attaches to DB, SQLite verifies that salt-1 in WAL header matches salt-1 in DB or SHM,
// OR if DB is clean/empty, WAL cannot replay if DB has a different salt / change counter.
// More importantly, each WAL frame (starts at offset 32) has:
// Frame header (24 bytes):
//   0..3: page number (1-indexed)
//   4..7: db size in pages after commit (or 0 if not commit)
//   8..11: salt-1
//   12..15: salt-2
//   16..23: checksum
// Followed by `pageSize` bytes of raw page data!

const effectivePageSize = pageSize || 4096;
const frameHeaderSize = 24;
const frameSize = frameHeaderSize + effectivePageSize;
const numFrames = Math.floor((walSize - 32) / frameSize);
console.log(`Detected ~${numFrames} WAL frames in WAL file!`);

// Let's reconstruct the database by collecting the latest version of each page from the WAL frames!
// A WAL frame updates page N. If multiple frames update page N, the latest frame wins!
const pages = new Map();

// Also find the initial page 1 if available in WAL
let offset = 32;
let frameIdx = 0;
let maxPageNum = 0;

while (offset + frameSize <= walSize) {
    const pageNum = walBuf.readUInt32BE(offset);
    const dbPagesAfterCommit = walBuf.readUInt32BE(offset + 4);
    const pageData = walBuf.subarray(offset + frameHeaderSize, offset + frameSize);

    if (pageNum > 0 && pageNum < 1000000) {
        pages.set(pageNum, pageData);
        if (pageNum > maxPageNum) maxPageNum = pageNum;
    }

    offset += frameSize;
    frameIdx++;
}

console.log(`Parsed ${frameIdx} frames. Unique database pages recovered: ${pages.size} (highest page: ${maxPageNum})`);

if (pages.has(1)) {
    console.log('🎉 Page 1 (database root & schema) found in WAL!');
    
    // Construct the database file directly from recovered pages!
    const recoveredSize = maxPageNum * effectivePageSize;
    const reconstructedDb = Buffer.alloc(recoveredSize);

    // If existing db has pages, copy them as base
    dbBuf.copy(reconstructedDb, 0, 0, Math.min(dbBuf.length, recoveredSize));

    // Overlay all recovered pages from WAL
    for (const [pageNum, pageData] of pages.entries()) {
        const targetOffset = (pageNum - 1) * effectivePageSize;
        pageData.copy(reconstructedDb, targetOffset);
    }

    // Write directly into movies.db
    fs.writeFileSync(DB, reconstructedDb);
    console.log(`💾 Overwrote ${DB} with reconstructed database (${reconstructedDb.length} bytes).`);

    // Remove WAL and SHM so SQLite opens the rebuilt database directly in normal journal mode
    if (fs.existsSync(WAL)) fs.unlinkSync(WAL);
    if (fs.existsSync(SHM)) fs.unlinkSync(SHM);

    // Test with better-sqlite3
    try {
        const db = new Database(DB);
        db.pragma('journal_mode = DELETE');
        const count = db.prepare('SELECT COUNT(*) as count FROM movies').get();
        console.log(`\n🎉🎉 SUCCESS! Recovered ${count.count} movies in database!`);
        
        const sample = db.prepare('SELECT title, release_year FROM movies LIMIT 5').all();
        console.log('Sample recovered movies:');
        console.table(sample);
        db.close();
    } catch (testErr) {
        console.error('⚠️ Verification query failed:', testErr.message);
    }
} else {
    console.log('⚠️ Page 1 was not in WAL. Attempting fallback: reading existing DB and writing highest pages...');
    // If page 1 wasn't in WAL, overlay what we have over existing DB
    const recoveredSize = Math.max(dbBuf.length, maxPageNum * effectivePageSize);
    const reconstructedDb = Buffer.alloc(recoveredSize);
    dbBuf.copy(reconstructedDb, 0, 0, dbBuf.length);

    for (const [pageNum, pageData] of pages.entries()) {
        const targetOffset = (pageNum - 1) * effectivePageSize;
        pageData.copy(reconstructedDb, targetOffset);
    }
    fs.writeFileSync(DB, reconstructedDb);
    if (fs.existsSync(WAL)) fs.unlinkSync(WAL);
    if (fs.existsSync(SHM)) fs.unlinkSync(SHM);

    try {
        const db = new Database(DB);
        const count = db.prepare('SELECT COUNT(*) as count FROM movies').get();
        console.log(`\n🎉 Recovered ${count.count} movies!`);
        db.close();
    } catch (e) {
        console.error('Error:', e.message);
    }
}
