// =============================================================================
// migrate.js  —  Standalone MongoDB Atlas Data Migration Script
// -----------------------------------------------------------------------------
// Connects directly to Atlas shard hosts (bypasses SRV DNS lookup issues)
// and seeds all required collections into the "balaji" database.
// Run: node migrate.js
// =============================================================================

require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

// ── Direct shard URIs (resolved from SRV DNS by PowerShell) ─────────────────
// Using the individual replica set members directly avoids the SRV lookup
// that Node.js fails to resolve on this network.
const DIRECT_URI =
  'mongodb://lbrk1505_db_user:HnP4Bf4MFMj5jU1r@' +
  'ac-h4wwwyx-shard-00-00.3mzoalr.mongodb.net:27017,' +
  'ac-h4wwwyx-shard-00-01.3mzoalr.mongodb.net:27017,' +
  'ac-h4wwwyx-shard-00-02.3mzoalr.mongodb.net:27017' +
  '/balaji?ssl=true&replicaSet=atlas-xxxxxxx&authSource=admin&retryWrites=true&w=majority';

// We'll also try the SRV URI from .env as a fallback
const SRV_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'balaji';

// ── Data to seed ─────────────────────────────────────────────────────────────

const SEED_REVIEWS = [
  {
    name: 'Sarah Jenkins',
    role: 'Fashion Enthusiast',
    rating: 5,
    text: 'Amazing shopping experience! Star City Mall has all my favorite brands under one roof. The food court is exceptionally clean and the interior is beautiful.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    createdAt: new Date(),
  },
  {
    name: 'David Chen',
    role: 'Tech Consultant',
    rating: 4,
    text: 'The electronics section here is top-notch. I bought my new laptop yesterday, and the staff guidance was amazing. The EV charging stations are very convenient.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    createdAt: new Date(),
  },
  {
    name: 'Amanda Miller',
    role: 'Family Visitor',
    rating: 5,
    text: 'A perfect place for a family weekend! My kids loved the play zone, and the IMAX cinema was incredible. Truly premium vibe and extremely secure.',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80',
    createdAt: new Date(),
  },
];

const SEED_STORES = [
  { name: 'Fashion Zone',    zone: 'Fashion',       floor: 'Level 1', description: 'Luxury couture, modern streetwear, and global apparel.',          icon: 'fa-solid fa-shirt',    storeCount: 45, createdAt: new Date() },
  { name: 'Lifestyle Store', zone: 'Lifestyle',     floor: 'Level 2', description: 'Boutique home decor, luxury goods, and cosmetic lounges.',         icon: 'fa-solid fa-couch',    storeCount: 32, createdAt: new Date() },
  { name: 'Electronics Hub', zone: 'Electronics',   floor: 'Level 2', description: 'Latest flagships in tech, home automation, and gaming rigs.',      icon: 'fa-solid fa-laptop',   storeCount: 18, createdAt: new Date() },
  { name: 'Food Court',      zone: 'Dining',        floor: 'Level 3', description: 'Michelin-starred bistros, global cuisines, artisanal desserts.',   icon: 'fa-solid fa-utensils', storeCount: 28, createdAt: new Date() },
  { name: 'Kids World',      zone: 'Entertainment', floor: 'Level 3', description: 'Arcade zones, toy superstores, indoor mini-playgrounds.',          icon: 'fa-solid fa-child',    storeCount: 15, createdAt: new Date() },
  { name: 'Cinema Zone',     zone: 'Entertainment', floor: 'Level 4', description: '8-screen IMAX theater complex with fully reclining leather seats.',icon: 'fa-solid fa-film',     storeCount: 8,  createdAt: new Date() },
];

// ── Connection helper ─────────────────────────────────────────────────────────

async function tryConnect(uri, label) {
  console.log(`\n🔌 Trying ${label}...`);
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    connectTimeoutMS: 15000,
    serverSelectionTimeoutMS: 15000,
  });
  await client.connect();
  const db = client.db(DB_NAME);
  await db.command({ ping: 1 });
  console.log(`✅ Connected via ${label}`);
  return { client, db };
}

// ── Main migration ────────────────────────────────────────────────────────────

async function migrate() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   🚀  Balu Mall  —  MongoDB Atlas Migration       ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`   Target database : ${DB_NAME}`);
  console.log(`   Atlas cluster   : cluster0.3mzoalr.mongodb.net`);

  let client, db;

  // Try SRV URI first, then fall back to direct hosts
  try {
    ({ client, db } = await tryConnect(SRV_URI, 'SRV URI (from .env)'));
  } catch (err1) {
    console.log(`⚠️  SRV failed: ${err1.message}`);
    try {
      ({ client, db } = await tryConnect(DIRECT_URI, 'Direct shard hosts'));
    } catch (err2) {
      console.error(`\n❌ Both connection methods failed.`);
      console.error(`   Direct error: ${err2.message}`);
      console.error('\n📋 Troubleshooting steps:');
      console.error('   1. Go to https://cloud.mongodb.com → Network Access');
      console.error('   2. Add IP: 0.0.0.0/0  (allow all) or your specific IP');
      console.error('   3. Make sure Cluster0 is not paused (Database section)');
      console.error('   4. Wait ~30 seconds after adding IP, then retry');
      process.exit(1);
    }
  }

  try {
    // ── Migrate Reviews ────────────────────────────────────────────────────
    console.log('\n📦 Migrating reviews collection...');
    const reviewsCol = db.collection('reviews');
    const existingReviews = await reviewsCol.countDocuments();

    if (existingReviews > 0) {
      console.log(`   ℹ️  Already has ${existingReviews} review(s) — skipping seed (no duplicates)`);
    } else {
      const result = await reviewsCol.insertMany(SEED_REVIEWS);
      console.log(`   ✅ Inserted ${result.insertedCount} reviews → balaji.reviews`);
    }

    // ── Migrate Stores ─────────────────────────────────────────────────────
    console.log('\n📦 Migrating stores collection...');
    const storesCol = db.collection('stores');
    const existingStores = await storesCol.countDocuments();

    if (existingStores > 0) {
      console.log(`   ℹ️  Already has ${existingStores} store(s) — skipping seed (no duplicates)`);
    } else {
      const result = await storesCol.insertMany(SEED_STORES);
      console.log(`   ✅ Inserted ${result.insertedCount} stores → balaji.stores`);
    }

    // ── Ensure indexes ──────────────────────────────────────────────────────
    console.log('\n📦 Creating indexes...');
    await db.collection('contacts').createIndex({ createdAt: -1 });
    await db.collection('reviews').createIndex({ createdAt: -1 });
    await db.collection('stores').createIndex({ zone: 1 });
    console.log('   ✅ Indexes created');

    // ── Verify ─────────────────────────────────────────────────────────────
    console.log('\n📊 Final collection counts:');
    const collections = ['reviews', 'stores', 'contacts'];
    for (const name of collections) {
      const count = await db.collection(name).countDocuments();
      console.log(`   ${name.padEnd(12)} → ${count} document(s)`);
    }

    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║   ✅  Migration Complete!                          ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║   Your Atlas "balaji" database is ready.          ║');
    console.log('║   Now run:  node server.js                        ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

  } finally {
    await client.close();
    console.log('🔌 Connection closed.\n');
  }
}

migrate().catch(err => {
  console.error('\n❌ Unexpected error:', err.message);
  process.exit(1);
});
