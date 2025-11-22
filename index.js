const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors({ origin: true }));
app.use(bodyParser.json({ limit: '10mb' })); // allow base64 images

// Use the MONGODB_URI environment variable from Render, fallback to local MongoDB
const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/cc_lostfound';
mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

const ItemSchema = new mongoose.Schema({
  name: String,
  title: String,
  description: String,
  category: String,
  location: String,
  type: { type: String, enum: ['lost','found'], default: 'lost' },
  contact: String,
  imageDataUrl: String,
  date: { type: Date, default: Date.now },
  claimed: { type: Boolean, default: false }
});
const Item = mongoose.model('Item', ItemSchema);

app.get('/', (req,res) => res.send('Lost & Found API is running'));

app.post('/items', async (req,res) => {
  try {
    const payload = req.body;
    if (!payload.title || !payload.type) {
      return res.status(400).json({ error: 'title and type required' });
    }
    const it = new Item(payload);
    await it.save();
    res.status(201).json(it);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/items', async (req,res) => {
  try {
    const q = req.query.q;
    const type = req.query.type;
    const filter = {};
    if (type) filter.type = type;
    if (q) {
      const r = new RegExp(q, 'i');
      filter.$or = [{ title: r }, { description: r }, { location: r }, { name: r }];
    }
    const items = await Item.find(filter).sort({ date: -1 }).limit(500);
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/items/:id/claim', async (req,res) => {
  try {
    const id = req.params.id;
    const it = await Item.findByIdAndUpdate(id, { claimed: true }, { new: true });
    if (!it) return res.status(404).json({ error: 'not found' });
    res.json(it);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('Server listening on', PORT));
