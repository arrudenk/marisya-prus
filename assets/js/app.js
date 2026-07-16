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
import { renderPage, t } from './render.js';
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
  document.body.style.overflow = ''; // на випадок ререндеру з відкритим лайтбоксом

  // FormSubmit повертає користувача на ?sent=1 — показуємо подяку.
  if (new URLSearchParams(location.search).get('sent') === '1') {
    document.getElementById('form-thanks').hidden = false;
  }
}

// 1) Малюємо дефолт одразу — сторінка з'являється миттєво.
render();

// 2) Пробуємо підтягти контент із Google-таблиці; якщо вдалося —
//    підміняємо й перемальовуємо один раз. Помилка/відсутність → лишається дефолт.
loadContentFromSheet().then((fromSheet) => {
  if (fromSheet) { activeContent = fromSheet; render(); }
});

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
  document.body.style.overflow = 'hidden'; // блокуємо скрол під лайтбоксом
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
  document.body.style.overflow = '';
}

/* ── Події (делегування на document) ─────────────────────────── */

document.addEventListener('click', (e) => {
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
  if (e.target.closest('#lightbox')) closeLightbox();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.getElementById('lightbox').hidden) {
    closeLightbox();
  }
});
