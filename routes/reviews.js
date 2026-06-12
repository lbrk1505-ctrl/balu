// =============================================================================
// routes/reviews.js  —  Reviews API Routes
// =============================================================================

const express  = require('express');
const { ObjectId } = require('mongodb');
const router   = express.Router();
const { protect } = require('../middleware/authMiddleware');

const getCol = (req) => req.app.locals.db.collection('reviews');

// ── GET /api/reviews (PUBLIC) ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const reviews = await getCol(req).find({}).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, count: reviews.length, reviews });
  } catch (err) {
    console.error('❌ GET /api/reviews:', err.message);
    res.status(500).json({ success: false, error: 'Could not fetch reviews.' });
  }
});

// ── POST /api/reviews (ADMIN) ─────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { name, role, rating, text, avatar } = req.body;
    const errors = [];

    if (!name  || name.trim().length  < 2)  errors.push('Name must be at least 2 characters');
    if (!text  || text.trim().length  < 10) errors.push('Review text must be at least 10 characters');
    if (!rating || rating < 1 || rating > 5) errors.push('Rating must be between 1 and 5');

    if (errors.length > 0) return res.status(422).json({ success: false, errors });

    const doc = {
      name:      name.trim(),
      role:      (role || 'Mall Visitor').trim(),
      rating:    Number(rating),
      text:      text.trim(),
      avatar:    avatar?.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=2563EB&color=fff`,
      createdAt: new Date(),
    };

    const result = await getCol(req).insertOne(doc);
    res.status(201).json({ success: true, message: 'Review added.', id: result.insertedId });
  } catch (err) {
    console.error('❌ POST /api/reviews:', err.message);
    res.status(500).json({ success: false, error: 'Could not add review.' });
  }
});

// ── PUT /api/reviews/:id (ADMIN) ──────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, role, rating, text, avatar } = req.body;
    const update = {};
    if (name)   update.name   = name.trim();
    if (role)   update.role   = role.trim();
    if (rating) update.rating = Number(rating);
    if (text)   update.text   = text.trim();
    if (avatar) update.avatar = avatar.trim();
    update.updatedAt = new Date();

    const result = await getCol(req).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: update }
    );
    if (result.matchedCount === 0) return res.status(404).json({ success: false, error: 'Review not found.' });
    res.json({ success: true, message: 'Review updated.' });
  } catch (err) {
    console.error('❌ PUT /api/reviews/:id:', err.message);
    res.status(500).json({ success: false, error: 'Could not update review.' });
  }
});

// ── DELETE /api/reviews/:id (ADMIN) ──────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const result = await getCol(req).deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return res.status(404).json({ success: false, error: 'Review not found.' });
    res.json({ success: true, message: 'Review deleted.' });
  } catch (err) {
    console.error('❌ DELETE /api/reviews/:id:', err.message);
    res.status(500).json({ success: false, error: 'Could not delete review.' });
  }
});

module.exports = router;
