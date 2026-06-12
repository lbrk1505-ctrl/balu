// =============================================================================
// routes/stores.js  —  Store Directory API Routes
// =============================================================================

const express  = require('express');
const { ObjectId } = require('mongodb');
const router   = express.Router();
const { protect } = require('../middleware/authMiddleware');

const getCol = (req) => req.app.locals.db.collection('stores');

// ── GET /api/stores (PUBLIC) ──────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const stores = await getCol(req).find({}).sort({ zone: 1, name: 1 }).toArray();
    res.json({ success: true, count: stores.length, stores });
  } catch (err) {
    console.error('❌ GET /api/stores:', err.message);
    res.status(500).json({ success: false, error: 'Could not fetch stores.' });
  }
});

// ── POST /api/stores (ADMIN) ──────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { name, zone, floor, description, icon, storeCount } = req.body;
    const errors = [];

    if (!name || name.trim().length < 2) errors.push('Store name is required');
    if (!zone || zone.trim().length  < 2) errors.push('Zone is required');

    if (errors.length > 0) return res.status(422).json({ success: false, errors });

    const doc = {
      name:       name.trim(),
      zone:       zone.trim(),
      floor:      floor?.trim()       || 'Level 1',
      description: description?.trim() || '',
      icon:       icon?.trim()        || 'fa-solid fa-shop',
      storeCount: Number(storeCount)  || 0,
      createdAt:  new Date(),
    };

    const result = await getCol(req).insertOne(doc);
    res.status(201).json({ success: true, message: 'Store added.', id: result.insertedId });
  } catch (err) {
    console.error('❌ POST /api/stores:', err.message);
    res.status(500).json({ success: false, error: 'Could not add store.' });
  }
});

// ── PUT /api/stores/:id (ADMIN) ───────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, zone, floor, description, icon, storeCount } = req.body;
    const update = { updatedAt: new Date() };
    if (name)        update.name        = name.trim();
    if (zone)        update.zone        = zone.trim();
    if (floor)       update.floor       = floor.trim();
    if (description !== undefined) update.description = description.trim();
    if (icon)        update.icon        = icon.trim();
    if (storeCount !== undefined) update.storeCount = Number(storeCount);

    const result = await getCol(req).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: update }
    );
    if (result.matchedCount === 0) return res.status(404).json({ success: false, error: 'Store not found.' });
    res.json({ success: true, message: 'Store updated.' });
  } catch (err) {
    console.error('❌ PUT /api/stores/:id:', err.message);
    res.status(500).json({ success: false, error: 'Could not update store.' });
  }
});

// ── DELETE /api/stores/:id (ADMIN) ───────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const result = await getCol(req).deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return res.status(404).json({ success: false, error: 'Store not found.' });
    res.json({ success: true, message: 'Store deleted.' });
  } catch (err) {
    console.error('❌ DELETE /api/stores/:id:', err.message);
    res.status(500).json({ success: false, error: 'Could not delete store.' });
  }
});

module.exports = router;
