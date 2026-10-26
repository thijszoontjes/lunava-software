if (!('IntersectionObserver' in window)) {
  document.documentElement.classList.remove('js');
} else if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('[data-reveal]').forEach((item) => item.classList.add('is-in'));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
  document.querySelectorAll('[data-reveal]').forEach((item) => observer.observe(item));
}

(() => {
  const faqList = document.querySelector('.saluun-faq-list');
  if (!faqList) return;

  const closingDetails = new WeakMap();
  faqList.addEventListener('click', (event) => {
    const summary = event.target.closest('summary');
    const details = summary?.closest('details');
    if (!details || !faqList.contains(details)) return;

    const closing = closingDetails.get(details);
    if (closing) {
      event.preventDefault();
      details.classList.remove('is-closing');
      closing.answer.removeEventListener('transitionend', closing.onTransitionEnd);
      window.clearTimeout(closing.timer);
      closingDetails.delete(details);
      return;
    }

    if (!details.open) return;
    event.preventDefault();

    const answer = details.querySelector('.saluun-faq-answer');
    if (!answer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      details.open = false;
      return;
    }

    details.classList.add('is-closing');
    let timer;
    const finishClose = () => {
      answer.removeEventListener('transitionend', onTransitionEnd);
      window.clearTimeout(timer);
      details.open = false;
      details.classList.remove('is-closing');
      closingDetails.delete(details);
    };
    const onTransitionEnd = (transitionEvent) => {
      if (transitionEvent.target === answer && transitionEvent.propertyName === 'grid-template-rows') {
        finishClose();
      }
    };

    answer.addEventListener('transitionend', onTransitionEnd);
    timer = window.setTimeout(finishClose, 600);
    closingDetails.set(details, { answer, onTransitionEnd, timer });
  });
})();

(() => {
  const isDutch = document.documentElement.lang.toLowerCase().startsWith('nl');
  document.querySelectorAll('.site-header').forEach((header) => {
    const toggle = header.querySelector('.nav-toggle');
    const nav = header.querySelector('.nav');
    if (!toggle || !nav) return;

    header.classList.add('nav-ready');
    const setOpen = (open, returnFocus = false) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', isDutch
        ? (open ? 'Sluit het navigatiemenu' : 'Open het navigatiemenu')
        : (open ? 'Close navigation menu' : 'Open navigation menu'));
      nav.classList.toggle('is-open', open);
      if (returnFocus) toggle.focus();
    };

    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('pointerdown', (event) => {
      if (toggle.getAttribute('aria-expanded') === 'true' && !header.contains(event.target)) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
    });

    const desktop = window.matchMedia('(min-width: 621px)');
    const closeAtDesktop = (event) => { if (event.matches) setOpen(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', closeAtDesktop);
    else desktop.addListener(closeAtDesktop);
  });
})();

(() => {
  const measurementId = 'G-8890ZF2NTH';
  const storageKey = 'lunava-analytics-consent';
  const isDutch = document.documentElement.lang.toLowerCase().startsWith('nl');
  const consentCopy = isDutch ? {
    title: 'Help deze website te verbeteren?',
    message: 'Met je toestemming meet Google Analytics bezoeken aan Lunava Software. Analytics blijft uit totdat je toestemming geeft. Je kunt je keuze op elk moment aanpassen.',
    link: 'Lees meer over privacy en analytics',
    group: 'Analyticskeuze',
    reject: 'Weiger analytics',
    accept: 'Sta analytics toe'
  } : {
    title: 'Help improve this website?',
    message: 'With your permission, Google Analytics measures visits to Lunava Software. Analytics stays off unless you accept. You can change your choice at any time.',
    link: 'Read about privacy and analytics',
    group: 'Analytics choice',
    reject: 'Reject analytics',
    accept: 'Accept analytics'
  };
  const deniedConsent = {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  };
  let analyticsLoaded = false;

  const banner = document.createElement('aside');
  banner.className = 'analytics-consent';
  banner.setAttribute('aria-labelledby', 'analytics-consent-title');
  banner.setAttribute('aria-live', 'polite');
  banner.setAttribute('role', 'region');
  banner.hidden = true;
  banner.innerHTML = `
    <div class="analytics-consent__copy">
      <h2 id="analytics-consent-title">${consentCopy.title}</h2>
      <p>${consentCopy.message} <a href="/privacy/">${consentCopy.link}</a>.</p>
    </div>
    <div class="analytics-consent__actions" role="group" aria-label="${consentCopy.group}">
      <button type="button" data-analytics-reject>${consentCopy.reject}</button>
      <button type="button" data-analytics-accept>${consentCopy.accept}</button>
    </div>`;
  document.body.append(banner);

  function getChoice() {
    try { return window.localStorage.getItem(storageKey); } catch { return null; }
  }

  function saveChoice(choice) {
    try { window.localStorage.setItem(storageKey, choice); } catch { /* The choice still applies for this page. */ }
  }

  function loadAnalytics() {
    if (analyticsLoaded) return;
    analyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', deniedConsent);
    window.gtag('consent', 'update', { ...deniedConsent, analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.append(script);
  }

  function clearAnalyticsCookies() {
    document.cookie.split(';').map((cookie) => cookie.trim().split('=')[0])
      .filter((name) => name === '_ga' || name === '_ga_8890ZF2NTH')
      .forEach((name) => {
        document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
        document.cookie = `${name}=; Max-Age=0; path=/; domain=.lunavasoftware.nl; SameSite=Lax`;
      });
  }

  function choose(choice) {
    const previousChoice = getChoice();
    saveChoice(choice);
    banner.hidden = true;

    if (choice === 'granted') {
      loadAnalytics();
      return;
    }

    if (analyticsLoaded || previousChoice === 'granted') {
      window.gtag?.('consent', 'update', deniedConsent);
      clearAnalyticsCookies();
      window.location.reload();
    }
  }

  const choice = getChoice();
  if (choice === 'granted') loadAnalytics();
  else if (choice !== 'denied') banner.hidden = false;

  banner.querySelector('[data-analytics-accept]').addEventListener('click', () => choose('granted'));
  banner.querySelector('[data-analytics-reject]').addEventListener('click', () => choose('denied'));
  document.querySelectorAll('[data-analytics-settings]').forEach((button) => {
    button.addEventListener('click', () => {
      banner.hidden = false;
      banner.querySelector('[data-analytics-accept]').focus();
    });
  });
})();
