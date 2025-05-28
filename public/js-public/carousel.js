const slides = document.querySelectorAll('.slide');
const carousel = document.querySelector('.carousel');
let current = 0;
let interval = setInterval(showNextSlide, 6000);

// === Slide Navigation ===
function showSlide(index) {
  slides[current].classList.remove('active');
  current = (index + slides.length) % slides.length;
  slides[current].classList.add('active');
}

function showNextSlide() {
  showSlide(current + 1);
}

function showPrevSlide() {
  showSlide(current - 1);
}

// === Manual Arrow Controls ===
document.querySelectorAll('.nav-arrow').forEach(arrow => {
  arrow.addEventListener('click', () => {
    clearInterval(interval);
    interval = setInterval(showNextSlide, 6000);
  });
});

document.querySelector('.nav-arrow.left')?.addEventListener('click', showPrevSlide);
document.querySelector('.nav-arrow.right')?.addEventListener('click', showNextSlide);

// === Pause on Hover ===
carousel.addEventListener('mouseenter', () => clearInterval(interval));
carousel.addEventListener('mouseleave', () => {
  interval = setInterval(showNextSlide, 6000);
});

// === Swipe Support (Touch Devices) ===
let startX = 0;
let endX = 0;

carousel.addEventListener('touchstart', e => {
  startX = e.touches[0].clientX;
});

carousel.addEventListener('touchend', e => {
  endX = e.changedTouches[0].clientX;
  const diff = startX - endX;
  if (Math.abs(diff) > 50) {
    if (diff > 0) {
      showNextSlide();
    } else {
      showPrevSlide();
    }
    clearInterval(interval);
    interval = setInterval(showNextSlide, 6000);
  }
});
