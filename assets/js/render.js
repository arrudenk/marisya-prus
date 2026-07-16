/**
 * render.js — ШАР ВІДОБРАЖЕННЯ: перетворює дані контенту на HTML.
 *
 * Кожна функція тут «компонент»: чиста функція (дані, мова) → рядок HTML.
 * Жодного стану і жодних обробників подій — це все живе в app.js.
 *
 * Контент передається параметром `data` (renderPage(lang, data)), тому той
 * самий рендер працює і для вбудованого дефолту (content.js), і для контенту,
 * завантаженого з Google-таблиці. За замовчуванням береться дефолт.
 *
 * Рендер виконується кілька разів за сесію максимум (старт, підміна з
 * таблиці, зміна мови) — вартість мілісекунди; нічого не крутиться «на льоту».
 *
 * CSS-класи навмисно ті самі, що були в статичній версії, —
 * assets/style.css працює без змін.
 */

import { content } from './content.js';
import { IMG } from './config.js';

/**
 * Повертає текст потрібною мовою.
 * Приймає або двомовний об'єкт { uk, en }, або звичайний рядок.
 * Якщо перекладу немає — падає назад на українську.
 */
export const t = (field, lang) =>
  typeof field === 'string' ? field : (field[lang] ?? field.uk);

/**
 * Перетворює значення картинки на реальний URL.
 * - Посилання на Google Drive (…/file/d/ID/…, …?id=ID) або голий ID →
 *   URL Google-CDN потрібної ширини (гарна якість, без зайвих залежностей).
 * - Шлях у репозиторії (assets/img/…) чи звичайний http(s)-URL → без змін.
 * Тому в таблиці картинку можна задати як Drive-лінк, а важливі фото можна
 * тримати у репозиторії — обидва варіанти працюють.
 */
const DRIVE_RE = /(?:\/d\/|[?&]id=)([A-Za-z0-9_-]{20,})/;
export function imageUrl(value, { width } = {}) {
  if (!value) return '';
  const v = String(value).trim();
  const m = v.match(DRIVE_RE);
  const id = m ? m[1] : (/^[A-Za-z0-9_-]{20,}$/.test(v) ? v : null);
  if (id) return `https://lh3.googleusercontent.com/d/${id}${width ? '=w' + width : ''}`;
  return v;
}

/* ── Дрібні будівельні блоки ─────────────────────────────────── */

/** Абзаци тексту: масив L-об'єктів → <p>…</p><p>…</p> */
const paragraphs = (list, lang) =>
  (list ?? []).map((p) => `<p>${t(p, lang)}</p>`).join('\n');

/**
 * Зовнішній лінк секції. Якщо в лінка є data-preview —
 * app.js перехопить клік і відкриє його в лайтбоксі («режим кінотеатру»)
 * замість переходу на Google Drive. href лишається робочим фолбеком
 * (наприклад, для відкриття у новій вкладці через середню кнопку миші).
 */
const extLink = (link, lang) => {
  if (!link) return '';
  const previewAttrs = link.preview
    ? ` data-preview="${link.preview}" data-embed="${link.embed}"`
    : '';
  return `<p><a class="ext-link" href="${link.href}" target="_blank" rel="noopener"${previewAttrs}>${t(link.label, lang)}</a></p>`;
};

/**
 * Тег <img> з двома розмірами: `src` — версія для сітки, `data-full` —
 * більша версія, яку app.js відкриває в лайтбоксі (краща якість зблизька).
 */
const imgTag = (value, alt, extra = '') => {
  const src = imageUrl(value, { width: IMG.grid });
  const full = imageUrl(value, { width: IMG.full });
  return `<img src="${src}" data-full="${full}" alt="${alt || ''}" loading="lazy"${extra}>`;
};

/** Одна робота в сітці: картинка + (опційно) підпис у два рядки. */
const workFigure = (work, lang) => {
  const caption = work.title
    ? `<figcaption><span>${t(work.title, lang)}</span><br><span>${t(work.materials, lang)}</span></figcaption>`
    : '';
  return `<figure>${imgTag(work.src, work.alt)}${caption}</figure>`;
};

/** Група робіт: (опційно) підзаголовок + сітка + (опційно) підпис під сіткою. */
const workGroup = (group, lang) => `
  ${group.title ? `<h3 class="sub-title">${t(group.title, lang)}</h3>` : ''}
  <div class="grid ${group.grid}">
    ${group.works.map((w) => workFigure(w, lang)).join('\n')}
  </div>
  ${group.caption ? `<div class="grid-cap">${t(group.caption, lang)}</div>` : ''}`;

/* ── Секції (диспетчеризація за section.type) ────────────────── */

const sectionRenderers = {

  /** Artist Statement — вузька текстова колонка. */
  statement: (s, lang) => `
    <section class="statement">
      <h2>${s.title}</h2>
      ${paragraphs(s.paragraphs, lang)}
    </section>`,

  /** Текст поруч із великим зображенням (image липне при скролі). */
  split: (s, lang) => `
    <section class="work split${s.reverse ? ' reverse' : ''}">
      <div class="work-text">
        <p class="kicker">${t(s.kicker, lang)}</p>
        <h2>${t(s.title, lang)}</h2>
        ${paragraphs(s.paragraphs, lang)}
        ${extLink(s.link, lang)}
      </div>
      <figure>
        ${imgTag(s.image.src, s.image.alt)}
        ${s.image.caption ? `<figcaption>${t(s.image.caption, lang)}</figcaption>` : ''}
      </figure>
    </section>`,

  /** Заголовок + (опційно) текст і лінк + одна чи кілька сіток робіт. */
  gallery: (s, lang) => `
    <section class="work">
      <div class="work-text centered">
        <h2>${t(s.title, lang)}</h2>
        ${paragraphs(s.paragraphs, lang)}
        ${extLink(s.link, lang)}
      </div>
      ${s.groups.map((g) => workGroup(g, lang)).join('\n')}
    </section>`,

  /** Контакти: дані художниці + форма FormSubmit. */
  contact: (s, lang, data) => {
    const { artist, form } = data;
    const L = form.labels;
    return `
    <section class="contact" id="contact">
      <h2>${t(s.title, lang)}</h2>
      <div class="contact-inner">
        <div class="contact-info">
          <p class="contact-name">${t(artist.name, lang)}</p>
          <p><a href="mailto:${artist.email}">${artist.email}</a></p>
          <p><a href="${artist.telegram}" target="_blank" rel="noopener">${artist.phoneLabel}</a></p>
          <p>${t(artist.city, lang)}</p>
        </div>
        <form class="contact-form" action="${form.action}" method="POST">
          <input type="hidden" name="_subject" value="${form.subject}">
          <input type="hidden" name="_captcha" value="false">
          <input type="hidden" name="_next" value="${form.next}">
          <div id="form-thanks" class="form-thanks" hidden>${t(L.thanks, lang)}</div>
          <label><span>${t(L.name, lang)}</span><input type="text" name="name" required></label>
          <label><span>${t(L.email, lang)}</span><input type="email" name="email" required></label>
          <label><span>${t(L.message, lang)}</span><textarea name="message" rows="5" required></textarea></label>
          <button type="submit">${t(L.send, lang)}</button>
        </form>
      </div>
    </section>`;
  },
};

/* ── Каркас сторінки ─────────────────────────────────────────── */

const header = (lang, data) => `
  <header class="topbar">
    <a href="#top" class="topbar-name">${t(data.artist.name, lang)}</a>
    <div class="lang-toggle" role="group" aria-label="Мова / Language">
      <button data-lang="uk" class="${lang === 'uk' ? 'active' : ''}" aria-label="Українська">УКР</button>
      <span>/</span>
      <button data-lang="en" class="${lang === 'en' ? 'active' : ''}" aria-label="English">EN</button>
    </div>
  </header>`;

const hero = (lang, data) => `
  <section class="hero">
    <div class="hero-text">
      <p class="kicker"><span class="dot">●</span> PORTFOLIO <span class="dot">●</span></p>
      <h1>${t(data.artist.name, lang)}</h1>
      <p class="hero-sub">${t(data.artist.tagline, lang)}</p>
    </div>
    <figure class="hero-photo">
      <img src="${imageUrl(data.artist.photo, { width: IMG.full })}" alt="${t(data.artist.name, lang)}" fetchpriority="high">
    </figure>
  </section>`;

const footer = (lang, data) => `
  <footer class="footer">
    <div class="socials">
      <a href="${data.artist.instagram}" target="_blank" rel="noopener" aria-label="Instagram">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r="1" fill="currentColor" stroke="none"/></svg>
      </a>
    </div>
    <p>© ${new Date().getFullYear()} ${t(data.artist.name, lang)}</p>
  </footer>`;

/**
 * Лайтбокс — один на всю сторінку, спершу прихований.
 * <img> — для фото, <iframe> — для відео / PDF з Google Drive.
 * Обидва порожні, поки лайтбокс закритий, тому нічого не вантажать.
 */
const lightbox = () => `
  <div class="lightbox" id="lightbox" hidden>
    <button class="lightbox-close" aria-label="Close">✕</button>
    <img src="" alt="">
    <iframe class="lightbox-frame" src="" title="" allow="autoplay; fullscreen" allowfullscreen hidden></iframe>
  </div>`;

/**
 * Головна функція: збирає всю сторінку однією мовою з переданого контенту.
 * app.js викликає її при старті, після завантаження таблиці й при зміні мови.
 */
export function renderPage(lang, data = content) {
  const sections = data.sections
    .map((s) => sectionRenderers[s.type](s, lang, data))
    .join('\n');

  return `
    ${header(lang, data)}
    <main id="top">
      ${hero(lang, data)}
      ${sections}
    </main>
    ${footer(lang, data)}
    ${lightbox()}`;
}
