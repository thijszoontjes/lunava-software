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
  const measurementId = 'G-8890ZF2NTH';
  const storageKey = 'lunava-analytics-consent';
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
      <h2 id="analytics-consent-title">Help improve this website?</h2>
      <p>With your permission, Google Analytics measures visits to Lunava Software. Analytics stays off unless you accept. You can change your choice at any time. <a href="/privacy/">Read about privacy and analytics</a>.</p>
    </div>
    <div class="analytics-consent__actions" role="group" aria-label="Analytics choice">
      <button type="button" data-analytics-reject>Reject analytics</button>
      <button type="button" data-analytics-accept>Accept analytics</button>
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
