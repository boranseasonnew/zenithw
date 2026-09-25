const observer = new IntersectionObserver(
  (items) => {
    items.forEach((item) => {
      if (item.isIntersecting) {
        item.target.classList.add("visible");
        observer.unobserve(item.target);
      }
    });
  },
  {
    threshold: 0.14,
  }
);

document
  .querySelectorAll(".reveal")
  .forEach((element) => observer.observe(element));

const hero = document.querySelector(".hero");
const appFrame = document.querySelector(".app-frame");

if (
  hero &&
  appFrame &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();

    const x =
      (event.clientX - rect.left) / rect.width - 0.5;

    const y =
      (event.clientY - rect.top) / rect.height - 0.5;

    appFrame.style.transform =
      `perspective(1100px) ` +
      `rotateX(${(-y * 1.8).toFixed(2)}deg) ` +
      `rotateY(${(x * 2.2).toFixed(2)}deg) ` +
      `translateY(-2px)`;
  });

  hero.addEventListener("pointerleave", () => {
    appFrame.style.transform = "";
  });
}