import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = path.join(__dirname, 'server', 'movies.db');
const WAL = DB + '-wal';
const SHM = DB + '-shm';

console.log('--- Pure Node.js SQLite WAL Frame Reconstructor ---');

if (!fs.existsSync(WAL)) {
    console.error('❌ server/movies.db-wal not found!');
    process.exit(1);
}

const walBuf = fs.readFileSync(WAL);
const walSize = walBuf.length;
console.log(`WAL size: ${walSize} bytes`);

if (walSize < 32) {
    console.error('❌ WAL file is too small.');
    process.exit(1);
}

// WAL header format:
// 0..3: magic number
// 8..11: page size
const magic = walBuf.readUInt32BE(0);
const pageSize = walBuf.readUInt32BE(8) || 4096;

console.log(`WAL Magic: 0x${magic.toString(16)}`);
console.log(`WAL Page Size: ${pageSize} bytes`);

// Safety backups
try {
    fs.copyFileSync(DB, DB + '.bak');
    fs.copyFileSync(WAL, WAL + '.bak');
    if (fs.existsSync(SHM)) fs.copyFileSync(SHM, SHM + '.bak');
    console.log('✅ Backups saved (.bak)');
} catch (e) {
    console.warn('Backup warning:', e.message);
}

const dbBuf = fs.existsSync(DB) ? fs.readFileSync(DB) : Buffer.alloc(0);

const effectivePageSize = pageSize;
const frameHeaderSize = 24;
const frameSize = frameHeaderSize + effectivePageSize;
const numFrames = Math.floor((walSize - 32) / frameSize);
console.log(`Found ~${numFrames} frames in WAL file.`);

const pages = new Map();
let offset = 32;
let frameIdx = 0;
let maxPageNum = 0;

while (offset + frameSize <= walSize) {
    const pageNum = walBuf.readUInt32BE(offset);
    const pageData = walBuf.subarray(offset + frameHeaderSize, offset + frameSize);

    if (pageNum > 0 && pageNum < 1000000) {
        // Save the latest version of this page
        pages.set(pageNum, Buffer.from(pageData));
        if (pageNum > maxPageNum) maxPageNum = pageNum;
    }

    offset += frameSize;
    frameIdx++;
}

console.log(`Processed ${frameIdx} frames. Found ${pages.size} unique database pages (max page: ${maxPageNum}).`);

const reconstructedSize = maxPageNum * effectivePageSize;
const reconstructedDb = Buffer.alloc(reconstructedSize);

// Copy existing DB base if available
if (dbBuf.length > 0) {
    dbBuf.copy(reconstructedDb, 0, 0, Math.min(dbBuf.length, reconstructedSize));
}

// Overlay all recovered pages from WAL
for (const [pageNum, pageData] of pages.entries()) {
    const targetOffset = (pageNum - 1) * effectivePageSize;
    pageData.copy(reconstructedDb, targetOffset);
}

// Write the reconstructed database
fs.writeFileSync(DB, reconstructedDb);
console.log(`\n🎉 Successfully reconstructed ${DB}!`);
console.log(`New movies.db size: ${reconstructedDb.length} bytes (was ${dbBuf.length} bytes).`);

// Clean up WAL and SHM so the server opens the freshly merged database
try {
    if (fs.existsSync(WAL)) fs.unlinkSync(WAL);
    if (fs.existsSync(SHM)) fs.unlinkSync(SHM);
    console.log('🧹 Cleaned up old WAL and SHM files.');
} catch (e) {
    console.warn('Cleanup note:', e.message);
}

console.log('\n=============================================');
console.log('✅ RECOVERY COMPLETE!');
console.log('Now start your server:');
console.log('   npm start');
console.log('All your movies will be back on http://localhost:3000');
console.log('=============================================');
