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
