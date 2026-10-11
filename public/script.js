const carouselSlides = document.querySelectorAll('.carousel-slide');
const carouselContainer = document.querySelector('.carousel-container');

let currentSlide = 0;

setInterval(() => {
  carouselSlides[currentSlide].classList.remove('active');
  currentSlide = (currentSlide + 1) % carouselSlides.length;
  carouselSlides[currentSlide].classList.add('active');
}, 3000);