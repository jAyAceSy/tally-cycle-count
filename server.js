const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '.data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Permanent master item list — never wiped by uploads ----------
const MASTER_ITEMS = [
  { code: 'PABW-108S20',  desc: 'Punaas Anti-Bacterial Wipes 108Sheets 20 pack per case',   category: '1st', systemQty: 0 },
  { code: 'SBWP-016190',  desc: 'SANICARE BABY WIPES-PLANT FIBRE 90SHEETS (80+10 FREE)',     category: '1st', systemQty: 0 },
  { code: 'SCW-024180',   desc: "SANICARE CLEANSING WIPES 80'S",                              category: '1st', systemQty: 0 },
  { code: 'SCW-060115',   desc: "SANICARE CLEANSING WIPES 15'S",                              category: '1st', systemQty: 0 },
  { code: 'SCW-18180L',   desc: "SANICARE SANITIZING WIPES LAVENDER SCENT 80'S",              category: '1st', systemQty: 0 },
  { code: 'SCW-40115L',   desc: "SANICARE SANITIZING WIPES LAVENDER SCENT 15'S",              category: '1st', systemQty: 0 },
  { code: 'SCWB-024180',  desc: "SANICARE CLEANSING WIPES - BAMBOO FIBRE 80'S",               category: '1st', systemQty: 0 },
  { code: 'SCWB-060115',  desc: "SANICARE CLEANSING WIPES - BAMBOO FIBRE 15'S",               category: '1st', systemQty: 0 },
  { code: 'SPW-018180',   desc: "SANICARE PLAYTIME WIPES 80'S",                               category: '1st', systemQty: 0 },
  { code: 'SPW-040115',   desc: "SANICARE PLAYTIME WIPES 15'S",                               category: '1st', systemQty: 0 },
  { code: 'TBCB-L00050',  desc: 'TRASHBAGS CHEERS BLACK LARGE 50PKS/BAG',                     category: '1st', systemQty: 0 },
  { code: 'TBCB-XL0020',  desc: 'TRASHBAGS CHEERS BLACK X-LARGE',                             category: '1st', systemQty: 0 },
  { code: 'TBCB-XXL020',  desc: 'TRASHBAGS CHEERS BLACK XXL 20PKS/BG',                        category: '1st', systemQty: 0 },
  { code: 'BFR-129300',   desc: 'B.T. FEMME 9\'S 300SHTS 2P PLAIN DECOR',                    category: '2nd', systemQty: 0 },
  { code: 'BFR-624300',   desc: 'B.T. FEMME 24\'S 300SHTS 2P PLAIN DECOR',                   category: '2nd', systemQty: 0 },
  { code: 'BFR-961300',   desc: 'B.T. FEMME SOLO 300SHTS 2P PLAIN DECOR',                    category: '2nd', systemQty: 0 },
  { code: 'BFRB-244300',  desc: 'B.T. FEMME 4\'S 300SHTS 2PLY PLAIN DECOR',                  category: '2nd', systemQty: 0 },
  { code: 'BFRB-812300',  desc: 'B.T. FEMME 12\'S 300SHTS 2PLY PLAIN DECOR',                 category: '2nd', systemQty: 0 },
  { code: 'BFRB-812450',  desc: 'B.T. FEMME 12\'S 450SH 3PLY',                               category: '2nd', systemQty: 0 },
  { code: 'BFRRB-812300', desc: 'B.T. FEMME RETAIL 12\'S 300SHTS 2PLY',                      category: '2nd', systemQty: 0 },
  { code: 'BJR-961320',   desc: 'B.T. JADE SOLO 320SHTS 2P',                                  category: '2nd', systemQty: 0 },
  { code: 'BJRB-812320',  desc: 'B.T. JADE 12\'S 320SHEETS 2PLY',                            category: '2nd', systemQty: 0 },
  { code: 'BJV-961280',   desc: 'B.T. JADE VALUE SOLO 280SHTS 2P',                            category: '2nd', systemQty: 0 },
  { code: 'BSN-244600E',  desc: 'B.T. SANICARE 4\'S 600SHTS 3PLY ECOLAYER',                  category: '2nd', systemQty: 0 },
  { code: 'BSNB-812400',  desc: 'B.T. SANICARE 12\'S 400SHTS 2P PLAIN DECOR',                category: '2nd', systemQty: 0 },
  { code: 'BTU-483003',   desc: 'B.T. UNBRANDED 48RLS 300SHEETS 3PLY 1BAG',                   category: '3rd', systemQty: 0 },
  { code: 'CCTV-181030',  desc: 'B.T. SANICARE 12\'S 600SHTS 3PLY ECOLAYER',                 category: '3rd', systemQty: 0 },
  { code: 'KTFA-162752',  desc: 'K.T. FEMME AP TWIN 75P 2P',                                  category: '3rd', systemQty: 0 },
  { code: 'KTSJB-122702', desc: 'K.T. SANICARE JUMBO TWIN 70P 2PLY',                          category: '3rd', systemQty: 0 },
  { code: 'PFC-030175',   desc: 'P.T. FEMME CLEAR 175P 1P',                                   category: '3rd', systemQty: 0 },
  { code: 'PRSV-103120',  desc: 'P.T. ROBINSONS INTERFOLDED 120PULLS PACK OF 3',              category: '3rd', systemQty: 0 },
  { code: 'PSMB-056150',  desc: 'P.T. SM BONUS INTERFOLDED 150PLS 1PLY PCK OF 6',            category: '3rd', systemQty: 0 },
  { code: 'PSMB-302150',  desc: 'P.T. SM BONUS INTERFOLDED 150PLS 2PLY',                      category: '3rd', systemQty: 0 },
  { code: 'PSR-030175',   desc: 'P.T. SANICARE REGULAR 175P 1P',                              category: '3rd', systemQty: 0 },
  { code: 'PTF-030175',   desc: 'P.T. FEMME INTERFOLDED 175P 1P',                             category: '3rd', systemQty: 0 },
  { code: 'PTFE-103120',  desc: 'P.T. FEMME ESSENTIALS INTRFLD TOWEL 120P PACK OF 3',         category: '3rd', systemQty: 0 },
  { code: 'PTUV-030175',  desc: 'P.T. UNBRANDED VP 175P 1P',                                  category: '3rd', systemQty: 0 },
  { code: 'TVPF-062000',  desc: "T.N. JADE VALUE PRECUT-FOLDED 2000'S 1PLY",                  category: '3rd', systemQty: 0 },
  { code: 'TVPF-151000',  desc: "T.N. JADE VALUE PCF 1000'S 1P",                              category: '3rd', systemQty: 0 },
  { code: 'CSBCU-81212N', desc: 'CHEERS STARCH-BASED CUP NATURAL 8OZ X 12',                   category: '4th', systemQty: 0 },
  { code: 'CSBC-62420N',  desc: 'SANICARE COTTON 10g 11 + 1, 24 PACKS/CASE',                  category: '4th', systemQty: 0 },
  { code: 'FCRS-085000',  desc: 'FEMME COTTON ROLLS 8G 50PK/CS',                              category: '4th', systemQty: 0 },
  { code: 'JRTV-122002',  desc: "JRT VALUE 12'S 200M 2PLY",                                   category: '4th', systemQty: 0 },
  { code: 'MIPP-000054',  desc: "BT SANICARE 12's 600SHEETS 3PLY ECOLAYER (12+3)",            category: '4th', systemQty: 0 },
  { code: 'PTF-000003',   desc: 'PT FEMME INTERFOLDED PACK OF 3, 10PACKS/CASE',               category: '4th', systemQty: 0 },
  { code: 'SCBU-010818',  desc: "SANICARE COTTON BUDS 108'S 12",                              category: '4th', systemQty: 0 },
  { code: 'SCBU-020024',  desc: "SANICARE COTTON BUDS 200'S 6",                               category: '4th', systemQty: 0 },
  { code: 'SCMBU-002006', desc: 'SANICARE COTTON MINI BUDS 200TIPS (24X6PACKS)',               category: '4th', systemQty: 0 },
  { code: 'SCR-004596',   desc: 'SANICARE COTTON ROLLS 45G',                                   category: '4th', systemQty: 0 },
  { code: 'SCR-010288',   desc: 'SANICARE COTTON ROLLS 10G',                                   category: '4th', systemQty: 0 },
];

// On startup, always sync the master item list into data.json.
// System quantities are preserved from existing data; new items get 0.
function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  let existing = { counts: [], threshold: 10, items: [] };
  if (fs.existsSync(DATA_FILE)) {
    try { existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e) {}
  }

  // Build a map of existing system quantities by item code
  const existingQty = {};
  (existing.items || []).forEach(i => { existingQty[i.code] = i.systemQty; });

  // Always use the master list, preserving any saved system quantities
  existing.items = MASTER_ITEMS.map(i => ({
    ...i,
    systemQty: existingQty[i.code] !== undefined ? existingQty[i.code] : i.systemQty
  }));

  fs.writeFileSync(DATA_FILE, JSON.stringify(existing, null, 2));
}
ensureDataFile();

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let writeQueue = Promise.resolve();
function withLock(fn) {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.catch(() => {});
  return run;
}

// ---------- Routes ----------
app.get('/api/state', (req, res) => {
  try { res.json(readData()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Update system quantities only — item list is permanent and never replaced
app.post('/api/systemqty', (req, res) => {
  withLock(() => {
    const data = readData();
    const updates = req.body.updates; // [{ code, systemQty }]
    if (!Array.isArray(updates)) throw new Error('updates must be an array');
    let matched = 0;
    updates.forEach(u => {
      const item = data.items.find(i => i.code === u.code);
      if (item) { item.systemQty = Number(u.systemQty) || 0; matched++; }
    });
    writeData(data);
    return { updated: matched, total: updates.length };
  }).then(r => res.json(r)).catch(e => res.status(400).json({ error: e.message }));
});

// Patch a single item's system qty (from Items tab inline edit)
app.patch('/api/items/:code', (req, res) => {
  withLock(() => {
    const data = readData();
    const item = data.items.find(i => i.code === req.params.code);
    if (!item) throw new Error('item not found');
    // Only systemQty is editable — code/desc/category are permanent
    if (req.body.systemQty !== undefined) item.systemQty = Number(req.body.systemQty);
    writeData(data);
    return item;
  }).then(item => res.json(item)).catch(e => res.status(400).json({ error: e.message }));
});

app.post('/api/counts', (req, res) => {
  withLock(() => {
    const data = readData();
    const { date, itemCode, counter, countedQty, systemQty } = req.body;
    if (!date || !itemCode || !counter || countedQty === undefined)
      throw new Error('date, itemCode, counter, and countedQty are required');
    const idx = data.counts.findIndex(c => c.date === date && c.itemCode === itemCode && c.counter === counter);
    const record = {
      id: idx > -1 ? data.counts[idx].id : 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      date, itemCode, counter,
      countedQty: Number(countedQty),
      systemQty: Number(systemQty),
      ts: Date.now()
    };
    if (idx > -1) data.counts[idx] = record; else data.counts.push(record);
    writeData(data);
    return record;
  }).then(r => res.json(r)).catch(e => res.status(400).json({ error: e.message }));
});

app.delete('/api/counts', (req, res) => {
  withLock(() => {
    const data = readData();
    const { date, counter } = req.query;
    data.counts = data.counts.filter(c => !(c.date === date && c.counter === counter));
    writeData(data);
    return { ok: true };
  }).then(r => res.json(r)).catch(e => res.status(400).json({ error: e.message }));
});

app.put('/api/threshold', (req, res) => {
  withLock(() => {
    const data = readData();
    const t = Number(req.body.threshold);
    if (!t || t <= 0) throw new Error('threshold must be a positive number');
    data.threshold = t;
    writeData(data);
    return { threshold: data.threshold };
  }).then(r => res.json(r)).catch(e => res.status(400).json({ error: e.message }));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Tally server running at http://localhost:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
