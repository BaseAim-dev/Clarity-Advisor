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
   INLINE FORM — scroll CTA buttons to the form
   ============================================================ */
(function () {
  const form = document.getElementById('cta-form');

  document.querySelectorAll('[data-open-modal]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const target = document.getElementById('book-review');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
          const first = target.querySelector('input, select, textarea');
          if (first) first.focus();
        }, 600);
      }
    });
  });

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
    const payload = JSON.stringify({
      first_name:    nameParts[0] || fullName,
      last_name:     nameParts.slice(1).join(' ') || '',
      email:         email,
      phone:         phone,
      source:        'Landing Page — Free Review Form',
      funnel_stage:  'Lead',
    });

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

    // Persist user data so the thank-you page CAPI call can include it
    // even when GHL doesn't forward params in the redirect URL
    try {
      sessionStorage.setItem('_ca_name',  fullName);
      sessionStorage.setItem('_ca_email', email);
      sessionStorage.setItem('_ca_phone', phone);
    } catch (e) {}

    // Fire GHL webhook + CAPI in parallel; then reveal booking widget
    Promise.allSettled([
      fetch(GHL_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }),
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
      // Hide form, show success message + booking widget
      form.hidden = true;
      const successEl = document.getElementById('cta-form-success');
      const widgetEl  = document.getElementById('inline-booking-widget');
      const iframe    = document.getElementById('booking-iframe');

      if (successEl) successEl.hidden = false;

      if (iframe && widgetEl) {
        const params = new URLSearchParams({
          first_name:   nameParts[0] || fullName,
          last_name:    nameParts.slice(1).join(' ') || '',
          email:        email,
          phone:        phone,
          phone_number: phone,
          phoneNumber:  phone,
        });
        iframe.src = 'https://crm.clarityadvisor.au/widget/booking/O4sOXXeLuFvCYic2BkXA?' + params.toString();
        widgetEl.hidden = false;
      }

      // Scroll to success message
      if (successEl) successEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();

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
