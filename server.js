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

// ---------- Default seed (used only if data/data.json doesn't exist yet) ----------
function defaultItems() {
  const bank = {
    "Fasteners": ["Hex Bolt M10x40", "Flat Washer 10mm", "Lock Nut M10", "Carriage Bolt 3/8in", "Wood Screw #8", "Cotter Pin 5mm"],
    "Electrical": ["Cable Tie 8in", "Terminal Block 4-Way", "Ring Terminal 6mm", "Heat Shrink Tube 3mm", "Circuit Breaker 20A"],
    "Packaging": ["Corrugated Box M", "Stretch Wrap Roll", "Poly Bag 12x18", "Packing Tape 2in", "Pallet Wrap Dispenser"],
    "Raw Material": ["Steel Sheet 1mm", "Aluminum Rod 6mm", "PVC Pipe 1in", "Rubber Gasket Sheet", "Plywood Panel 4x8"],
    "Finished Goods": ["Bracket Assembly A", "Bracket Assembly B", "Motor Mount Kit", "Panel Housing Unit", "Valve Assembly Std"],
    "Tools": ["Adjustable Wrench 10in", "Utility Knife", "Torque Screwdriver", "Measuring Tape 5m", "Hex Key Set"],
    "Safety": ["Safety Gloves L", "Safety Goggles Clear", "Ear Plugs Pair", "Hard Hat Yellow", "Reflective Vest M"],
    "Consumables": ["Machine Oil 1L", "Cleaning Rag Pack", "Industrial Wipes", "Grease Cartridge", "Solvent Spray Can"]
  };
  const items = [];
  let code = 1001;
  let qty = 500;
  Object.keys(bank).forEach(cat => {
    bank[cat].forEach(desc => {
      items.push({ code: "SKU-" + code, desc, category: cat, systemQty: qty });
      code++;
      qty += 137; // simple deterministic spread, no fake "history" implied
    });
  });
  let extra = 1;
  while (items.length < 50) {
    items.push({ code: "SKU-" + code, desc: "General Stock Item " + extra, category: "Consumables", systemQty: qty });
    code++; qty += 137; extra++;
  }
  return items;
}

function defaultData() {
  return { items: defaultItems(), counts: [], threshold: 10 };
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData(), null, 2));
  }
}
ensureDataFile();

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Simple in-process write queue so concurrent requests don't clobber each other
let writeQueue = Promise.resolve();
function withLock(fn) {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.catch(() => {});
  return run;
}

// ---------- Routes ----------
app.get('/api/state', (req, res) => {
  try {
    res.json(readData());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/items', (req, res) => {
  withLock(() => {
    const data = readData();
    if (!Array.isArray(req.body.items)) throw new Error('items must be an array');
    data.items = req.body.items;
    data.counts = []; // old counts reference old system quantities
    writeData(data);
    return data;
  }).then(data => res.json(data)).catch(e => res.status(400).json({ error: e.message }));
});

app.post('/api/items/add', (req, res) => {
  withLock(() => {
    const data = readData();
    const item = {
      code: String(req.body.code || '').trim(),
      desc: String(req.body.desc || 'New item'),
      category: String(req.body.category || 'Uncategorized'),
      systemQty: Number(req.body.systemQty) || 0
    };
    if (!item.code) throw new Error('code is required');
    if (data.items.some(i => i.code === item.code)) throw new Error('an item with that code already exists');
    data.items.push(item);
    writeData(data);
    return item;
  }).then(item => res.json(item)).catch(e => res.status(400).json({ error: e.message }));
});

app.patch('/api/items/:code', (req, res) => {
  withLock(() => {
    const data = readData();
    const item = data.items.find(i => i.code === req.params.code);
    if (!item) throw new Error('item not found');
    ['desc', 'category'].forEach(f => { if (req.body[f] !== undefined) item[f] = String(req.body[f]); });
    if (req.body.systemQty !== undefined) item.systemQty = Number(req.body.systemQty);
    writeData(data);
    return item;
  }).then(item => res.json(item)).catch(e => res.status(400).json({ error: e.message }));
});

app.delete('/api/items/:code', (req, res) => {
  withLock(() => {
    const data = readData();
    data.items = data.items.filter(i => i.code !== req.params.code);
    writeData(data);
    return { ok: true };
  }).then(r => res.json(r)).catch(e => res.status(400).json({ error: e.message }));
});

app.post('/api/counts', (req, res) => {
  withLock(() => {
    const data = readData();
    const { date, itemCode, counter, countedQty, systemQty } = req.body;
    if (!date || !itemCode || !counter || countedQty === undefined) {
      throw new Error('date, itemCode, counter, and countedQty are required');
    }
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
  }).then(record => res.json(record)).catch(e => res.status(400).json({ error: e.message }));
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
