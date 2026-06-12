// =============================================================================
// admin/admin.js  —  Star City Mall Admin Panel Logic
// =============================================================================
// Full CRUD management for:
//   • Contacts (view, mark read/unread, delete)
//   • Reviews  (add, edit, delete)
//   • Stores   (add, edit, delete)
// All API calls include the JWT Bearer token stored in sessionStorage.
// =============================================================================

const API = '';   // same origin (Express serves both /admin and /api/*)

// ─── Auth Token ───────────────────────────────────────────────────────────────
const getToken = () => sessionStorage.getItem('scm_admin_token');
const setToken = (t) => sessionStorage.setItem('scm_admin_token', t);
const clearToken = () => sessionStorage.removeItem('scm_admin_token');

// ─── Authorized Fetch ─────────────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (getToken()) headers['Authorization'] = `Bearer ${getToken()}`;
  const res = await fetch(API + url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.errors?.join(', ') || `HTTP ${res.status}`);
  return data;
}

// ─── Toast Notifications ──────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type]}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(40px)'; toast.style.transition = '0.3s'; setTimeout(() => toast.remove(), 320); }, 3200);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const esc = (s) => { const d = document.createElement('div'); d.textContent = String(s ?? ''); return d.innerHTML; };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
const starsHTML = (r) => '★'.repeat(Math.round(r || 0)) + '☆'.repeat(5 - Math.round(r || 0));
const initials = (n) => n ? n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

// ─── Modal Helpers ─────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('open'); });
});
document.querySelectorAll('.modal-close').forEach(b => {
  b.addEventListener('click', () => b.closest('.modal-overlay').classList.remove('open'));
});

// =============================================================================
// LOGIN
// =============================================================================
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('adminPassword').value;
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Signing in…';
  loginError.classList.remove('show');

  try {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) });
    setToken(data.token);
    showApp();
    loadAllData();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.classList.add('show');
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
  }
});

// =============================================================================
// APP INITIALIZATION
// =============================================================================
async function init() {
  // Check if token already exists (returning admin)
  if (getToken()) {
    try {
      await apiFetch('/api/auth/verify');
      showApp();
      loadAllData();
    } catch {
      clearToken();
      showLogin();
    }
  } else {
    showLogin();
  }

  // Update live clock
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  const el = document.getElementById('liveClock');
  if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminApp').classList.remove('visible');
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminApp').classList.add('visible');
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  clearToken();
  showToast('Logged out successfully.', 'info');
  setTimeout(showLogin, 600);
});

// =============================================================================
// SIDEBAR NAVIGATION
// =============================================================================
const navLinks = document.querySelectorAll('[data-tab]');
const tabPanels = document.querySelectorAll('.tab-panel');
const topbarTitle = document.getElementById('topbarTitle');

const tabNames = { dashboard: 'Dashboard', contacts: 'Contact Messages', reviews: 'Reviews', stores: 'Store Directory' };

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    const tab = link.dataset.tab;
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    tabPanels.forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
    if (topbarTitle) topbarTitle.textContent = tabNames[tab] || 'Admin Panel';
  });
});

// =============================================================================
// LOAD ALL DATA
// =============================================================================
async function loadAllData() {
  await Promise.allSettled([loadContacts(), loadReviews(), loadStores()]);
  updateDashboard();
}

// =============================================================================
// CONTACTS
// =============================================================================
let contacts = [];

async function loadContacts() {
  const tbody = document.getElementById('contactsTbody');
  tbody.innerHTML = `<tr><td colspan="6" class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i><p>Loading messages…</p></td></tr>`;
  try {
    const data = await apiFetch('/api/contacts');
    contacts = data.contacts || [];
    renderContacts();
    const unread = contacts.filter(c => c.status === 'unread').length;
    const badge = document.getElementById('contactsBadge');
    if (badge) { badge.textContent = unread; badge.style.display = unread ? '' : 'none'; }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>${esc(err.message)}</p></td></tr>`;
  }
}

function renderContacts() {
  const tbody = document.getElementById('contactsTbody');
  if (!contacts.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-regular fa-envelope"></i><p>No contact messages yet.</p></div></td></tr>`;
    document.getElementById('contactsCount').textContent = '0 messages';
    return;
  }
  document.getElementById('contactsCount').textContent = `${contacts.length} message${contacts.length !== 1 ? 's' : ''}`;
  tbody.innerHTML = contacts.map(c => `
    <tr>
      <td>
        <div class="user-cell">
          <div class="avatar-initials">${initials(c.name)}</div>
          <div>
            <strong>${esc(c.name)}</strong>
            <div style="font-size:0.78rem;color:var(--text-muted)">${esc(c.email)}</div>
          </div>
        </div>
      </td>
      <td><strong>${esc(c.subject)}</strong></td>
      <td><div class="msg-text">${esc(c.message)}</div></td>
      <td>
        <span class="status-badge ${c.status}">
          <i class="fa-solid fa-${c.status === 'unread' ? 'envelope' : 'envelope-open'}"></i>
          ${c.status}
        </span>
      </td>
      <td style="white-space:nowrap">
        <div>${fmtDate(c.createdAt)}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${fmtTime(c.createdAt)}</div>
      </td>
      <td>
        <div class="td-actions">
          <button class="btn btn-sm btn-ghost" onclick="viewContact('${c._id}')" title="View message">
            <i class="fa-regular fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-${c.status === 'unread' ? 'success' : 'ghost'}"
            onclick="toggleContactStatus('${c._id}', '${c.status === 'unread' ? 'read' : 'unread'}')" 
            title="Mark ${c.status === 'unread' ? 'read' : 'unread'}">
            <i class="fa-solid fa-${c.status === 'unread' ? 'check' : 'rotate-left'}"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteContact('${c._id}')" title="Delete">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function viewContact(id) {
  const c = contacts.find(x => x._id === id);
  if (!c) return;
  document.getElementById('viewContactContent').innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;">
      <div class="avatar-initials" style="width:52px;height:52px;font-size:1.1rem">${initials(c.name)}</div>
      <div>
        <div style="font-size:1.05rem;font-weight:700;color:var(--text-primary)">${esc(c.name)}</div>
        <div style="font-size:0.85rem;color:var(--text-secondary)">${esc(c.email)}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.2rem">${fmtDate(c.createdAt)} at ${fmtTime(c.createdAt)}</div>
      </div>
      <span class="status-badge ${c.status}" style="margin-left:auto">${c.status}</span>
    </div>
    <div style="margin-bottom:1rem">
      <div style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem">Subject</div>
      <div style="color:var(--text-primary);font-weight:600">${esc(c.subject)}</div>
    </div>
    <div>
      <div style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem">Message</div>
      <div style="color:var(--text-secondary);line-height:1.7;white-space:pre-wrap;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:8px;padding:1rem">${esc(c.message)}</div>
    </div>
  `;
  openModal('viewContactModal');
  if (c.status === 'unread') toggleContactStatus(id, 'read', true);
}

async function toggleContactStatus(id, newStatus, silent = false) {
  try {
    await apiFetch(`/api/contacts/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
    if (!silent) showToast(`Marked as ${newStatus}.`, 'success');
    await loadContacts();
    updateDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteContact(id) {
  if (!confirm('Delete this contact message permanently?')) return;
  try {
    await apiFetch(`/api/contacts/${id}`, { method: 'DELETE' });
    showToast('Contact deleted.', 'success');
    await loadContacts();
    updateDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =============================================================================
// REVIEWS
// =============================================================================
let reviews = [];
let editReviewId = null;

async function loadReviews() {
  const tbody = document.getElementById('reviewsTbody');
  tbody.innerHTML = `<tr><td colspan="5" class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i><p>Loading reviews…</p></td></tr>`;
  try {
    const data = await apiFetch('/api/reviews');
    reviews = data.reviews || [];
    renderReviews();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>${esc(err.message)}</p></div></td></tr>`;
  }
}

function renderReviews() {
  const tbody = document.getElementById('reviewsTbody');
  document.getElementById('reviewsCount').textContent = `${reviews.length} review${reviews.length !== 1 ? 's' : ''}`;
  if (!reviews.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-regular fa-star"></i><p>No reviews yet. Add the first one!</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = reviews.map(r => `
    <tr>
      <td>
        <div class="user-cell">
          <img src="${esc(r.avatar)}" alt="${esc(r.name)}" width="36" height="36"
            style="border-radius:50%;object-fit:cover;flex-shrink:0"
            onerror="this.style.display='none'">
          <div>
            <strong>${esc(r.name)}</strong>
            <div style="font-size:0.78rem;color:var(--text-muted)">${esc(r.role || 'Visitor')}</div>
          </div>
        </div>
      </td>
      <td><span class="stars-display" title="${r.rating}/5 stars">${starsHTML(r.rating)}</span></td>
      <td><div class="msg-text" style="max-width:300px">${esc(r.text)}</div></td>
      <td style="white-space:nowrap">${fmtDate(r.createdAt)}</td>
      <td>
        <div class="td-actions">
          <button class="btn btn-sm btn-ghost" onclick="openEditReview('${r._id}')">
            <i class="fa-regular fa-pen-to-square"></i> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteReview('${r._id}')">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

document.getElementById('addReviewBtn')?.addEventListener('click', () => {
  editReviewId = null;
  document.getElementById('reviewModalTitle').textContent = 'Add New Review';
  document.getElementById('reviewForm').reset();
  openModal('reviewModal');
});

function openEditReview(id) {
  const r = reviews.find(x => x._id === id);
  if (!r) return;
  editReviewId = id;
  document.getElementById('reviewModalTitle').textContent = 'Edit Review';
  document.getElementById('rName').value = r.name || '';
  document.getElementById('rRole').value = r.role || '';
  document.getElementById('rRating').value = r.rating || 5;
  document.getElementById('rText').value = r.text || '';
  document.getElementById('rAvatar').value = r.avatar || '';
  openModal('reviewModal');
}

document.getElementById('reviewForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.querySelector('button[form="reviewForm"]');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving…';

  const body = {
    name: document.getElementById('rName').value,
    role: document.getElementById('rRole').value,
    rating: Number(document.getElementById('rRating').value),
    text: document.getElementById('rText').value,
    avatar: document.getElementById('rAvatar').value,
  };

  try {
    if (editReviewId) {
      await apiFetch(`/api/reviews/${editReviewId}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Review updated!', 'success');
    } else {
      await apiFetch('/api/reviews', { method: 'POST', body: JSON.stringify(body) });
      showToast('Review added!', 'success');
    }
    closeModal('reviewModal');
    await loadReviews();
    updateDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Review';
  }
});

async function deleteReview(id) {
  if (!confirm('Delete this review permanently?')) return;
  try {
    await apiFetch(`/api/reviews/${id}`, { method: 'DELETE' });
    showToast('Review deleted.', 'success');
    await loadReviews();
    updateDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =============================================================================
// STORES
// =============================================================================
let stores = [];
let editStoreId = null;

async function loadStores() {
  const tbody = document.getElementById('storesTbody');
  tbody.innerHTML = `<tr><td colspan="5" class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i><p>Loading stores…</p></td></tr>`;
  try {
    const data = await apiFetch('/api/stores');
    stores = data.stores || [];
    renderStores();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>${esc(err.message)}</p></div></td></tr>`;
  }
}

function renderStores() {
  const tbody = document.getElementById('storesTbody');
  document.getElementById('storesCount').textContent = `${stores.length} store${stores.length !== 1 ? 's' : ''}`;
  if (!stores.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-shop"></i><p>No stores yet.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = stores.map(s => `
    <tr>
      <td>
        <div class="user-cell">
          <div class="avatar-initials" style="background:linear-gradient(135deg,var(--accent-gold),#f97316)">
            <i class="${esc(s.icon)}" style="font-size:0.9rem"></i>
          </div>
          <div>
            <strong>${esc(s.name)}</strong>
            <div style="font-size:0.78rem;color:var(--text-muted)">${esc(s.zone)}</div>
          </div>
        </div>
      </td>
      <td style="color:var(--text-secondary)">${esc(s.floor)}</td>
      <td><div class="msg-text">${esc(s.description)}</div></td>
      <td style="color:var(--accent-gold);font-weight:600">${s.storeCount} units</td>
      <td>
        <div class="td-actions">
          <button class="btn btn-sm btn-ghost" onclick="openEditStore('${s._id}')">
            <i class="fa-regular fa-pen-to-square"></i> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteStore('${s._id}')">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

document.getElementById('addStoreBtn')?.addEventListener('click', () => {
  editStoreId = null;
  document.getElementById('storeModalTitle').textContent = 'Add New Store';
  document.getElementById('storeForm').reset();
  openModal('storeModal');
});

function openEditStore(id) {
  const s = stores.find(x => x._id === id);
  if (!s) return;
  editStoreId = id;
  document.getElementById('storeModalTitle').textContent = 'Edit Store';
  document.getElementById('sName').value = s.name || '';
  document.getElementById('sZone').value = s.zone || '';
  document.getElementById('sFloor').value = s.floor || '';
  document.getElementById('sDesc').value = s.description || '';
  document.getElementById('sIcon').value = s.icon || '';
  document.getElementById('sCount').value = s.storeCount || 0;
  openModal('storeModal');
}

document.getElementById('storeForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.querySelector('button[form="storeForm"]');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving…';

  const body = {
    name: document.getElementById('sName').value,
    zone: document.getElementById('sZone').value,
    floor: document.getElementById('sFloor').value,
    description: document.getElementById('sDesc').value,
    icon: document.getElementById('sIcon').value,
    storeCount: Number(document.getElementById('sCount').value),
  };

  try {
    if (editStoreId) {
      await apiFetch(`/api/stores/${editStoreId}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Store updated!', 'success');
    } else {
      await apiFetch('/api/stores', { method: 'POST', body: JSON.stringify(body) });
      showToast('Store added!', 'success');
    }
    closeModal('storeModal');
    await loadStores();
    updateDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Store';
  }
});

async function deleteStore(id) {
  if (!confirm('Delete this store permanently?')) return;
  try {
    await apiFetch(`/api/stores/${id}`, { method: 'DELETE' });
    showToast('Store deleted.', 'success');
    await loadStores();
    updateDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =============================================================================
// DASHBOARD
// =============================================================================
function updateDashboard() {
  const unread = contacts.filter(c => c.status === 'unread').length;

  document.getElementById('dashTotalContacts').textContent = contacts.length;
  document.getElementById('dashUnreadContacts').textContent = unread;
  document.getElementById('dashTotalReviews').textContent = reviews.length;
  document.getElementById('dashTotalStores').textContent = stores.length;

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '—';
  document.getElementById('dashAvgRating').textContent = avgRating;

  // Recent contacts activity
  const recentContactsList = document.getElementById('recentContactsList');
  const recent = contacts.slice(0, 5);
  recentContactsList.innerHTML = recent.length ? recent.map(c => `
    <div class="activity-item">
      <div class="activity-dot ${c.status === 'unread' ? 'amber' : 'green'}"></div>
      <div>
        <div class="activity-text"><strong>${esc(c.name)}</strong> — ${esc(c.subject)}</div>
        <div class="activity-time">${fmtDate(c.createdAt)} · ${fmtTime(c.createdAt)}</div>
      </div>
      <span class="status-badge ${c.status}" style="font-size:0.7rem;padding:.15rem .45rem">${c.status}</span>
    </div>
  `).join('') : '<div class="empty-state" style="padding:1.5rem"><p>No messages yet.</p></div>';

  // Recent reviews
  const recentReviewsList = document.getElementById('recentReviewsList');
  const recentRevs = reviews.slice(0, 4);
  recentReviewsList.innerHTML = recentRevs.length ? recentRevs.map(r => `
    <div class="activity-item">
      <div class="activity-dot"></div>
      <div>
        <div class="activity-text"><strong>${esc(r.name)}</strong> — <span class="stars-display" style="font-size:0.75rem">${starsHTML(r.rating)}</span></div>
        <div class="activity-time">${esc(r.text?.slice(0, 60))}…</div>
      </div>
    </div>
  `).join('') : '<div class="empty-state" style="padding:1.5rem"><p>No reviews yet.</p></div>';
}

// =============================================================================
// KICK OFF
// =============================================================================
init();
