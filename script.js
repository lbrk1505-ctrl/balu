// =============================================================================
// script.js  —  Star City Mall Frontend Logic
// -----------------------------------------------------------------------------
// LEARN: This file handles ALL browser-side interactions.
//        Key additions over the original:
//         • fetch() API → sends form data to our Node.js server → MongoDB
//         • fetch() API → loads reviews dynamically from MongoDB
//         • Loading states, error states, and retry logic
// =============================================================================

// LEARN: DOMContentLoaded fires when the HTML is fully parsed (before images
//        load). It's safer than window.onload for wiring up event listeners.
document.addEventListener('DOMContentLoaded', () => {

  // ─── SERVER BASE URL ───────────────────────────────────────────────────────
  // LEARN: When the site is served by our Node.js server (localhost:3000),
  //        we use an empty string '' as the base URL so API calls go to the
  //        SAME origin — no CORS issues.
  //        If the frontend is on a different port (e.g., live server on 5500),
  //        change this to 'http://localhost:3000'
  const API_BASE = '';

  /* ==========================================================================
     1. Theme Switcher (Light / Dark Mode)
     ========================================================================== */
  const themeToggle = document.getElementById('themeToggle');

  // LEARN: localStorage persists data across browser sessions.
  //        We check: 1. Saved preference, 2. OS preference (prefers-color-scheme)
  const currentTheme = localStorage.getItem('theme') ||
                       (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  document.documentElement.setAttribute('data-theme', currentTheme);

  themeToggle.addEventListener('click', () => {
    const theme    = document.documentElement.getAttribute('data-theme');
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  });

  /* ==========================================================================
     2. Sticky Header & Active Nav Link Highlighter (Scroll-Spy)
     ========================================================================== */
  const header      = document.getElementById('header');
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  const sections    = document.querySelectorAll('section[id]');
  const navItems    = document.querySelectorAll('.nav-item');

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;

    // Glassmorphism effect kicks in when user scrolls down
    header.classList.toggle('scrolled', scrollY > 50);

    // Show/hide the back-to-top floating button
    scrollTopBtn.classList.toggle('visible', scrollY > 300);

    // Scroll-spy: highlight the nav link for the currently visible section
    sections.forEach(section => {
      const sectionTop    = section.offsetTop - 100;
      const sectionBottom = sectionTop + section.offsetHeight;

      if (scrollY >= sectionTop && scrollY < sectionBottom) {
        navItems.forEach(item => {
          item.classList.remove('active');
          if (item.getAttribute('href') === `#${section.id}`) {
            item.classList.add('active');
          }
        });
      }
    });
  });

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ==========================================================================
     3. Mobile Navigation Burger Menu
     ========================================================================== */
  const burgerMenu = document.getElementById('burgerMenu');
  const navLinks   = document.getElementById('navLinks');

  burgerMenu.addEventListener('click', () => {
    burgerMenu.classList.toggle('active');
    navLinks.classList.toggle('active');
  });

  // Close the drawer when any nav link is clicked
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      burgerMenu.classList.remove('active');
      navLinks.classList.remove('active');
    });
  });

  /* ==========================================================================
     4. Stats Counter Animation (IntersectionObserver API)
     LEARN: IntersectionObserver watches for elements entering the viewport.
            We use it to trigger the count-up only when the user scrolls to
            the stats section — saving CPU when it's off-screen.
     ========================================================================== */
  const statsSection      = document.getElementById('stats');
  const statNumbers       = document.querySelectorAll('.stat-number');
  let   animationTriggered = false;

  const animateCounters = () => {
    statNumbers.forEach(stat => {
      const target   = parseInt(stat.getAttribute('data-target'), 10);
      const duration = 2000; // 2 seconds total animation
      let   startTime = null;

      // LEARN: Different formatting rules per counter
      const formatNumber = (num) => {
        if (target === 25000) return `${Math.floor(num / 1000)}K+`;
        if (target === 7978)  return `${(num / 1000).toFixed(1)}K+`;
        return `${Math.floor(num)}+`;
      };

      // LEARN: requestAnimationFrame gives us smooth 60fps animation.
      //        Each frame, we calculate progress (0 → 1) and interpolate.
      const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress   = Math.min((timestamp - startTime) / duration, 1);
        const currentVal = progress * target;
        stat.textContent = formatNumber(currentVal);

        if (progress < 1) window.requestAnimationFrame(step);
        else stat.textContent = formatNumber(target); // snap to exact final value
      };

      window.requestAnimationFrame(step);
    });
  };

  const statsObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animationTriggered) {
        animationTriggered = true;
        animateCounters();
        observer.unobserve(entry.target); // stop watching once triggered
      }
    });
  }, { threshold: 0.15 });

  if (statsSection) statsObserver.observe(statsSection);

  /* ==========================================================================
     5. Reviews Carousel — Loaded Dynamically from MongoDB
     LEARN: fetch() is the modern browser API for making HTTP requests.
            It returns a Promise. We use async/await for cleaner syntax.
            The reviews are stored in MongoDB (balaji.reviews) and served by
            our Node.js server at GET /api/reviews.
     ========================================================================== */

  // ── 5a. Build review slide HTML from a MongoDB document ──────────────────
  // LEARN: Template literals (backticks) allow multi-line HTML strings with
  //        embedded variables using ${...} — much cleaner than string concat.
  const createReviewSlideHTML = (review) => {
    // Build star icons based on the rating field from MongoDB
    const fullStars  = Math.floor(review.rating || 5);
    const halfStar   = (review.rating % 1) >= 0.5;
    let   starsHTML  = '';

    for (let i = 0; i < fullStars; i++) {
      starsHTML += '<i class="fa-solid fa-star"></i>';
    }
    if (halfStar) starsHTML += '<i class="fa-regular fa-star-half-stroke"></i>';
    for (let i = fullStars + (halfStar ? 1 : 0); i < 5; i++) {
      starsHTML += '<i class="fa-regular fa-star"></i>';
    }

    return `
      <div class="review-slide">
        <img 
          src="${escapeHTML(review.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(review.name))}" 
          alt="${escapeHTML(review.name)}" 
          class="review-avatar"
          onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(review.name)}&background=2563EB&color=fff'"
        >
        <div class="review-stars">${starsHTML}</div>
        <blockquote class="review-text">"${escapeHTML(review.text)}"</blockquote>
        <cite class="review-author">${escapeHTML(review.name)}</cite>
        <span class="review-role">${escapeHTML(review.role || 'Mall Visitor')}</span>
      </div>
    `;
  };

  // LEARN: Security — always escape HTML before inserting user-generated content
  //        into the DOM to prevent XSS (Cross-Site Scripting) attacks.
  const escapeHTML = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  // ── 5b. Rebuild the carousel dots after dynamic content loads ────────────
  const buildCarouselDots = (count, dotsContainer) => {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('span');
      dot.className    = `carousel-dot${i === 0 ? ' active' : ''}`;
      dot.dataset.slide = i;
      dotsContainer.appendChild(dot);
    }
  };

  // ── 5c. Initialize the carousel interaction logic ─────────────────────────
  const initCarousel = (track, dotsContainer) => {
    const slides     = Array.from(track.children);
    const nextButton = document.querySelector('.carousel-btn-next');
    const prevButton = document.querySelector('.carousel-btn-prev');

    if (!slides.length) return;

    let currentIndex  = 0;
    let autoplayTimer = null;

    const getDots = () => Array.from(dotsContainer.children);

    const updateSlide = () => {
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
      getDots().forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
    };

    const next = () => { currentIndex = (currentIndex + 1) % slides.length; updateSlide(); };
    const prev = () => { currentIndex = (currentIndex - 1 + slides.length) % slides.length; updateSlide(); };

    const startAutoplay = () => { autoplayTimer = setInterval(next, 6000); };
    const stopAutoplay  = () => { clearInterval(autoplayTimer); };
    const resetAutoplay = () => { stopAutoplay(); startAutoplay(); };

    nextButton?.addEventListener('click', () => { next(); resetAutoplay(); });
    prevButton?.addEventListener('click', () => { prev(); resetAutoplay(); });

    dotsContainer.addEventListener('click', (e) => {
      const dot = e.target.closest('.carousel-dot');
      if (!dot) return;
      currentIndex = parseInt(dot.dataset.slide, 10);
      updateSlide();
      resetAutoplay();
    });

    // Pause on hover
    const container = document.querySelector('.reviews-carousel-container');
    container?.addEventListener('mouseenter', stopAutoplay);
    container?.addEventListener('mouseleave', startAutoplay);

    // Touch / swipe support
    let startX = 0, isDragging = false;
    const onStart = (e) => { startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX; isDragging = true; };
    const onMove  = (e) => {
      if (!isDragging) return;
      const diff = startX - (e.type === 'touchmove' ? e.touches[0].clientX : e.clientX);
      if (Math.abs(diff) > 80) { diff > 0 ? next() : prev(); isDragging = false; resetAutoplay(); }
    };
    const onEnd = () => { isDragging = false; };

    track.addEventListener('touchstart', onStart, { passive: true });
    track.addEventListener('touchmove',  onMove,  { passive: true });
    track.addEventListener('touchend',   onEnd);
    track.addEventListener('mousedown',  onStart);
    track.addEventListener('mousemove',  onMove);
    track.addEventListener('mouseup',    onEnd);
    track.addEventListener('mouseleave', onEnd);

    startAutoplay();
  };

  // ── 5d. Fetch reviews from MongoDB via our Node.js API ───────────────────
  // LEARN: async functions always return a Promise.
  //        await pauses execution until the Promise resolves.
  //        try/catch handles network failures or server errors gracefully.
  async function loadReviewsFromMongoDB() {
    const track         = document.getElementById('reviewsTrack');
    const dotsContainer = document.getElementById('carouselDots');
    if (!track || !dotsContainer) return;

    // Show a loading skeleton while fetch is in progress
    track.innerHTML = `
      <div class="review-slide">
        <div style="text-align:center; color: var(--text-muted); padding: 3rem;">
          <i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem; margin-bottom:1rem;"></i>
          <p>Loading reviews from database…</p>
        </div>
      </div>
    `;
    dotsContainer.innerHTML = '';

    try {
      // LEARN: fetch() sends a GET request. The second arg is the options object.
      //        By default, fetch() sends a GET — no options needed here.
      const response = await fetch(`${API_BASE}/api/reviews`);

      // LEARN: response.ok is true for 2xx status codes.
      //        response.json() parses the JSON body — also returns a Promise.
      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const data = await response.json();

      if (!data.success || !data.reviews.length) {
        throw new Error('No reviews available');
      }

      // Render all slides from MongoDB data
      track.innerHTML = data.reviews.map(createReviewSlideHTML).join('');

      // Rebuild dots to match the number of reviews from DB
      buildCarouselDots(data.reviews.length, dotsContainer);

      // Wire up all carousel interactions
      initCarousel(track, dotsContainer);

      console.log(`✅ Loaded ${data.reviews.length} reviews from MongoDB`);

    } catch (err) {
      // LEARN: Always handle network/fetch errors — the server might be offline
      console.warn('⚠️ Could not load reviews from MongoDB:', err.message);
      console.warn('   Falling back to static HTML reviews already in the DOM');

      // Fallback: restore the static reviews hard-coded in index.html
      // This means the site still works even if the Node server is not running
      track.innerHTML = `
        <div class="review-slide">
          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80" alt="Sarah Jenkins" class="review-avatar">
          <div class="review-stars">
            <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
          </div>
          <blockquote class="review-text">"Amazing shopping experience! Star City Mall has all my favorite brands under one roof. The food court is exceptional and the interior is beautiful."</blockquote>
          <cite class="review-author">Sarah Jenkins</cite>
          <span class="review-role">Fashion Enthusiast</span>
        </div>
        <div class="review-slide">
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80" alt="David Chen" class="review-avatar">
          <div class="review-stars">
            <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
            <i class="fa-regular fa-star"></i>
          </div>
          <blockquote class="review-text">"The electronics section is top-notch. The staff guidance was amazing and the EV charging stations are very convenient."</blockquote>
          <cite class="review-author">David Chen</cite>
          <span class="review-role">Tech Consultant</span>
        </div>
        <div class="review-slide">
          <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80" alt="Amanda Miller" class="review-avatar">
          <div class="review-stars">
            <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
          </div>
          <blockquote class="review-text">"A perfect place for a family weekend! My kids loved the play zone, and the IMAX cinema was absolutely incredible. Truly premium!"</blockquote>
          <cite class="review-author">Amanda Miller</cite>
          <span class="review-role">Family Visitor</span>
        </div>
      `;
      buildCarouselDots(3, dotsContainer);
      initCarousel(track, dotsContainer);
    }
  }

  // Trigger review loading immediately
  loadReviewsFromMongoDB();

  /* ==========================================================================
     6. Contact Form — Real-time Validation + POST to MongoDB via fetch()
     LEARN: The form data is validated in the browser first (fast feedback),
            then sent to our Node.js server using fetch() which stores it in
            MongoDB's "balaji.contacts" collection.
     ========================================================================== */
  const contactForm       = document.getElementById('contactForm');
  const userName          = document.getElementById('userName');
  const userEmail         = document.getElementById('userEmail');
  const userSubject       = document.getElementById('userSubject');
  const userMessage       = document.getElementById('userMessage');
  const formSuccessBanner = document.getElementById('formSuccessBanner');
  const submitBtn         = contactForm?.querySelector('.btn-submit');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Helper: show or clear field error state
  const setFieldError = (element, errorId, hasError) => {
    const group   = element.closest('.form-group');
    const errorEl = document.getElementById(errorId);
    group.classList.toggle('error',   hasError);
    group.classList.toggle('success', !hasError);
    if (errorEl) errorEl.style.display = hasError ? 'block' : 'none';
  };

  const validateName    = () => { const v = userName.value.trim();    const ok = v.length >= 3;                  setFieldError(userName,    'nameError',    !ok); return ok; };
  const validateEmail   = () => { const v = userEmail.value.trim();   const ok = emailRegex.test(v);             setFieldError(userEmail,   'emailError',   !ok); return ok; };
  const validateSubject = () => { const v = userSubject.value.trim(); const ok = v.length >= 5;                  setFieldError(userSubject, 'subjectError', !ok); return ok; };
  const validateMessage = () => { const v = userMessage.value.trim(); const ok = v.length >= 15;                 setFieldError(userMessage, 'messageError', !ok); return ok; };

  // Real-time feedback — validate as user types or leaves a field
  userName.addEventListener('input', validateName);      userName.addEventListener('blur', validateName);
  userEmail.addEventListener('input', validateEmail);    userEmail.addEventListener('blur', validateEmail);
  userSubject.addEventListener('input', validateSubject);userSubject.addEventListener('blur', validateSubject);
  userMessage.addEventListener('input', validateMessage);userMessage.addEventListener('blur', validateMessage);

  // ── Form Submit — send data to MongoDB via our API ────────────────────────
  contactForm?.addEventListener('submit', async (e) => {
    e.preventDefault(); // stop default browser form submission (page reload)

    // 1. Run all validators first
    const isValid = [validateName(), validateEmail(), validateSubject(), validateMessage()].every(Boolean);
    if (!isValid) return; // stop here if any field is invalid

    // 2. Show loading state on the button
    const originalBtnContent = submitBtn.innerHTML;
    submitBtn.disabled   = true;
    submitBtn.innerHTML  = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending…';

    // 3. Build the payload object to send to MongoDB
    const payload = {
      name:    userName.value.trim(),
      email:   userEmail.value.trim(),
      subject: userSubject.value.trim(),
      message: userMessage.value.trim(),
    };

    try {
      // LEARN: fetch() with method: 'POST' sends data to the server.
      //        Content-Type: 'application/json' tells the server we're sending JSON.
      //        JSON.stringify(payload) converts the JS object → JSON string.
      const response = await fetch(`${API_BASE}/api/contact`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      // LEARN: Parse the server's JSON response
      const data = await response.json();

      if (!response.ok || !data.success) {
        // Server returned an error (validation failed server-side, DB error, etc.)
        throw new Error(data.error || data.errors?.join(', ') || 'Submission failed');
      }

      // 4. SUCCESS — show the green banner, reset the form
      formSuccessBanner.classList.add('active');
      formSuccessBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      contactForm.reset();
      document.querySelectorAll('.form-group').forEach(g => g.classList.remove('success', 'error'));

      console.log('✅ Contact form saved to MongoDB:', data);

      // Auto-hide the success banner after 8 seconds
      setTimeout(() => formSuccessBanner.classList.remove('active'), 8000);

    } catch (err) {
      // LEARN: Network error (server offline) OR server returned an error body
      console.error('❌ Form submission error:', err.message);

      // Show an inline error message below the submit button
      let errorDiv = document.getElementById('formNetworkError');
      if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'formNetworkError';
        errorDiv.style.cssText = 'color:#EF4444;text-align:center;margin-top:1rem;font-size:0.9rem;font-weight:600;';
        submitBtn.parentElement.insertAdjacentElement('afterend', errorDiv);
      }
      errorDiv.textContent = `⚠️ ${err.message}. Please try again or email us directly.`;
      setTimeout(() => { if (errorDiv) errorDiv.textContent = ''; }, 6000);

    } finally {
      // LEARN: "finally" always runs — restore the button state regardless of outcome
      submitBtn.disabled  = false;
      submitBtn.innerHTML = originalBtnContent;
    }
  });

});
