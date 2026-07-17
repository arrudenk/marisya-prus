/**
 * app.js — ТОЧКА ВХОДУ: стан застосунку та обробка подій.
 *
 * Розподіл відповідальності:
 *   content.js — ЩО показувати (дані)
 *   render.js  — ЯК це виглядає (дані → HTML)
 *   app.js     — КОЛИ і що відбувається (стан, події, лайтбокс)
 *
 * Усі обробники повішені на document через делегування, тому вони
 * переживають повний ререндер сторінки (перемикання мови) — нічого
 * не треба перепідписувати.
 */

import { content as defaultContent } from './content.js';
import { renderPage, renderProjectHTML, t } from './render.js';
import { loadContentFromSheet } from './sheet.js';

const app = document.getElementById('app');

/* ── Стан: контент і мова ────────────────────────────────────── */

/** Активний контент. Спершу — вбудований дефолт (миттєвий рендер),
 *  потім, якщо Google-таблиця налаштована й доступна, підміняється нею. */
let activeContent = defaultContent;

/** Вибір мови зберігається між візитами. localStorage може бути
 *  недоступний (приватний режим тощо) — тому try/catch. */
let lang = 'uk';
try { lang = localStorage.getItem('lang') || 'uk'; } catch { /* ok */ }

function setLang(next) {
  lang = next;
  try { localStorage.setItem('lang', next); } catch { /* ok */ }
  render();
}

/* ── Рендер ──────────────────────────────────────────────────── */

function render() {
  app.innerHTML = renderPage(lang, activeContent);
  document.documentElement.lang = lang;
  document.title = t(activeContent.meta.title, lang);

  // FormSubmit повертає користувача на ?sent=1 — показуємо подяку.
  if (new URLSearchParams(location.search).get('sent') === '1') {
    document.getElementById('form-thanks').hidden = false;
  }

  // Ререндер (зміна мови, підміна контентом із таблиці) створює порожній
  // оверлей — якщо в адресі відкритий проєкт, наповнюємо його заново.
  syncProjectFromHash();

  // Плитки hero перестворюються при кожному ререндері — перепідключаємо
  // скрол-спостерігач до нових елементів.
  setupTileReveal();

  // Каруселька фото теж перестворюється — перезапускаємо її логіку.
  setupHeaderCarousel();
}

/* ── Реакція плиток на скрол (тач-пристрої без hover) ─────────── */

/**
 * На десктопі затемнення+назву плитки показує :hover (CSS). На телефоні
 * hover немає, тому плитку, що потрапляє у вузьку смугу по центру екрана,
 * підсвічуємо класом .revealed через IntersectionObserver — так текст
 * з'являється саме на тій плитці, повз яку скролиш/яку торкаєшся.
 *
 * Перф: спостерігач спрацьовує лише на перетині межі (не щокадру), тому
 * скрол лишається дешевим. Старий спостерігач від'єднуємо перед створенням
 * нового — жодних витоків при ререндерах.
 */
let tileObserver = null;
function setupTileReveal() {
  if (tileObserver) { tileObserver.disconnect(); tileObserver = null; }
  // Тільки там, де немає наведення (телефони/планшети).
  if (!window.matchMedia || !window.matchMedia('(hover: none)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  const tiles = app.querySelectorAll('.project-tile');
  if (!tiles.length) return;
  tileObserver = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.target.classList.toggle('revealed', e.isIntersecting);
    },
    { rootMargin: '-35% 0px -35% 0px' }, // «активна» лише смуга ~30% по центру
  );
  tiles.forEach((tile) => tileObserver.observe(tile));
}

/* ── Каруселька фото (вгорі сторінки) ─────────────────────────── */

/**
 * Горизонтальна каруселька: авто-слайд по таймеру + клікабельні крапки +
 * драг/свайп (миша й тач). Перф: слайд — CSS transform (композитор),
 * один setInterval; таймер стоїть, коли каруселька поза екраном
 * (IntersectionObserver) чи вкладка прихована, і вимкнений при
 * prefers-reduced-motion. Старий таймер і спостерігач знімаємо перед новим
 * налаштуванням — без витоків при ререндері. (Слухачі pointer/click висять
 * на елементах, що перестворюються ререндером, тож збираються GC зі старим DOM.)
 */
let fcTimer = null;
let fcObserver = null;
function setupHeaderCarousel() {
  if (fcTimer) { clearInterval(fcTimer); fcTimer = null; }
  if (fcObserver) { fcObserver.disconnect(); fcObserver = null; }

  const win = app.querySelector('.fc-window');
  const track = win?.querySelector('.fc-track');
  if (!track || !track.children.length) return;
  const slides = track.children.length;
  const dots = [...app.querySelectorAll('.fc-dot')];
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let index = 0;
  let inView = true;

  const apply = () => {
    track.style.transform = `translateX(${-index * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
  };
  const goTo = (i) => { index = (i + slides) % slides; track.classList.remove('dragging'); apply(); };

  const startAuto = () => {
    if (fcTimer) { clearInterval(fcTimer); fcTimer = null; }
    if (reduced || slides < 2) return;             // нема сенсу крутити один слайд
    fcTimer = setInterval(() => { if (inView && !document.hidden) goTo(index + 1); }, 5000);
  };
  const stopAuto = () => { if (fcTimer) { clearInterval(fcTimer); fcTimer = null; } };

  // Клікабельні крапки
  dots.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); startAuto(); }));

  // Драг/свайп (pointer — і миша, і тач)
  let dragging = false, startX = 0, dx = 0, w = 1;
  win.addEventListener('pointerdown', (e) => {
    dragging = true; startX = e.clientX; dx = 0; w = win.clientWidth || 1;
    stopAuto();
    track.classList.add('dragging');            // без transition — слайд іде за пальцем
    win.setPointerCapture?.(e.pointerId);
  });
  win.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dx = e.clientX - startX;
    track.style.transform = `translateX(calc(${-index * 100}% + ${dx}px))`;
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(dx) > w * 0.15) goTo(index + (dx < 0 ? 1 : -1)); // достатній свайп → сусідній
    else goTo(index);                                             // інакше — назад на місце
    startAuto();
  };
  win.addEventListener('pointerup', endDrag);
  win.addEventListener('pointercancel', endDrag);

  // Пауза, коли футер не видно
  if ('IntersectionObserver' in window) {
    fcObserver = new IntersectionObserver((ents) => { inView = ents[0].isIntersecting; }, { threshold: 0.15 });
    fcObserver.observe(win);
  }

  apply();
  startAuto();
}

/* ── Оверлей проєкту ─────────────────────────────────────────── */

/**
 * Оверлей повністю керується hash-ом адреси: плитка — це звичайний лінк
 * на #p/<slug>, тож відкриття/закриття, кнопка «назад» браузера і
 * прямі посилання (шеринг) працюють через один механізм — hashchange.
 */

/** Слаг проєкту з поточної адреси або null (location.hash приходить закодованим). */
function projectSlugFromHash() {
  const m = location.hash.match(/^#p\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

const isProjectOpen = () => !document.getElementById('project-overlay').hidden;
const isLightboxOpen = () => !document.getElementById('lightbox').hidden;

/* ── Блокування фону (спільне для оверлея й лайтбокса) ──────────
 * Поки зверху відкритий оверлей чи лайтбокс, фон не скролиться
 * (overflow:hidden на body). Позицію скролу запам'ятовуємо при
 * блокуванні й повертаємо при розблокуванні: інакше порожній hash
 * при закритті («#» = верх документа) кидає сторінку нагору.
 * Свідомо НЕ використовуємо position:fixed на body — він створив би
 * контейнер для fixed-нащадків і зламав би оверлей/лайтбокс/кнопку ✕. */
let savedScrollY = 0;

/** Синхронізує блокування фону зі станом накладок (open/close будь-якої). */
function updateBackgroundLock() {
  const shouldLock = isProjectOpen() || isLightboxOpen();
  const isLocked = document.body.style.overflow === 'hidden';
  if (shouldLock && !isLocked) {
    savedScrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
  } else if (!shouldLock && isLocked) {
    document.body.style.overflow = '';
    window.scrollTo(0, savedScrollY); // повертаємось, де були
  }
}

/** Приводить оверлей у відповідність до адреси: наповнює й показує або ховає. */
function syncProjectFromHash() {
  const overlay = document.getElementById('project-overlay');
  const panel = overlay.querySelector('.project-panel');
  const slug = projectSlugFromHash();
  const html = slug ? renderProjectHTML(slug, lang, activeContent) : null;

  if (html) {
    panel.innerHTML = html;
    overlay.hidden = false;
    overlay.scrollTop = 0;
  } else {
    overlay.hidden = true;
    panel.innerHTML = ''; // звільняє DOM і картинки закритого проєкту
  }
  updateBackgroundLock();
}

/** Закрити оверлей = прибрати слаг з адреси; решту зробить hashchange. */
function closeProject() {
  if (projectSlugFromHash() !== null) location.hash = '';
}

// Прямі посилання (шеринг) покриває перший render(): він теж викликає
// syncProjectFromHash(), тож окремого коду для старту не треба.
window.addEventListener('hashchange', syncProjectFromHash);

/* ── Лайтбокс («режим кінотеатру») ───────────────────────────── */

/**
 * Відкриває лайтбокс.
 * @param {Object} opts
 * @param {string} [opts.src]     — фото: URL картинки
 * @param {string} [opts.alt]     — фото: alt-текст
 * @param {string} [opts.preview] — відео/PDF: Google Drive /preview URL
 * @param {'video'|'pdf'} [opts.embed] — пропорції вікна для preview
 * @param {string} [opts.title]   — відео/PDF: title для iframe (доступність)
 */
function openLightbox(opts) {
  const box = document.getElementById('lightbox');
  const img = box.querySelector('img');
  const frame = box.querySelector('.lightbox-frame');

  if (opts.preview) {
    // Drive-плеєр вантажиться лише в момент відкриття — до кліку
    // сторінка не тягне жодного байта з Google.
    frame.src = opts.preview;
    frame.title = opts.title || '';
    frame.hidden = false;
    img.hidden = true;
    box.classList.add('lb-' + opts.embed);
  } else {
    img.src = opts.src;
    img.alt = opts.alt || '';
    img.hidden = false;
    frame.hidden = true;
  }

  box.hidden = false;
  updateBackgroundLock(); // блокуємо скрол фону під лайтбоксом
}

function closeLightbox() {
  const box = document.getElementById('lightbox');
  const img = box.querySelector('img');
  const frame = box.querySelector('.lightbox-frame');

  box.hidden = true;
  img.src = '';
  img.hidden = false;
  frame.src = ''; // вивантажує Drive-плеєр і зупиняє відтворення
  frame.hidden = true;
  box.classList.remove('lb-video', 'lb-pdf');
  // Якщо під лайтбоксом відкритий оверлей проєкту — фон лишається заблокованим.
  updateBackgroundLock();
}

/* ── Навігаційне меню в шапці ─────────────────────────────────── */

/** Згорнути відкрите меню розділів (якщо є). */
function closeNav() {
  const menu = document.querySelector('.nav-menu.open');
  if (!menu) return;
  menu.classList.remove('open');
  menu.querySelector('.nav-toggle')?.setAttribute('aria-expanded', 'false');
}

/** Плавно прокрутити до секції за ключем пункту меню. */
function scrollToSection(key) {
  let el = null;
  if (key === 'projects') el = document.querySelector('.mosaic-divider');
  else if (key === 'series') el = document.querySelector('.hero-mosaic .project-tile[href*="p/series"]');
  else if (key === 'contact') el = document.getElementById('contact');
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Повернутись на початок сторінки (клік по імені в шапці). */
function scrollToTop() {
  savedScrollY = 0;                               // якщо був відкритий оверлей — не вертати вниз
  if (projectSlugFromHash() !== null) location.hash = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Події (делегування на document) ─────────────────────────── */

document.addEventListener('click', (e) => {
  // Меню розділів: кнопка-перемикач
  const navToggle = e.target.closest('.nav-toggle');
  if (navToggle) {
    const menu = navToggle.closest('.nav-menu');
    const open = menu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    return;
  }
  // Пункт меню
  const navItem = e.target.closest('.nav-item');
  if (navItem) {
    closeNav();
    if (navItem.dataset.scroll) { e.preventDefault(); scrollToSection(navItem.dataset.scroll); }
    // інакше About/Gallery: лишаємо hash-навігацію — відкриє оверлей
    return;
  }
  closeNav(); // клік деінде згортає відкрите меню

  // Ім'я в шапці → на початок сторінки
  const topName = e.target.closest('.topbar-name');
  if (topName) { e.preventDefault(); return scrollToTop(); }

  // Перемикач мови в шапці
  const langBtn = e.target.closest('.lang-toggle button');
  if (langBtn) return setLang(langBtn.dataset.lang);

  // Клік по роботі в галереї → фото в лайтбоксі (повнорозмірна версія)
  const img = e.target.closest('.grid figure img, .split figure img');
  if (img) return openLightbox({ src: img.dataset.full || img.src, alt: img.alt });

  // Лінк з data-preview → відео/PDF у лайтбоксі замість переходу
  const link = e.target.closest('a[data-preview]');
  if (link) {
    e.preventDefault();
    return openLightbox({
      preview: link.dataset.preview,
      embed: link.dataset.embed,
      title: link.textContent.trim(),
    });
  }

  // Клік по фону лайтбокса або по ✕ → закрити.
  // (Кліки всередині iframe сюди не долітають — це нормально,
  //  для відео/PDF закриття працює через ✕ і Esc.)
  if (e.target.closest('#lightbox')) return closeLightbox();

  // Оверлей проєкту: ✕ або клік по затемненому фону (не по панелі) → закрити.
  if (e.target.closest('.project-close')) return closeProject();
  if (e.target.id === 'project-overlay') closeProject();
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  // Спершу закривається те, що зверху: лайтбокс, потім оверлей проєкту.
  if (!document.getElementById('lightbox').hidden) return closeLightbox();
  if (isProjectOpen()) closeProject();
});

/* ── Старт ────────────────────────────────────────────────────
 * Запускаємо в самому кінці — після всіх оголошень (const/let),
 * щоб перший render() уже бачив усі функції й змінні (інакше
 * updateBackgroundLock звернувся б до них у temporal dead zone). */

// 1) Малюємо дефолт одразу — сторінка з'являється миттєво.
render();

// 2) Пробуємо підтягти контент із Google-таблиці; якщо вдалося —
//    підміняємо й перемальовуємо один раз. Помилка/відсутність → лишається дефолт.
loadContentFromSheet().then((fromSheet) => {
  if (fromSheet) { activeContent = fromSheet; render(); }
});
