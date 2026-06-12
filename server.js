// =============================================================================
// server.js  —  Star City Mall  |  Express.js + MongoDB Backend
// -----------------------------------------------------------------------------
// MERN Stack:  MongoDB  +  Express  +  Node.js
//
// API Routes:
//   POST   /api/contact             → Submit contact form (public)
//   GET    /api/contacts            → List all contacts   (admin)
//   PATCH  /api/contacts/:id/status → Mark read/unread    (admin)
//   DELETE /api/contacts/:id        → Delete contact      (admin)
//
//   GET    /api/reviews             → List reviews  (public)
//   POST   /api/reviews             → Add review    (admin)
//   PUT    /api/reviews/:id         → Edit review   (admin)
//   DELETE /api/reviews/:id         → Delete review (admin)
//
//   GET    /api/stores              → List stores   (public)
//   POST   /api/stores              → Add store     (admin)
//   PUT    /api/stores/:id          → Edit store    (admin)
//   DELETE /api/stores/:id          → Delete store  (admin)
//
//   POST   /api/auth/login          → Admin login  → returns JWT
//   GET    /api/auth/verify         → Verify JWT   (admin)
//
// Static:
//   GET  /         → index.html (public site)
//   GET  /admin    → admin/index.html (admin panel)
// =============================================================================

// Load environment variables from .env file FIRST
require('dotenv').config();

const express        = require('express');
const cors           = require('cors');
const path           = require('path');
const { MongoClient, ServerApiVersion } = require('mongodb');

// ─── Import Route Modules ─────────────────────────────────────────────────────
const authRoutes    = require('./routes/auth');
const contactRoutes = require('./routes/contact');
const reviewRoutes  = require('./routes/reviews');
const storeRoutes   = require('./routes/stores');

// =============================================================================
// EXPRESS APP SETUP
// =============================================================================
const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());                              // Allow cross-origin requests
app.use(express.json({ limit: '1mb' }));     // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// ── Static File Serving ───────────────────────────────────────────────────────
// Serve public site files (index.html, style.css, script.js, assets/)
app.use(express.static(path.join(__dirname)));

// Serve admin panel files from /admin directory
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// =============================================================================
// MONGODB CONNECTION
// =============================================================================
async function connectToMongoDB() {
  try {
    console.log('🔌 Connecting to MongoDB...');

    const client = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017', {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    await client.connect();
    const db = client.db(process.env.DB_NAME || 'balaji');

    // Ping to confirm connection
    await db.command({ ping: 1 });
    console.log(`✅ MongoDB connected → database: "${process.env.DB_NAME || 'balaji'}"`);

    // Share the db object with all routes via app.locals
    app.locals.db = db;

    // Seed sample data if collections are empty
    await seedInitialData(db);

    return db;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('   Make sure MongoDB is running on localhost:27017');
    // App continues — API routes will return 500, but static files still served
  }
}

// =============================================================================
// SEED FUNCTION — Insert default data so the site works out of the box
// =============================================================================
async function seedInitialData(db) {
  // --- Seed Reviews ---
  const reviewsCol = db.collection('reviews');
  if ((await reviewsCol.countDocuments()) === 0) {
    console.log('🌱 Seeding reviews collection...');
    await reviewsCol.insertMany([
      {
        name: 'Sarah Jenkins', role: 'Fashion Enthusiast', rating: 5,
        text: 'Amazing shopping experience! Star City Mall has all my favorite brands under one roof. The food court is exceptionally clean and the interior is beautiful.',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
        createdAt: new Date(),
      },
      {
        name: 'David Chen', role: 'Tech Consultant', rating: 4,
        text: 'The electronics section here is top-notch. I bought my new laptop yesterday, and the staff guidance was amazing. The EV charging stations are very convenient.',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
        createdAt: new Date(),
      },
      {
        name: 'Amanda Miller', role: 'Family Visitor', rating: 5,
        text: 'A perfect place for a family weekend! My kids loved the play zone, and the IMAX cinema was incredible. Truly premium vibe and extremely secure.',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80',
        createdAt: new Date(),
      },
    ]);
    console.log('✅ Reviews seeded → balaji.reviews');
  }

  // --- Seed Stores ---
  const storesCol = db.collection('stores');
  if ((await storesCol.countDocuments()) === 0) {
    console.log('🌱 Seeding stores collection...');
    await storesCol.insertMany([
      { name: 'Fashion Zone',     zone: 'Fashion',       floor: 'Level 1', description: 'Luxury couture, modern streetwear, and global apparel.', icon: 'fa-solid fa-shirt',         storeCount: 45, createdAt: new Date() },
      { name: 'Lifestyle Store',  zone: 'Lifestyle',     floor: 'Level 2', description: 'Boutique home decor, luxury goods, and cosmetic lounges.', icon: 'fa-solid fa-couch',        storeCount: 32, createdAt: new Date() },
      { name: 'Electronics Hub',  zone: 'Electronics',   floor: 'Level 2', description: 'Latest flagships in tech, home automation, and gaming rigs.', icon: 'fa-solid fa-laptop',  storeCount: 18, createdAt: new Date() },
      { name: 'Food Court',       zone: 'Dining',        floor: 'Level 3', description: 'Michelin-starred bistros, global cuisines, artisanal desserts.', icon: 'fa-solid fa-utensils', storeCount: 28, createdAt: new Date() },
      { name: 'Kids World',       zone: 'Entertainment', floor: 'Level 3', description: 'Arcade zones, toy superstores, indoor mini-playgrounds.', icon: 'fa-solid fa-child',          storeCount: 15, createdAt: new Date() },
      { name: 'Cinema Zone',      zone: 'Entertainment', floor: 'Level 4', description: '8-screen IMAX theater complex with fully reclining leather seats.', icon: 'fa-solid fa-film', storeCount: 8,  createdAt: new Date() },
    ]);
    console.log('✅ Stores seeded → balaji.stores');
  }
}

// =============================================================================
// MOUNT API ROUTES
// =============================================================================
app.use('/api/auth',     authRoutes);
app.use('/api/contact',  contactRoutes);   // POST /api/contact  (public form)
app.use('/api/contacts', contactRoutes);   // GET/DELETE/PATCH /api/contacts/* (admin)
app.use('/api/reviews',  reviewRoutes);
app.use('/api/stores',   storeRoutes);

// =============================================================================
// SPA FALLBACK ROUTES
// =============================================================================
// /admin/* → serve admin panel SPA
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// All other GET requests → serve public index.html (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// =============================================================================
// START SERVER
// =============================================================================
async function startServer() {
  await connectToMongoDB();

  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   🌟  Star City Mall  |  Express + MongoDB Server        ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║   🌐  Public Site  → http://localhost:${PORT}               ║`);
    console.log(`║   🔐  Admin Panel  → http://localhost:${PORT}/admin          ║`);
    console.log(`║   📬  Contact API  → http://localhost:${PORT}/api/contact    ║`);
    console.log(`║   ⭐  Reviews API  → http://localhost:${PORT}/api/reviews    ║`);
    console.log(`║   🏬  Stores API   → http://localhost:${PORT}/api/stores     ║`);
    console.log(`║   🗄️   Database    → MongoDB "balaji"                        ║`);
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('  Admin Login Password: admin123  (change in .env)');
    console.log('');
  });

  // Graceful shutdown on Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n⛔ Shutting down gracefully...');
    process.exit(0);
  });
}

startServer();
