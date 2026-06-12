// =============================================================================
// routes/contact.js  —  Contact Form API Routes
// =============================================================================

const express  = require('express');
const { ObjectId } = require('mongodb');
const router   = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Helper to get the contacts collection from the shared db object
const getCol = (req) => req.app.locals.db.collection('contacts');

// ── POST /api/contact (PUBLIC) ────────────────────────────────────────────────
// Accepts a contact form submission and saves it to MongoDB
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const errors = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name    || name.trim().length    < 3)  errors.push('Name must be at least 3 characters');
    if (!email   || !emailRegex.test(email.trim())) errors.push('A valid email is required');
    if (!subject || subject.trim().length < 5)  errors.push('Subject must be at least 5 characters');
    if (!message || message.trim().length < 15) errors.push('Message must be at least 15 characters');

    if (errors.length > 0) {
      return res.status(422).json({ success: false, errors });
    }

    const doc = {
      name:      name.trim(),
      email:     email.trim().toLowerCase(),
      subject:   subject.trim(),
      message:   message.trim(),
      status:    'unread',
      createdAt: new Date(),
    };

    const result = await getCol(req).insertOne(doc);
    console.log(`📬 Contact saved → _id: ${result.insertedId} | from: ${doc.email}`);

    res.status(201).json({
      success: true,
      message: 'Your message has been saved! Our team will respond within 24 hours.',
      id: result.insertedId,
    });
  } catch (err) {
    console.error('❌ POST /api/contact:', err.message);
    res.status(500).json({ success: false, error: 'Server error. Please try again.' });
  }
});

// ── GET /api/contacts (ADMIN) ────────────────────────────────────────────────
// Returns all contact submissions (admin only)
router.get('/', protect, async (req, res) => {
  try {
    const contacts = await getCol(req).find({}).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, count: contacts.length, contacts });
  } catch (err) {
    console.error('❌ GET /api/contacts:', err.message);
    res.status(500).json({ success: false, error: 'Could not fetch contacts.' });
  }
});

// ── PATCH /api/contacts/:id/status (ADMIN) ───────────────────────────────────
// Toggle read/unread status of a contact message
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['read', 'unread'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be "read" or "unread"' });
    }
    const result = await getCol(req).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ success: false, error: 'Contact not found.' });
    res.json({ success: true, message: `Marked as ${status}.` });
  } catch (err) {
    console.error('❌ PATCH /api/contacts/:id/status:', err.message);
    res.status(500).json({ success: false, error: 'Could not update status.' });
  }
});

// ── DELETE /api/contacts/:id (ADMIN) ─────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const result = await getCol(req).deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return res.status(404).json({ success: false, error: 'Contact not found.' });
    res.json({ success: true, message: 'Contact deleted.' });
  } catch (err) {
    console.error('❌ DELETE /api/contacts/:id:', err.message);
    res.status(500).json({ success: false, error: 'Could not delete contact.' });
  }
});

module.exports = router;
