/**
 * render.js — ШАР ВІДОБРАЖЕННЯ: перетворює дані з content.js на HTML.
 *
 * Кожна функція тут «компонент»: чиста функція (дані, мова) → рядок HTML.
 * Жодного стану і жодних обробників подій — це все живе в app.js.
 *
 * Рендер виконується один раз при завантаженні і один раз при зміні мови,
 * тому вартість — мілісекунди; нічого не перераховується «на льоту».
 *
 * CSS-класи навмисно ті самі, що були в статичній версії, —
 * assets/style.css працює без змін.
 */

import { content } from './content.js';

/**
 * Повертає текст потрібною мовою.
 * Приймає або двомовний об'єкт { uk, en }, або звичайний рядок.
 * Якщо перекладу немає — падає назад на українську.
 */
export const t = (field, lang) =>
  typeof field === 'string' ? field : (field[lang] ?? field.uk);

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

/** Одна робота в сітці: картинка + (опційно) підпис у два рядки. */
const workFigure = (work, lang) => {
  const caption = work.title
    ? `<figcaption><span>${t(work.title, lang)}</span><br><span>${t(work.materials, lang)}</span></figcaption>`
    : '';
  return `<figure><img src="${work.src}" alt="${work.alt}" loading="lazy">${caption}</figure>`;
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
        <img src="${s.image.src}" alt="${s.image.alt}" loading="lazy">
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
  contact: (s, lang) => {
    const { artist, form } = content;
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

const header = (lang) => `
  <header class="topbar">
    <a href="#top" class="topbar-name">${t(content.artist.name, lang)}</a>
    <div class="lang-toggle" role="group" aria-label="Мова / Language">
      <button data-lang="uk" class="${lang === 'uk' ? 'active' : ''}" aria-label="Українська">УКР</button>
      <span>/</span>
      <button data-lang="en" class="${lang === 'en' ? 'active' : ''}" aria-label="English">EN</button>
    </div>
  </header>`;

const hero = (lang) => `
  <section class="hero">
    <div class="hero-text">
      <p class="kicker"><span class="dot">●</span> PORTFOLIO <span class="dot">●</span></p>
      <h1>${t(content.artist.name, lang)}</h1>
      <p class="hero-sub">${t(content.artist.tagline, lang)}</p>
    </div>
    <figure class="hero-photo">
      <img src="${content.artist.photo}" alt="${t(content.artist.name, lang)}" fetchpriority="high">
    </figure>
  </section>`;

const footer = (lang) => `
  <footer class="footer">
    <div class="socials">
      <a href="${content.artist.instagram}" target="_blank" rel="noopener" aria-label="Instagram">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r="1" fill="currentColor" stroke="none"/></svg>
      </a>
    </div>
    <p>© ${new Date().getFullYear()} ${t(content.artist.name, lang)}</p>
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
 * Головна функція: збирає всю сторінку однією мовою.
 * app.js викликає її при старті та при перемиканні мови.
 */
export function renderPage(lang) {
  const sections = content.sections
    .map((s) => sectionRenderers[s.type](s, lang))
    .join('\n');

  return `
    ${header(lang)}
    <main id="top">
      ${hero(lang)}
      ${sections}
    </main>
    ${footer(lang)}
    ${lightbox()}`;
}
