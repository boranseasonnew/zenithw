const observer = new IntersectionObserver((items) => {
  items.forEach((item) => { if (item.isIntersecting) item.target.classList.add('visible'); });
}, { threshold: 0.16 });
document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
