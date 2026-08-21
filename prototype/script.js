const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Tutup menu' : 'Buka menu');
});

navigation?.addEventListener('click', (event) => {
  if (event.target.matches('a')) {
    navigation.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
  }
});

const installButton = document.querySelector('.install-command');
installButton?.addEventListener('click', async () => {
  const text = installButton.dataset.copy;
  try {
    await navigator.clipboard.writeText(text);
    installButton.querySelector('em').textContent = 'Copied!';
    window.setTimeout(() => {
      installButton.querySelector('em').textContent = 'Copy';
    }, 1800);
  } catch {
    installButton.querySelector('em').textContent = text;
  }
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll('.reveal').forEach((item) => revealObserver.observe(item));

const cards = [...document.querySelectorAll('.testimonial-card')];
const dots = document.querySelector('.testimonial-dots');
let activeTestimonial = 0;

cards.forEach((_, index) => {
  const dot = document.createElement('button');
  dot.type = 'button';
  dot.setAttribute('aria-label', `Tampilkan testimonial ${index + 1}`);
  dot.addEventListener('click', () => showTestimonial(index));
  dots?.append(dot);
});

function showTestimonial(index) {
  activeTestimonial = index;
  cards.forEach((card, cardIndex) => card.classList.toggle('active', cardIndex === index));
  dots?.querySelectorAll('button').forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === index));
}

if (cards.length > 0) {
  showTestimonial(activeTestimonial);

  window.setInterval(() => {
    if (window.innerWidth <= 720) showTestimonial((activeTestimonial + 1) % cards.length);
  }, 5500);
}

const docsSidebarButton = document.querySelector('.docs-sidebar-toggle');
const docsSidebar = document.querySelector('.docs-sidebar');
docsSidebarButton?.addEventListener('click', () => {
  const isOpen = docsSidebar.classList.toggle('open');
  docsSidebarButton.setAttribute('aria-expanded', String(isOpen));
});

docsSidebar?.addEventListener('click', (event) => {
  if (event.target.matches('a') && window.innerWidth <= 800) {
    docsSidebar.classList.remove('open');
    docsSidebarButton?.setAttribute('aria-expanded', 'false');
  }
});

const docsSearch = document.querySelector('.docs-search input');
const docsCards = [...document.querySelectorAll('.docs-card')];
const docsEmpty = document.querySelector('.docs-empty');

docsSearch?.addEventListener('input', () => {
  const query = docsSearch.value.trim().toLowerCase();
  let visibleCount = 0;
  docsCards.forEach((card) => {
    const matches = !query || card.dataset.search.includes(query) || card.textContent.toLowerCase().includes(query);
    card.hidden = !matches;
    if (matches) visibleCount += 1;
  });
  if (docsEmpty) docsEmpty.hidden = visibleCount > 0;
});

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && docsSearch) {
    event.preventDefault();
    docsSearch.focus();
  }
});

const packageCommands = {
  npm: 'npm create cocoframe@latest my-app',
  pnpm: 'pnpm create cocoframe@latest my-app',
  yarn: 'yarn create cocoframe my-app',
  bun: 'bun create cocoframe my-app'
};
const packageButtons = [...document.querySelectorAll('[data-package]')];
const commandText = document.querySelector('[data-command]');

packageButtons.forEach((button) => {
  button.addEventListener('click', () => {
    packageButtons.forEach((item) => item.classList.toggle('active', item === button));
    if (commandText) commandText.textContent = packageCommands[button.dataset.package];
  });
});

const docsCopyButton = document.querySelector('.docs-copy');
docsCopyButton?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(commandText?.textContent ?? 'npm create cocoframe@latest my-app');
    docsCopyButton.textContent = 'Copied!';
    window.setTimeout(() => { docsCopyButton.textContent = 'Copy'; }, 1600);
  } catch {
    docsCopyButton.textContent = 'Select & copy';
  }
});

const componentSearch = document.querySelector('.component-search input');
const searchableComponents = [...document.querySelectorAll('[data-component-search]')];
const componentsEmpty = document.querySelector('.components-empty');

componentSearch?.addEventListener('input', () => {
  const query = componentSearch.value.trim().toLowerCase();
  let visibleCount = 0;
  searchableComponents.forEach((item) => {
    const matches = !query || item.dataset.componentSearch.includes(query) || item.textContent.toLowerCase().includes(query);
    item.hidden = !matches;
    if (matches) visibleCount += 1;
  });
  if (componentsEmpty) componentsEmpty.hidden = visibleCount > 0;
});

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && componentSearch) {
    event.preventDefault();
    componentSearch.focus();
  }
});
