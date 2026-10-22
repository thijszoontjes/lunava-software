document.querySelectorAll('[data-weekly-view-projection]').forEach((metric) => {
  const baseViews = Number(metric.dataset.baseViews);
  const weeklyIncrease = Number(metric.dataset.weeklyIncrease);
  const startDate = Date.parse(`${metric.dataset.startDate}T00:00:00Z`);
  if (![baseViews, weeklyIncrease, startDate].every(Number.isFinite)) return;

  const completedWeeks = Math.max(0, Math.floor((Date.now() - startDate) / 604800000));
  metric.textContent = `${Math.floor((baseViews + completedWeeks * weeklyIncrease) / 1000).toLocaleString('en-US')}K+`;
});

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
