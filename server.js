// =============================================================================
// server.js  —  Star City Mall Backend
// -----------------------------------------------------------------------------
// LEARN: This file uses ONLY the Node.js built-in "http" module + the official
//        MongoDB Node.js driver. No Express, no Fastify — pure Node.js.
//
// KEY CONCEPTS YOU WILL LEARN HERE:
//  1. Creating an HTTP server with Node's built-in "http" module
//  2. Routing requests manually (no framework router)
//  3. Parsing a JSON request body using streams (data events)
//  4. Connecting to MongoDB using the native MongoClient
//  5. Writing documents to a MongoDB collection (insertOne)
//  6. Reading documents from a MongoDB collection (find / toArray)
//  7. Serving static files (HTML, CSS, JS, images) from disk
//  8. CORS headers — allowing the browser to call our API
// =============================================================================

// ─── 1. IMPORT BUILT-IN NODE.JS MODULES ─────────────────────────────────────
// "http"   → lets us create a web server that listens for requests
// "fs"     → lets us read files from disk (serving index.html, style.css, etc.)
// "path"   → constructs OS-safe file paths (works on Windows & Linux)
// "url"    → parses the request URL into parts (pathname, query params)
const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

// ─── 2. IMPORT MONGODB NATIVE DRIVER ─────────────────────────────────────────
// LEARN: MongoClient is the main class that manages the connection pool to MongoDB.
// We "require" it from the "mongodb" package we installed via npm.
const { MongoClient, ServerApiVersion } = require('mongodb');

// =============================================================================
// CONFIGURATION — change these values to match your environment
// =============================================================================
const CONFIG = {
  // The MongoDB connection string.
  // LEARN: "localhost:27017" is the default MongoDB port on a local machine.
  //        If you use MongoDB Atlas (cloud), replace this with your Atlas URI.
  MONGO_URI: 'mongodb://localhost:27017',

  // The database name that matches what you see in MongoDB Compass: "balaji"
  DB_NAME: 'balaji',

  // Collections (like tables in SQL)
  COLLECTIONS: {
    CONTACTS: 'contacts',   // stores contact form submissions
    REVIEWS:  'reviews',    // stores customer testimonials
    STORES:   'stores',     // stores directory data
  },

  // The port our HTTP server will listen on
  PORT: 3000,

  // The folder where our static files (index.html, style.css, etc.) live
  // __dirname = the directory of this server.js file
  STATIC_DIR: __dirname,
};

// =============================================================================
// MIME TYPE MAP
// LEARN: MIME types tell the browser WHAT kind of file we're sending so it can
//        render it correctly (e.g. "text/css" → apply as stylesheet).
// =============================================================================
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
};

// =============================================================================
// MONGODB CONNECTION
// LEARN: We use a single MongoClient instance shared across ALL requests.
//        Creating a new connection per request would be very slow and wasteful.
// =============================================================================
let db; // This will hold the database object once connected

async function connectToMongoDB() {
  try {
    console.log('🔌 Connecting to MongoDB...');

    // LEARN: MongoClient.connect() opens the connection pool.
    //        serverApi: ServerApiVersion.v1 ensures stable API behaviour.
    const client = new MongoClient(CONFIG.MONGO_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    await client.connect();

    // LEARN: .db(name) selects which database to use.
    //        This matches "balaji" in your MongoDB Compass sidebar.
    db = client.db(CONFIG.DB_NAME);

    // Verify connection with a ping
    await db.command({ ping: 1 });
    console.log(`✅ MongoDB connected successfully → database: "${CONFIG.DB_NAME}"`);

    // Seed sample reviews if the collection is empty (so the site has content)
    await seedReviewsIfEmpty();

  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('   Make sure MongoDB is running on localhost:27017');
    // We don't crash the server — static files will still be served
  }
}

// =============================================================================
// SEED FUNCTION — populates initial reviews data
// LEARN: "Seeding" means inserting default data so the app works out-of-the-box.
//        insertMany() inserts multiple documents in one round-trip to MongoDB.
// =============================================================================
async function seedReviewsIfEmpty() {
  const collection = db.collection(CONFIG.COLLECTIONS.REVIEWS);
  const count = await collection.countDocuments();

  if (count === 0) {
    console.log('🌱 Seeding reviews collection with sample data...');

    await collection.insertMany([
      {
        name:    'Sarah Jenkins',
        role:    'Fashion Enthusiast',
        rating:  5,
        text:    'Amazing shopping experience! Star City Mall has all my favorite brands under one roof. The food court is exceptionally clean and the interior is beautiful.',
        avatar:  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
        createdAt: new Date(),
      },
      {
        name:    'David Chen',
        role:    'Tech Consultant',
        rating:  4,
        text:    'The electronics section here is top-notch. I bought my new laptop yesterday, and the staff guidance was amazing. The EV charging stations are very convenient.',
        avatar:  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
        createdAt: new Date(),
      },
      {
        name:    'Amanda Miller',
        role:    'Family Visitor',
        rating:  5,
        text:    'A perfect place for a family weekend! My kids loved the play zone, and the IMAX cinema was incredible. Truly premium vibe and extremely secure.',
        avatar:  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80',
        createdAt: new Date(),
      },
    ]);

    console.log('✅ Reviews seeded into MongoDB "balaji.reviews" collection');
  }
}

// =============================================================================
// HELPER — Send a JSON API response
// LEARN: We manually set headers because there is no framework to do it for us.
//        "Access-Control-Allow-Origin: *" = CORS header that allows ANY website
//        (or our frontend at a different port) to call this API endpoint.
// =============================================================================
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type':                'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',  // CORS: allow browser fetch() calls
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

// =============================================================================
// HELPER — Read the full JSON body from a POST request using Node.js streams
// LEARN: HTTP requests arrive in "chunks" (stream). We collect all chunks into
//        a buffer array, join them, then JSON.parse the final string.
//        This is exactly what Express's express.json() middleware does internally.
// =============================================================================
function readJSONBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];           // array to accumulate incoming data chunks

    // "data" event fires for each chunk received
    req.on('data', (chunk) => {
      chunks.push(chunk);

      // Safety: reject if body exceeds 1MB to prevent memory attacks
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      if (totalLength > 1_000_000) {
        reject(new Error('Request body too large'));
      }
    });

    // "end" event fires when all chunks have been received
    req.on('end', () => {
      try {
        const rawBody = Buffer.concat(chunks).toString('utf-8');
        resolve(JSON.parse(rawBody));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });

    // "error" event fires on network issues
    req.on('error', reject);
  });
}

// =============================================================================
// HELPER — Serve a static file from disk
// LEARN: fs.createReadStream() sends the file in chunks directly to the
//        response without loading the whole file into memory first.
//        This is memory-efficient for large images/files.
// =============================================================================
function serveStaticFile(res, filePath) {
  // Resolve the full absolute path
  const absPath = path.join(CONFIG.STATIC_DIR, filePath);

  // Security check: prevent directory traversal attacks like "../../etc/passwd"
  if (!absPath.startsWith(CONFIG.STATIC_DIR)) {
    sendJSON(res, 403, { error: 'Forbidden' });
    return;
  }

  // Check if file exists
  fs.access(absPath, fs.constants.F_OK, (err) => {
    if (err) {
      // File not found → serve index.html (single-page app fallback)
      serveStaticFile(res, '/index.html');
      return;
    }

    // Determine MIME type from file extension
    const ext  = path.extname(absPath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': mime });

    // LEARN: Pipe streams the file directly to the HTTP response output stream
    //        without ever loading the whole file into RAM.
    const fileStream = fs.createReadStream(absPath);
    fileStream.pipe(res);
    fileStream.on('error', () => {
      res.end(); // close connection on read error
    });
  });
}

// =============================================================================
// VALIDATION — Validate incoming contact form data on the server side
// LEARN: NEVER trust only the client (browser) validation. Always validate
//        on the server too. Users can bypass browser JS with tools like curl.
// =============================================================================
function validateContactData(data) {
  const errors = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!data.name   || data.name.trim().length   < 3)  errors.push('Name must be at least 3 characters');
  if (!data.email  || !emailRegex.test(data.email.trim()))  errors.push('A valid email is required');
  if (!data.subject|| data.subject.trim().length < 5)  errors.push('Subject must be at least 5 characters');
  if (!data.message|| data.message.trim().length < 15) errors.push('Message must be at least 15 characters');

  return errors;
}

// =============================================================================
// API ROUTE HANDLERS
// =============================================================================

// ── POST /api/contact ────────────────────────────────────────────────────────
// Saves a contact form submission into MongoDB "balaji.contacts" collection
async function handlePostContact(req, res) {
  try {
    // 1. Parse the JSON body sent by the browser
    const body = await readJSONBody(req);

    // 2. Server-side validation
    const errors = validateContactData(body);
    if (errors.length > 0) {
      return sendJSON(res, 422, { success: false, errors });
    }

    // 3. Build the document to insert
    //    LEARN: Always sanitize input — .trim() removes leading/trailing spaces
    const contactDoc = {
      name:      body.name.trim(),
      email:     body.email.trim().toLowerCase(),
      subject:   body.subject.trim(),
      message:   body.message.trim(),
      createdAt: new Date(),   // MongoDB stores this as a proper Date object
      status:    'unread',     // useful for an admin dashboard later
    };

    // 4. Insert into MongoDB
    //    LEARN: insertOne() returns a result with insertedId = the new _id
    if (!db) throw new Error('Database not connected');
    const result = await db.collection(CONFIG.COLLECTIONS.CONTACTS).insertOne(contactDoc);

    console.log(`📬 New contact saved → _id: ${result.insertedId} | from: ${contactDoc.email}`);

    // 5. Send success response
    sendJSON(res, 201, {
      success: true,
      message: 'Your message has been saved! Our team will respond within 24 hours.',
      id: result.insertedId,
    });

  } catch (err) {
    console.error('❌ POST /api/contact error:', err.message);
    sendJSON(res, 500, { success: false, error: 'Server error. Please try again later.' });
  }
}

// ── GET /api/reviews ─────────────────────────────────────────────────────────
// Returns all reviews from MongoDB "balaji.reviews" collection
async function handleGetReviews(req, res) {
  try {
    if (!db) throw new Error('Database not connected');

    // LEARN: .find({}) → fetch ALL documents in the collection
    //        .sort({ createdAt: -1 }) → newest first  (-1 = descending)
    //        .toArray() → convert the cursor to a plain JavaScript array
    const reviews = await db
      .collection(CONFIG.COLLECTIONS.REVIEWS)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    sendJSON(res, 200, { success: true, count: reviews.length, reviews });

  } catch (err) {
    console.error('❌ GET /api/reviews error:', err.message);
    sendJSON(res, 500, { success: false, error: 'Could not load reviews.' });
  }
}

// ── GET /api/contacts ────────────────────────────────────────────────────────
// Returns all stored contact submissions (useful for an admin panel)
async function handleGetContacts(req, res) {
  try {
    if (!db) throw new Error('Database not connected');

    const contacts = await db
      .collection(CONFIG.COLLECTIONS.CONTACTS)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    sendJSON(res, 200, { success: true, count: contacts.length, contacts });

  } catch (err) {
    console.error('❌ GET /api/contacts error:', err.message);
    sendJSON(res, 500, { success: false, error: 'Could not load contacts.' });
  }
}

// =============================================================================
// MAIN REQUEST HANDLER
// LEARN: Every single HTTP request — whether it's for a web page, an image,
//        or an API call — arrives here. We manually route it based on:
//          - req.method  → "GET", "POST", "OPTIONS", etc.
//          - parsedUrl.pathname → "/", "/api/contact", "/style.css", etc.
// =============================================================================
async function requestHandler(req, res) {
  const parsedUrl = url.parse(req.url, true); // true = also parse query string
  const pathname  = parsedUrl.pathname;
  const method    = req.method.toUpperCase();

  // ── Handle CORS pre-flight requests ────────────────────────────────────────
  // LEARN: Browsers send an OPTIONS "pre-flight" request before a POST/PUT to
  //        check if the server allows cross-origin requests. We must reply OK.
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // Log every request to the console for learning / debugging
  console.log(`[${new Date().toLocaleTimeString()}] ${method} ${pathname}`);

  // ── API Routes ──────────────────────────────────────────────────────────────
  // LEARN: We check pathname and method to decide which handler to call.
  //        This is exactly what a router (Express, Fastify) does internally.

  if (pathname === '/api/contact' && method === 'POST') {
    return handlePostContact(req, res);
  }

  if (pathname === '/api/reviews' && method === 'GET') {
    return handleGetReviews(req, res);
  }

  if (pathname === '/api/contacts' && method === 'GET') {
    return handleGetContacts(req, res);
  }

  // ── Static File Routes ──────────────────────────────────────────────────────
  // LEARN: If the request is not an API call, we serve the file from disk.
  //        "/" → serve index.html (the homepage)
  if (method === 'GET') {
    const filePath = pathname === '/' ? '/index.html' : pathname;
    serveStaticFile(res, filePath);
    return;
  }

  // ── Catch-all: Method Not Allowed ───────────────────────────────────────────
  sendJSON(res, 405, { error: `Method ${method} not allowed` });
}

// =============================================================================
// START THE SERVER
// LEARN: http.createServer() creates a server. Every incoming request triggers
//        "requestHandler". .listen() binds the server to a port so it can
//        receive connections from the browser.
// =============================================================================
async function startServer() {
  // First connect to MongoDB
  await connectToMongoDB();

  // Create the HTTP server
  const server = http.createServer(requestHandler);

  // Start listening on the configured port
  server.listen(CONFIG.PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   🌟  Star City Mall Server is Running!          ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║   🌐  Website  → http://localhost:${CONFIG.PORT}           ║`);
    console.log(`║   📬  API POST → http://localhost:${CONFIG.PORT}/api/contact  ║`);
    console.log(`║   ⭐  Reviews  → http://localhost:${CONFIG.PORT}/api/reviews  ║`);
    console.log(`║   📋  Contacts → http://localhost:${CONFIG.PORT}/api/contacts ║`);
    console.log(`║   🗄️   Database → MongoDB "${CONFIG.DB_NAME}"              ║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
  });

  // Graceful shutdown: close the server cleanly on Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n⛔ Shutting down server gracefully...');
    server.close(() => {
      console.log('✅ Server closed. Goodbye!');
      process.exit(0);
    });
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
startServer();
