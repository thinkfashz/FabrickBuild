const year = document.querySelector('#year')
if (year) year.textContent = new Date().getFullYear()

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
        observer.unobserve(entry.target)
      }
    })
  },
  { threshold: 0.13 },
)

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element))
