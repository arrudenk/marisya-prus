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

/* ── Проєкти (секції split/gallery → плитки + оверлей) ───────── */

/** Рядок → слаг для URL-hash: маленькі літери, все крім літер/цифр → «-». */
const slugify = (s) =>
  String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');

/**
 * Список плиток мозаїки hero. Кожна секція split або gallery = плитка
 * (slug з англійської назви — стабільний для шерингу; обкладинка —
 * section.cover, якщо задана, інакше перше зображення секції). Спереду
 * додаємо велику плитку «Artist Statement» (обкладинка — фото художниці).
 * Обчислюється при рендері (разова робота), тому працює і для контенту
 * з Google-таблиці без жодних змін у sheet.js.
 */
export function projectsFrom(data) {
  const seen = new Set();
  const tiles = data.sections
    .filter((s) => s.type === 'split' || s.type === 'gallery')
    .map((s, i) => {
      let slug = slugify(t(s.title, 'en')) || `project-${i + 1}`;
      if (seen.has(slug)) slug = `${slug}-${i + 1}`; // страховка від дублів назв
      seen.add(slug);
      const cover = s.cover
        || (s.type === 'split' ? s.image.src : s.groups[0]?.works[0]?.src)
        || '';
      return { slug, cover, section: s };
    });
  // Стейтмент — окрема велика плитка з фото художниці як обкладинкою.
  const statement = data.sections.find((s) => s.type === 'statement');
  if (statement) {
    tiles.unshift({ slug: 'artist-statement', cover: data.artist.photo, section: statement });
  }
  return tiles;
}

/** Великі плитки (2×2): «Artist Statement» і «Artworks». Впізнаємо за slug
 *  (стабільний і для контенту з таблиці: назва «Artworks» → slug `artworks`). */
const isFeature = (p) => p.slug === 'artist-statement' || p.slug === 'artworks';

/** Одна плитка: фото + затемнення + назва (взаємодія показує обидва). */
const tileHTML = (p, lang) => `
      <a class="project-tile${isFeature(p) ? ' feature' : ''}" href="#p/${encodeURIComponent(p.slug)}">
        <img src="${imageUrl(p.cover, { width: isFeature(p) ? IMG.full : IMG.grid })}" alt="" loading="lazy">
        <span class="tile-shade"></span>
        <span class="tile-title">${t(p.section.title, lang)}</span>
      </a>`;

/**
 * Вміст мозаїки hero. Проходимо секції В ЇХ ПОРЯДКУ (таблиця = сайт:
 * додаси/переставиш секцію — плитка з'явиться саме там). Секція `divider`
 * малюється як роздільник-напис на всю ширину (напр. «Проєкти») — це
 * звичайний рядок у таблиці, тож його видно й ним керуєш там. Решта
 * (statement/split/gallery) — квадратні плитки; contact тощо пропускаємо.
 */
const heroMosaic = (lang, data) => {
  const bySection = new Map(projectsFrom(data).map((p) => [p.section, p]));
  return data.sections
    .map((s) => {
      if (s.type === 'divider') {
        return `<div class="mosaic-divider"><span>${t(s.title, lang)}</span></div>`;
      }
      const p = bySection.get(s);
      return p ? tileHTML(p, lang) : '';
    })
    .filter(Boolean)
    .join('\n');
};

/**
 * HTML вмісту одного проєкту для оверлея. Використовує ті самі рендерери
 * секцій, що й раніше рендерили їх на головній, — вигляд усередині
 * оверлея ідентичний, стилі не дублюються.
 */
export function renderProjectHTML(slug, lang, data = content) {
  const p = projectsFrom(data).find((x) => x.slug === slug);
  if (!p) return null;
  return sectionRenderers[p.section.type](p.section, lang, data);
}

/**
 * Оверлей проєкту («режим кінотеатру») — один на сторінку, спершу порожній
 * і прихований. app.js наповнює .project-panel через renderProjectHTML()
 * при відкритті та очищує при закритті (звільняє DOM і картинки).
 */
const projectOverlay = () => `
  <div class="project-overlay" id="project-overlay" hidden>
    <button class="project-close" aria-label="Close">✕</button>
    <div class="project-panel"></div>
  </div>`;

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

/**
 * Пункти навігаційного меню (праворуч у шапці). About і Gallery відкривають
 * оверлей (hash #p/<slug>); Projects/Series/Contacts прокручують сторінку до
 * потрібного місця (data-scroll → обробляється в app.js). Жирні (strong) —
 * About, Gallery, Contacts.
 */
const navItems = [
  { label: 'About', href: '#p/artist-statement', strong: true },
  { label: 'Gallery', href: '#p/artworks', strong: true },
  { label: 'Projects', scroll: 'projects' },
  { label: 'Series', scroll: 'series' },
  { label: 'Contacts', scroll: 'contact', strong: true },
];

const navMenu = (lang) => `
    <nav class="nav-menu">
      <button class="nav-toggle" aria-haspopup="true" aria-expanded="false" aria-label="${t({ uk: 'Розділи', en: 'Sections' }, lang)}">☰</button>
      <div class="nav-dropdown">
        <div class="nav-dropdown-inner">
          ${navItems.map((i) => `<a class="nav-item${i.strong ? ' nav-strong' : ''}" href="${i.href || '#top'}"${i.scroll ? ` data-scroll="${i.scroll}"` : ''}>${i.label}</a>`).join('\n          ')}
        </div>
      </div>
    </nav>`;

const header = (lang, data) => `
  <header class="topbar">
    <div class="lang-toggle" role="group" aria-label="Мова / Language">
      <button data-lang="uk" class="${lang === 'uk' ? 'active' : ''}" aria-label="Українська">УКР</button>
      <span>/</span>
      <button data-lang="en" class="${lang === 'en' ? 'active' : ''}" aria-label="English">EN</button>
    </div>
    <a href="#top" class="topbar-name">${t(data.artist.name, lang)}</a>
    ${navMenu(lang)}
  </header>`;

/**
 * Hero: ім'я зверху, під ним мозаїка. Спершу дві великі плитки 2×2 —
 * «Artist Statement» (обкладинка — фото художниці) і «Artworks», — потім
 * роздільник «Проєкти / Projects», під ним плитки проєктів.
 * Landscape (див. CSS): 4 колонки (великі плитки 2×2, проєкти 1×1).
 * Portrait: одна колонка — кожна плитка на всю ширину, по одній за раз.
 * Клік по будь-якій плитці відкриває її вміст в оверлеї.
 */
const hero = (lang, data) => `
  <section class="hero">
    <div class="hero-mosaic">
      ${heroMosaic(lang, data)}
    </div>
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
  // На головній інлайном лишаються тільки контакти. Стейтмент і проєкти
  // (split/gallery) не рендеряться тут — вони живуть плитками в мозаїці hero
  // й відкриваються в оверлеї.
  const parts = data.sections
    .filter((s) => s.type === 'contact')
    .map((s) => sectionRenderers[s.type](s, lang, data));

  return `
    ${header(lang, data)}
    <main id="top">
      ${hero(lang, data)}
      ${parts.join('\n')}
    </main>
    ${footer(lang, data)}
    ${lightbox()}
    ${projectOverlay()}`;
}
