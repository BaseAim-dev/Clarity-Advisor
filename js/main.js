/* ============================================================
   FACEBOOK CLICK ID — capture fbclid on page load and persist
   ============================================================ */
(function () {
  var fbclid = new URLSearchParams(window.location.search).get('fbclid');
  if (fbclid) {
    var fbc = 'fb.1.' + Date.now() + '.' + fbclid;
    sessionStorage.setItem('_fbc', fbc);
    try {
      document.cookie = '_fbc=' + fbc + ';path=/;max-age=7776000;SameSite=Lax';
    } catch (e) {}
  }
})();

/* ============================================================
   QUALIFICATION MODAL — open / close / steps
   ============================================================ */
let _businessName = '';
let _teamSize     = '';

(function () {
  const modal = document.getElementById('qual-modal');
  if (!modal) return;

  function openModal() {
    showStep(1);
    document.getElementById('qm-business').value = '';
    document.getElementById('qm-err-business').textContent = '';
    document.querySelectorAll('.qm-opt').forEach(b => b.classList.remove('selected'));
    const bookIframe = document.getElementById('qm-booking-iframe');
    if (bookIframe) bookIframe.src = '';
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('qm-business').focus(), 100);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  const steps = document.querySelectorAll('.qm-step');
  const card  = modal.querySelector('.qm-card');
  function showStep(n) {
    steps.forEach((s, i) => s.classList.toggle('is-active', i === n - 1));
    if (card) card.classList.toggle('qm-card-wide', n === 4);
  }
  window._showModalStep = showStep;

  // CTA buttons open modal
  document.querySelectorAll('[data-open-modal]').forEach(btn => {
    btn.addEventListener('click', e => { e.preventDefault(); openModal(); });
  });

  // Close button & backdrop click
  document.getElementById('qm-close').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  // Step 1 → 2
  document.querySelector('.qm-next').addEventListener('click', () => {
    const input = document.getElementById('qm-business');
    const err   = document.getElementById('qm-err-business');
    if (!input.value.trim()) { err.textContent = 'Please enter your business name.'; input.focus(); return; }
    err.textContent = '';
    _businessName = input.value.trim();
    showStep(2);
  });
  document.getElementById('qm-business').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); document.querySelector('.qm-next').click(); }
  });

  // Step 2 options → auto-advance to step 3
  document.querySelectorAll('.qm-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.qm-opt').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      _teamSize = btn.dataset.value;
      setTimeout(() => showStep(3), 300);
    });
  });

  // Back buttons
  document.querySelectorAll('.qm-btn-back').forEach(btn => {
    btn.addEventListener('click', () => showStep(parseInt(btn.dataset.prev)));
  });

  // Expose close for form submit handler
  window._closeQualModal = closeModal;
})();

/* ============================================================
   CTA BUTTONS — (handled by modal above)
   ============================================================ */

/* ============================================================
   CONTACT FORM — validate, send to GHL, reveal booking widget
   ============================================================ */
(function () {
  const form = document.getElementById('cta-form');
  if (!form) return;

  const fields = {
    name:  { el: document.getElementById('f-name'),  err: document.getElementById('err-name') },
    phone: { el: document.getElementById('f-phone'), err: document.getElementById('err-phone') },
    email: { el: document.getElementById('f-email'), err: document.getElementById('err-email') },
  };

  const phoneRe = /^(\+?61|0)[2-9]\d{8}$|^(\+?61|0)4\d{8}$/;

  function validate(id) {
    const { el, err } = fields[id];
    const val = el.value.trim();
    let msg = '';

    if (id === 'name') {
      if (!val) msg = 'Please enter your full name.';
      else if (val.length < 2) msg = 'Name must be at least 2 characters.';
    } else if (id === 'email') {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!val) msg = 'Please enter your email address.';
      else if (!emailRe.test(val)) msg = 'Please enter a valid email address (e.g. name@example.com).';
    } else if (id === 'phone') {
      const digits = val.replace(/[\s\-().]/g, '');
      if (!digits) msg = 'Please enter your phone number.';
      else if (!phoneRe.test(digits)) msg = 'Please enter a valid Australian number (e.g. 0412 345 678).';
    }

    err.textContent = msg;
    el.classList.toggle('invalid', !!msg);
    el.classList.toggle('valid', !msg && val.length > 0);
    return !msg;
  }

  Object.keys(fields).forEach(id => {
    fields[id].el.addEventListener('blur', () => validate(id));
    fields[id].el.addEventListener('input', () => {
      if (fields[id].el.classList.contains('invalid')) validate(id);
    });
  });

  const GHL_WEBHOOK = 'https://services.leadconnectorhq.com/hooks/OgNkyxOT5jOvbkaU5DdM/webhook-trigger/84a02646-f320-432a-a28a-ac9c4e099212';

  form.addEventListener('submit', e => {
    e.preventDefault();
    const valid = Object.keys(fields).map(id => validate(id)).every(Boolean);
    if (!valid) return;

    const submitBtn = form.querySelector('.cta-form-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    const fullName  = fields.name.el.value.trim();
    const nameParts = fullName.split(/\s+/);
    const email     = fields.email.el.value.trim();
    const phone     = fields.phone.el.value.trim();

    // Persist for Schedule CAPI on thank-you page (phone is not in GHL redirect URL)
    try {
      sessionStorage.setItem('_ca_email', email);
      sessionStorage.setItem('_ca_name',  fullName);
      sessionStorage.setItem('_ca_phone', phone);
    } catch (_) {}

    // Unique event ID so browser pixel + CAPI are deduplicated by Meta
    const eventId = 'lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

    // Read Facebook browser ID and click ID from cookies
    function getCookie(name) {
      var m = document.cookie.match('(^|;)\\s*' + name + '=([^;]+)');
      return m ? m[2] : '';
    }
    const fbp = getCookie('_fbp');
    const fbc = getCookie('_fbc')
      || sessionStorage.getItem('_fbc')
      || (function () {
           var fbclid = new URLSearchParams(window.location.search).get('fbclid');
           return fbclid ? 'fb.1.' + Date.now() + '.' + fbclid : '';
         })();

    // Meta Pixel — browser-side Lead event
    if (typeof fbq === 'function') {
      fbq('track', 'Lead', { content_name: 'Free Tax Review' }, { eventID: eventId });
    }

    Promise.allSettled([
      // GHL webhook — creates the contact
      fetch(GHL_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name:    nameParts[0] || fullName,
          last_name:     nameParts.slice(1).join(' ') || '',
          email:         email,
          phone:         phone,
          business_name: _businessName,
          team_size:     _teamSize,
          source:        'Landing Page — Free Review Form',
          funnel_stage:  'Lead',
        }),
        keepalive: true,
      }),
      // CAPI — server-side Lead event for Meta
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name:        'Lead',
          event_id:          eventId,
          email:             email,
          phone:             phone,
          first_name:        nameParts[0] || fullName,
          last_name:         nameParts.slice(1).join(' ') || '',
          event_source_url:  window.location.href,
          client_user_agent: navigator.userAgent,
          fbp:               fbp,
          fbc:               fbc,
        }),
        keepalive: true,
      }),
    ]).finally(() => {
      // Load booking widget in step 4 with contact data pre-filled
      const params = new URLSearchParams({
        first_name:   nameParts[0] || fullName,
        last_name:    nameParts.slice(1).join(' ') || '',
        email:        email,
        phone:        phone,
        phone_number: phone,
        phoneNumber:  phone,
      });
      const bookIframe = document.getElementById('qm-booking-iframe');
      if (bookIframe) {
        bookIframe.src = 'https://crm.clarityadvisor.au/widget/booking/O4sOXXeLuFvCYic2BkXA?' + params.toString();
      }
      if (window._showModalStep) window._showModalStep(4);
    });
  });
})();

/* ============================================================
   MODAL BOOKING IFRAME — auto-resize via GHL postMessage
   ============================================================ */
window.addEventListener('message', function (e) {
  var iframe = document.getElementById('qm-booking-iframe');
  if (!iframe || !iframe.src) return;
  try {
    var data = (typeof e.data === 'string') ? JSON.parse(e.data) : e.data;
    var h = data && (data.height || data.value || (data.data && data.data.height));
    if (h && parseInt(h) > 100) {
      iframe.style.height = (parseInt(h) + 60) + 'px';
    }
  } catch (_) {}
});

/* ============================================================
   FAQ ACCORDION
   ============================================================ */
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');

    // close all open items
    document.querySelectorAll('.faq-item.open').forEach(el => {
      el.classList.remove('open');
      el.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });

    // open the clicked item if it wasn't already open
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

/* ============================================================
   STICKY HEADER — add shadow on scroll
   ============================================================ */
const header = document.querySelector('.site-header');
if (header) {
  window.addEventListener('scroll', () => {
    header.style.boxShadow = window.scrollY > 10
      ? '0 2px 16px rgba(0,0,0,0.08)'
      : 'none';
  }, { passive: true });
}

/* ============================================================
   HERO STATS — count-up with ease-out deceleration
   ============================================================ */
(function () {
  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function runCounter(el) {
    const target   = parseFloat(el.dataset.target);
    const prefix   = el.dataset.prefix   || '';
    const suffix   = el.dataset.suffix   || '';
    const decimals = parseInt(el.dataset.decimals) || 0;
    const duration = 2200;
    const start    = performance.now();

    function tick(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const value    = easeOutQuart(progress) * target;
      el.textContent = prefix + value.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  const heroStats = document.querySelector('.hero-stats');
  if (!heroStats) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setTimeout(() => {
        heroStats.querySelectorAll('.hero-stat-val[data-target]').forEach(runCounter);
      }, 350);
    },
    { threshold: 0.6 }
  );
  observer.observe(heroStats);
})();

/* ============================================================
   OLD WAY / NEW WAY — directional reveal animation
   ============================================================ */
const vp1Section = document.querySelector('.vp1-section');
if (vp1Section) {
  new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        vp1Section.classList.add('is-visible');
      }
    },
    { threshold: 0.12 }
  ).observe(vp1Section);
}

/* ============================================================
   SOCIAL PROOF — staggered entrance animation
   ============================================================ */
const proofSection = document.querySelector('.proof-section');
if (proofSection) {
  new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        proofSection.classList.add('is-visible');
      }
    },
    { threshold: 0.08 }
  ).observe(proofSection);
}

/* ============================================================
   INSIDE THE CALL — scroll-triggered entrance
   ============================================================ */
const itcSection = document.querySelector('.itc-section');
if (itcSection) {
  new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        itcSection.classList.add('is-visible');
      }
    },
    { threshold: 0.06 }
  ).observe(itcSection);
}

/* ============================================================
   WHEN TIMING MATTERS — scroll-triggered card entrance
   ============================================================ */
const whoSection = document.querySelector('.who-section');
if (whoSection) {
  new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        whoSection.classList.add('is-visible');
      }
    },
    { threshold: 0.12 }
  ).observe(whoSection);
}

/* ============================================================
   HOW IT WORKS — scroll-triggered timeline animation
   ============================================================ */
const howSteps = document.querySelector('.how-steps');
if (howSteps) {
  new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        howSteps.classList.add('is-visible');
      }
    },
    { threshold: 0.15 }
  ).observe(howSteps);
}

/* ============================================================
   SMOOTH SCROLL for all internal anchor links
   ============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    if (link.hasAttribute('data-open-modal')) { e.preventDefault(); return; } // modal IIFE handles these
    const id = link.getAttribute('href');
    if (id === '#') return;
    const target = document.querySelector(id);
    if (target) {
      e.preventDefault();
      const headerH = header ? header.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerH - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});
