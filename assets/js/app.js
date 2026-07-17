/**
 * app.js — ТОЧКА ВХОДУ: стан застосунку та обробка подій.
 *
 * Розподіл відповідальності:
 *   content.js — ЩО показувати (дані)
 *   render.js  — ЯК це виглядає (дані → HTML)
 *   app.js     — КОЛИ і що відбувається (стан, події, панелі, лайтбокс)
 *
 * Усі обробники повішені на document через делегування, тому вони
 * переживають повний ререндер сторінки (перемикання мови) — нічого
 * не треба перепідписувати.
 *
 * НАВІГАЦІЯ (усе через hash → працюють «назад» браузера й прямі лінки):
 *   #p/<slug>  — інлайн-сторінка (about → artist-statement, проєкти)
 *   #zapysky   — темний рідер «Записки злочинів проти тварин»
 *   (порожньо) — головна (слайдер)
 */

import { content as defaultContent } from './content.js';
import { renderPage, renderProjectHTML, renderZapyskyHTML, t } from './render.js';
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

  // Ререндер (зміна мови, підміна контентом із таблиці) створює порожні
  // панелі — приводимо їх у відповідність до адреси (миттєво, без анімації
  // повторного «відкриття» — клас .open ставиться заново одразу).
  syncFromHash();

  // Слайдер перестворюється при кожному ререндері — перезапускаємо логіку.
  setupHeaderCarousel();
}

/* ── Слайдер фото на головній ─────────────────────────────────── */

/**
 * Квадратний слайдер: авто-гортання по таймеру + клікабельні крапки +
 * драг/свайп (миша й тач). Перф: слайд — CSS transform (композитор),
 * один setInterval; таймер стоїть, коли слайдер поза екраном
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

  // Пауза, коли слайдер не видно (відкрита панель, схований таб)
  if ('IntersectionObserver' in window) {
    fcObserver = new IntersectionObserver((ents) => { inView = ents[0].isIntersecting; }, { threshold: 0.15 });
    fcObserver.observe(win);
  }

  apply();
  startAuto();
}

/* ── Hash-навігація: інлайн-сторінки і «Записки» ─────────────── */

/** Слаг сторінки з адреси або null (location.hash приходить закодованим). */
function pageSlugFromHash() {
  const m = location.hash.match(/^#p\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}
const isZapyskyHash = () => location.hash === '#zapysky';

const pagePanelEl = () => document.getElementById('page-panel');
const zapyskyPanelEl = () => document.getElementById('zapysky-panel');
const isPageOpen = () => pagePanelEl().classList.contains('open');
const isZapyskyOpen = () => zapyskyPanelEl().classList.contains('open');
const isContactOpen = () => !document.getElementById('contact-modal').hidden;
const isLightboxOpen = () => !document.getElementById('lightbox').hidden;

/* ── Блокування фону (спільне для панелей/модалки/лайтбокса) ────
 * Поки зверху відкрита панель, модалка чи лайтбокс, фон не скролиться
 * (overflow:hidden на body). Позицію скролу запам'ятовуємо при
 * блокуванні й повертаємо при розблокуванні: інакше порожній hash
 * при закритті («#» = верх документа) кидає сторінку нагору.
 * Свідомо НЕ використовуємо position:fixed на body — він створив би
 * контейнер для fixed-нащадків і зламав би панелі та бари. */
let savedScrollY = 0;

function updateBackgroundLock() {
  const shouldLock = isPageOpen() || isZapyskyOpen() || isContactOpen() || isLightboxOpen();
  const isLocked = document.body.style.overflow === 'hidden';
  if (shouldLock && !isLocked) {
    savedScrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
  } else if (!shouldLock && isLocked) {
    document.body.style.overflow = '';
    window.scrollTo(0, savedScrollY); // повертаємось, де були
  }
}

/**
 * Відчиняє/зачиняє панель-шторку. Вміст вставляється перед відкриттям;
 * після закриття вичищається із затримкою (даємо шторці доїхати, потім
 * звільняємо DOM і картинки). Анімація — лише transform (композитор).
 */
const CLEAR_DELAY = 700; // трохи довше за CSS-transition (0.55s)
function setPanel(panel, html) {
  const inner = panel.querySelector('.panel-inner');
  if (html) {
    inner.innerHTML = html;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
  } else if (panel.classList.contains('open')) {
    teardownVideo(panel); // стоп відео й мережі одразу при закритті
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      if (!panel.classList.contains('open')) inner.innerHTML = '';
    }, CLEAR_DELAY);
  }
}

let videoIO = null; // спостерігач скролу для відео (мобільний)

/** Зупиняє всі відео панелі й вивантажує джерела (стоп трафіку при закритті). */
function teardownVideo(panel) {
  if (videoIO) { videoIO.disconnect(); videoIO = null; }
  panel.querySelectorAll('.cvp-video').forEach((v) => {
    v.pause();
    v.removeAttribute('src');
    v.load();
  });
}

/**
 * Один плеєр: дротує контролі, повертає керування (start/stop). Джерело
 * ставиться лише при першому старті (preload="none" → нуль трафіку інакше).
 */
function initPlayer(cvp) {
  const v = cvp.querySelector('.cvp-video');
  const q = (s) => cvp.querySelector(s);
  const bigBtn = q('.cvp-big'), unmuteBtn = q('.cvp-unmute');
  const playBtn = q('.cvp-play'), muteBtn = q('.cvp-mute'), fsBtn = q('.cvp-fs');
  const timeEl = q('.cvp-time'), progress = q('.cvp-progress'), fill = q('.cvp-progress-fill');
  let loaded = false;

  const fmt = (s) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };
  const syncPlayUI = () => { playBtn.textContent = v.paused ? '▶' : '❚❚'; bigBtn.hidden = !v.paused; };
  const syncMuteUI = () => { muteBtn.textContent = v.muted ? '🔇' : '♪'; unmuteBtn.hidden = !v.muted; };

  const ensureSrc = () => { if (!loaded) { v.src = cvp.dataset.src; loaded = true; } };
  /** Старт відтворення. preferSound=true (перше відео) — пробуємо зі звуком,
   *  при блоці браузера падаємо на muted + кнопка. Інакше одразу muted
   *  (автоплей без жесту дозволений лише без звуку). */
  const start = (preferSound) => {
    ensureSrc();
    v.muted = !preferSound;
    v.play().then(syncMuteUI).catch(() => {
      if (!v.muted) { v.muted = true; v.play().catch(() => {}); }
      syncMuteUI();
    });
  };
  const stop = () => v.pause();
  const toggle = () => { v.paused ? (ensureSrc(), v.play().catch(() => {})) : v.pause(); };

  v.addEventListener('play', syncPlayUI);
  v.addEventListener('pause', syncPlayUI);
  // Пропорції плеєра — під реальні розміри відео (портрет/ландшафт).
  v.addEventListener('loadedmetadata', () => {
    if (v.videoWidth) cvp.style.setProperty('--cvp-ar', `${v.videoWidth} / ${v.videoHeight}`);
  });
  v.addEventListener('timeupdate', () => {
    const d = v.duration || 0;
    fill.style.width = d ? `${(v.currentTime / d) * 100}%` : '0%';
    timeEl.textContent = fmt(v.currentTime);
  });
  v.addEventListener('click', toggle);
  bigBtn.addEventListener('click', toggle);
  playBtn.addEventListener('click', toggle);
  const setMuted = (m) => { v.muted = m; syncMuteUI(); if (!m && v.paused) v.play().catch(() => {}); };
  muteBtn.addEventListener('click', () => setMuted(!v.muted));
  unmuteBtn.addEventListener('click', () => setMuted(false));
  progress.addEventListener('click', (e) => {
    const r = progress.getBoundingClientRect();
    if (v.duration) v.currentTime = ((e.clientX - r.left) / r.width) * v.duration;
  });
  fsBtn.addEventListener('click', () => {
    const el = cvp.querySelector('.cvp-stage') || cvp;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  });

  syncPlayUI(); syncMuteUI();
  return { cvp, v, start, stop };
}

/**
 * Плеєри у відкритій панелі. Перше відео стартує ОДРАЗУ (best-effort зі
 * звуком → muted+кнопка при блоці), навіть якщо його ще не видно. Решта:
 * на десктопі (є hover) — при наведенні; на тачі — коли доскролив (по черзі),
 * через IntersectionObserver. Одночасно грає одне (інші паузяться).
 */
function setupVideoPlayer(panel) {
  if (videoIO) { videoIO.disconnect(); videoIO = null; }
  const cvps = [...panel.querySelectorAll('.cvp')];
  if (!cvps.length) return;
  const players = cvps.map(initPlayer);
  const playOnly = (pl, preferSound) => {
    players.forEach((p) => { if (p !== pl) p.stop(); });
    pl.start(preferSound);
  };

  // Перше — одразу зі звуком (best-effort), решта на вимогу.
  playOnly(players[0], true);

  const touch = window.matchMedia?.('(hover: none)').matches;
  if (touch && 'IntersectionObserver' in window) {
    // Мобільний: грає найбільш видиме відео, решта — пауза (по черзі при скролі).
    videoIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const pl = players.find((p) => p.cvp === e.target);
        if (!pl) return;
        if (e.isIntersecting) playOnly(pl, false); else pl.stop();
      });
    }, { rootMargin: '-30% 0px -30% 0px' });
    players.slice(1).forEach((p) => videoIO.observe(p.cvp)); // перше вже грає
  } else {
    // Десктоп: наведення грає відео (і паузить інші), відведення — пауза.
    players.slice(1).forEach((p) => {
      p.cvp.addEventListener('pointerenter', () => playOnly(p, false));
      p.cvp.addEventListener('pointerleave', () => p.stop());
    });
  }
}

/**
 * Приводить панелі й тему у відповідність до адреси. Єдина точка правди:
 * викликається на hashchange і після кожного ререндеру.
 */
function syncFromHash() {
  const slug = pageSlugFromHash();
  const zapysky = isZapyskyHash();

  // Інлайн-сторінка (about / проєкт) — шторка згори.
  setPanel(pagePanelEl(), slug ? renderProjectHTML(slug, lang, activeContent) : null);
  if (slug) { pagePanelEl().scrollTop = 0; setupVideoPlayer(pagePanelEl()); }

  // «Записки» — темна шторка знизу + перефарбування сайту в чорне.
  const zPanel = zapyskyPanelEl();
  const zHtml = zapysky ? renderZapyskyHTML(lang, activeContent) : null;
  const wasOpen = isZapyskyOpen();
  setPanel(zPanel, zHtml);
  document.documentElement.classList.toggle('dark', !!zHtml);
  if (zHtml && !wasOpen) {
    // Старт читання — низ панелі (там 1-а сторінка PDF; гортається вгору).
    // rAF: чекаємо, поки вставлений вміст отримає розміри (слоти сторінок
    // мають aspect-ratio, тож висота відома без завантаження картинок).
    requestAnimationFrame(() => { zPanel.scrollTop = zPanel.scrollHeight; });
  }

  updateBackgroundLock();
}

/** Закрити верхню панель = прибрати hash; решту зробить hashchange. */
function closeTopPage() {
  if (pageSlugFromHash() !== null || isZapyskyHash()) location.hash = '';
}

window.addEventListener('hashchange', syncFromHash);

/* ── Маленьке віконце contacts («режим кінотеатру») ──────────── */

function openContact() {
  document.getElementById('contact-modal').hidden = false;
  updateBackgroundLock();
}
function closeContact() {
  document.getElementById('contact-modal').hidden = true;
  updateBackgroundLock();
}

/* ── Лайтбокс (фото робіт + відео/PDF з Drive) ───────────────── */

function openLightbox(opts) {
  const box = document.getElementById('lightbox');
  const img = box.querySelector('img');
  const frame = box.querySelector('.lightbox-frame');

  if (opts.preview) {
    // Drive/YouTube-плеєр вантажиться лише в момент відкриття.
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
  updateBackgroundLock();
}

function closeLightbox() {
  const box = document.getElementById('lightbox');
  const img = box.querySelector('img');
  const frame = box.querySelector('.lightbox-frame');

  box.hidden = true;
  img.src = '';
  img.hidden = false;
  frame.src = ''; // вивантажує плеєр і зупиняє відтворення
  frame.hidden = true;
  box.classList.remove('lb-video', 'lb-pdf');
  updateBackgroundLock();
}

/* ── Дропдаун «дослідження» ──────────────────────────────────── */

function closeNav() {
  const menu = document.querySelector('.nav-menu.open');
  if (!menu) return;
  menu.classList.remove('open');
  menu.querySelector('.nav-toggle')?.setAttribute('aria-expanded', 'false');
}

/* ── Події (делегування на document) ─────────────────────────── */

document.addEventListener('click', (e) => {
  // «дослідження»: кнопка-перемикач дропдауну
  const navToggle = e.target.closest('.nav-toggle');
  if (navToggle) {
    const menu = navToggle.closest('.nav-menu');
    const open = menu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    return;
  }
  // Пункт дропдауну — hash-лінк (#p/slug); просто згортаємо меню.
  if (e.target.closest('.nav-item')) { closeNav(); return; }
  closeNav(); // клік деінде згортає відкрите меню

  // Ім'я в шапці → закрити все, на початок сторінки
  const topName = e.target.closest('.topbar-name');
  if (topName) {
    e.preventDefault();
    savedScrollY = 0;
    if (location.hash) location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  // Перемикач мови (нижня панель)
  const langBtn = e.target.closest('.lang-toggle button');
  if (langBtn) return setLang(langBtn.dataset.lang);

  // contacts → маленьке віконце
  if (e.target.closest('.contacts-link')) return openContact();
  // Закриття віконця: ✕ або клік по затемненому фону (не по карточці)
  if (e.target.closest('.modal-close')) return closeContact();
  if (e.target.id === 'contact-modal') return closeContact();

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
  if (e.target.closest('#lightbox')) return closeLightbox();
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  // Закривається те, що зверху: лайтбокс → віконце → панель/«Записки».
  if (isLightboxOpen()) return closeLightbox();
  if (isContactOpen()) return closeContact();
  if (isPageOpen() || isZapyskyOpen()) closeTopPage();
});

// Прихована вкладка → ставимо відео на паузу (не грати наосліп). Один
// глобальний слухач (без накопичення при ререндерах панелей).
document.addEventListener('visibilitychange', () => {
  if (document.hidden) document.querySelectorAll('.cvp-video').forEach((v) => v.pause());
});

/* ── Старт ────────────────────────────────────────────────────
 * Запускаємо в самому кінці — після всіх оголошень (const/let),
 * щоб перший render() уже бачив усі функції й змінні. */

// 1) Малюємо дефолт одразу — сторінка з'являється миттєво.
render();

// 2) Пробуємо підтягти контент із Google-таблиці; якщо вдалося —
//    підміняємо й перемальовуємо один раз. Помилка/відсутність → лишається дефолт.
loadContentFromSheet().then((fromSheet) => {
  if (fromSheet) { activeContent = fromSheet; render(); }
});
