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
 * КАРКАС РЕДИЗАЙНУ:
 *   ┌ topbar (fixed зверху):  about · ім'я · дослідження(дропдаун проєктів)
 *   │ main:                   квадратний слайдер фото
 *   └ bottombar (fixed знизу): укр/en · «Записки…» · contacts
 * Сторінки (statement/проєкти) відкриваються ІНЛАЙН у .page-panel
 * (шторка згори вниз); «Записки» — темна .zapysky-panel (шторка знизу
 * вгору); contacts — маленьке віконце-модалка.
 *
 * Рендер виконується кілька разів за сесію максимум (старт, підміна з
 * таблиці, зміна мови) — вартість мілісекунди; нічого не крутиться «на льоту».
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

/** Написи інтерфейсу (не контент — тому тут, а не в content.js). */
const UI = {
  about: { uk: 'about', en: 'about' },
  research: { uk: 'дослідження', en: 'research' },
  contacts: { uk: 'contacts', en: 'contacts' },
  close: { uk: 'закрити', en: 'close' },
};

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

/**
 * Перетворює звичайне посилання на URL для вбудовування в iframe лайтбокса.
 * Підтримує YouTube (watch / youtu.be / embed / shorts) і Google Drive.
 * Так у таблицю можна вставити будь-яке з цих посилань — сайт сам зробить
 * правильний embed. Невідомий тип повертається як є (фолбек).
 */
const YT_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
export function embedUrl(href) {
  if (!href) return '';
  const h = String(href).trim();
  const yt = h.match(YT_RE);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0`;
  const dr = h.match(DRIVE_RE);
  if (dr) return `https://drive.google.com/file/d/${dr[1]}/preview`;
  return h;
}

/* ── Дрібні будівельні блоки ─────────────────────────────────── */

/** Абзаци тексту: масив L-об'єктів → <p>…</p><p>…</p> */
const paragraphs = (list, lang) =>
  (list ?? []).map((p) => `<p>${t(p, lang)}</p>`).join('\n');

/**
 * Зовнішній лінк секції. Якщо задано link.embed ('video'/'pdf') —
 * app.js перехопить клік і відкриє вміст у лайтбоксі («режим кінотеатру»)
 * замість переходу. Адреса для iframe виводиться з href через embedUrl()
 * (YouTube / Drive). href лишається робочим фолбеком (нова вкладка тощо).
 */
const extLink = (link, lang) => {
  if (!link) return '';
  const previewAttrs = link.embed
    ? ` data-preview="${embedUrl(link.href)}" data-embed="${link.embed}"`
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

/** Напис-заглушка «в наявності» (числовий 0 → «в наявності / in stock»). */
const PRICE_IN_STOCK = { uk: 'в наявності', en: 'in stock' };

/**
 * Ціна в кутку роботи. Значення береться з work.price (клітинка «Ціна» в
 * таблиці). Порожнє → нічого. Числовий 0 → «в наявності / in stock».
 * Будь-що інше показуємо як є (напр. «€500», «12 000 грн»).
 */
const priceTag = (work, lang) => {
  const raw = work.price;
  if (raw == null || String(raw).trim() === '') return '';
  const s = String(raw).trim();
  const digits = s.replace(/\D/g, '');                  // лише цифри
  const isZero = digits !== '' && Number(digits) === 0; // «0», «0.00», «0 грн»
  const text = isZero ? t(PRICE_IN_STOCK, lang) : s;    // інакше — як є
  return `<span class="work-price">${text}</span>`;
};

/** Одна робота в сітці: картинка (+ ціна в кутку) + (опційно) підпис. */
const workFigure = (work, lang) => {
  const caption = work.title
    ? `<figcaption><span>${t(work.title, lang)}</span><br><span>${t(work.materials, lang)}</span></figcaption>`
    : '';
  return `<figure><span class="work-media">${imgTag(work.src, work.alt)}${priceTag(work, lang)}</span>${caption}</figure>`;
};

/** Група робіт: (опційно) підзаголовок + сітка + (опційно) підпис під сіткою. */
const workGroup = (group, lang) => `
  ${group.title ? `<h3 class="sub-title">${t(group.title, lang)}</h3>` : ''}
  <div class="grid ${group.grid}">
    ${group.works.map((w) => workFigure(w, lang)).join('\n')}
  </div>
  ${group.caption ? `<div class="grid-cap">${t(group.caption, lang)}</div>` : ''}`;

/* ── Проєкти (секції split/gallery → список «дослідження») ───── */

/** Рядок → слаг для URL-hash: маленькі літери, все крім літер/цифр → «-». */
const slugify = (s) =>
  String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');

/**
 * Список проєктів із контенту: кожна секція типу split або gallery.
 * Slug рахується з англійської назви (стабільний для шерингу).
 * Обчислюється при рендері (разова робота), тому працює і для контенту
 * з Google-таблиці без жодних змін у sheet.js.
 */
export function projectsFrom(data) {
  const seen = new Set();
  return data.sections
    .filter((s) => s.type === 'split' || s.type === 'gallery')
    .map((s, i) => {
      let slug = slugify(t(s.title, 'en')) || `project-${i + 1}`;
      if (seen.has(slug)) slug = `${slug}-${i + 1}`; // страховка від дублів назв
      seen.add(slug);
      return { slug, section: s };
    });
}

/**
 * HTML вмісту інлайн-сторінки за слагом:
 *  - `artist-statement` → секція-стейтмент (кнопка «about»);
 *  - інакше — проєкт зі списку «дослідження».
 * null → невідомий слаг (панель не відкриється).
 */
export function renderProjectHTML(slug, lang, data = content) {
  if (slug === 'artist-statement') {
    const s = data.sections.find((x) => x.type === 'statement');
    return s ? sectionRenderers.statement(s, lang, data) : null;
  }
  const p = projectsFrom(data).find((x) => x.slug === slug);
  if (!p) return null;
  return sectionRenderers[p.section.type](p.section, lang, data);
}

/* ── «Записки злочинів проти тварин» (темний рідер) ──────────── */

/**
 * Сторінки «Записок» у ЗВОРОТНОМУ порядку: остання сторінка PDF зверху,
 * перша — знизу. app.js при відкритті прокручує панель у самий низ, тож
 * читач бачить 1-у сторінку й гортає ВГОРУ — порядок читання правильний.
 * aspect-ratio: 1/1 на слотах (сторінки квадратні) резервує місце до
 * завантаження — прокрутка в низ точна, layout не стрибає.
 */
export function renderZapyskyHTML(lang, data = content) {
  const z = data.zapysky;
  if (!z || !z.pages?.length) return null;
  const pages = [...z.pages].reverse()
    .map((src, i) => {
      const n = z.pages.length - i; // справжній номер сторінки (для alt)
      return `<figure class="zp-page"><img src="${src}" alt="${t(z.title, lang)} — ${n}" loading="lazy"></figure>`;
    })
    .join('\n');
  return `
    <div class="zp-pages">
      ${pages}
    </div>`;
}

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
};

/* ── Каркас: topbar / слайдер / bottombar / панелі ───────────── */

/**
 * Фото для слайдера головної: з секції типу `header` у таблиці (рядки
 * work → колонка «Зображення»), а якщо такої секції нема — з
 * artist.headerPhotos (резерв content.js).
 */
const headerPhotosFrom = (data) => {
  const sec = data.sections?.find((s) => s.type === 'header');
  const fromSheet = sec ? sec.groups.flatMap((g) => g.works).map((w) => w.src).filter(Boolean) : [];
  return fromSheet.length ? fromSheet : (data.artist.headerPhotos || []);
};

/**
 * Квадратний слайдер фото на головній: авто-перемикання + клікабельні
 * крапки + свайп/драг. Логіка — app.js → setupHeaderCarousel().
 */
const photoSlider = (photos) => {
  if (!photos || !photos.length) return '';
  const slides = photos
    .map((src) => `<div class="fc-slide"><img src="${imageUrl(src, { width: IMG.full })}" alt="" loading="lazy"></div>`)
    .join('');
  const dots = photos
    .map((_, i) => `<button class="fc-dot${i === 0 ? ' active' : ''}" data-go="${i}" aria-label="${i + 1}"></button>`)
    .join('');
  return `
    <div class="photo-slider">
      <div class="fc-window">
        <div class="fc-track">${slides}</div>
      </div>
      <div class="fc-dots">${dots}</div>
    </div>`;
};

/**
 * Topbar (fixed зверху, завжди поверх): about · ім'я · «дослідження».
 * about → інлайн-сторінка стейтменту (#p/artist-statement).
 * «дослідження» → дропдаун зі списком проєктів (лінки #p/<slug>).
 */
const topbar = (lang, data) => `
  <header class="topbar">
    <a class="topbar-about" href="#p/artist-statement">${t(UI.about, lang)}</a>
    <a class="topbar-name" href="#top">${t(data.artist.name, lang)}</a>
    <nav class="nav-menu">
      <button class="nav-toggle" aria-haspopup="true" aria-expanded="false">${t(UI.research, lang)}</button>
      <div class="nav-dropdown">
        <div class="nav-dropdown-inner">
          ${projectsFrom(data).map((p) => `<a class="nav-item" href="#p/${encodeURIComponent(p.slug)}">${t(p.section.title, lang)}</a>`).join('\n          ')}
        </div>
      </div>
    </nav>
  </header>`;

/**
 * Bottombar (fixed знизу, завжди поверх): укр/en · «Записки…» · contacts.
 * «Записки» → темний рідер (#zapysky); contacts → маленьке віконце-модалка.
 */
const bottombar = (lang, data) => `
  <footer class="bottombar">
    <div class="lang-toggle" role="group" aria-label="Мова / Language">
      <button data-lang="uk" class="${lang === 'uk' ? 'active' : ''}" aria-label="Українська">укр</button>
      <span>/</span>
      <button data-lang="en" class="${lang === 'en' ? 'active' : ''}" aria-label="English">en</button>
    </div>
    <a class="zapysky-link" href="#zapysky">${t(data.zapysky?.title ?? '', lang)}</a>
    <button class="contacts-link">${t(UI.contacts, lang)}</button>
  </footer>`;

/**
 * Інлайн-панель сторінок (about + проєкти) — шторка, що розгортається
 * ЗГОРИ ВНИЗ на весь екран між topbar і bottombar. Завжди в DOM,
 * закрита = зсунута за верхній край (transform, композитор). app.js
 * наповнює .panel-inner при відкритті та очищує після закриття.
 */
const pagePanel = () => `
  <div class="page-panel" id="page-panel" aria-hidden="true">
    <div class="panel-inner"></div>
  </div>`;

/**
 * Панель «Записок» — темна шторка, що розгортається ЗНИЗУ ВГОРУ.
 * Вміст (реверсні сторінки PDF) вставляє app.js при відкритті й
 * прокручує панель у низ (там 1-а сторінка).
 */
const zapyskyPanel = () => `
  <div class="zapysky-panel" id="zapysky-panel" aria-hidden="true">
    <div class="panel-inner"></div>
  </div>`;

/**
 * Маленьке віконце contacts («режим кінотеатру»): затемнений фон,
 * по центру — карточка лише з поштою (без форми).
 */
const contactModal = (lang, data) => `
  <div class="contact-modal" id="contact-modal" hidden>
    <div class="contact-card">
      <button class="modal-close" aria-label="${t(UI.close, lang)}">✕</button>
      <p class="contact-name">${t(data.artist.name, lang)}</p>
      <a class="contact-mail" href="mailto:${data.artist.email}">${data.artist.email}</a>
    </div>
  </div>`;

/**
 * Лайтбокс — один на всю сторінку, спершу прихований.
 * <img> — для фото (клік по роботі в проєкті), <iframe> — для відео / PDF
 * з Google Drive. Обидва порожні, поки лайтбокс закритий.
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
  return `
    ${topbar(lang, data)}
    <main id="top">
      ${photoSlider(headerPhotosFrom(data))}
    </main>
    ${bottombar(lang, data)}
    ${pagePanel()}
    ${zapyskyPanel()}
    ${contactModal(lang, data)}
    ${lightbox()}`;
}
