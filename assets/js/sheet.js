/**
 * sheet.js — ЗАВАНТАЖЕННЯ КОНТЕНТУ З GOOGLE-ТАБЛИЦІ.
 *
 * Читає опубліковану Google-таблицю як CSV і збирає з неї об'єкт контенту
 * тієї ж форми, що очікує render.js. Якщо таблиця вимкнена (порожній
 * SHEET_ID у config.js), недоступна, порожня чи зламана — повертає null,
 * і сайт лишається на вбудованому контенті (content.js). Тобто Google ніяк
 * не може «покласти» сайт — у найгіршому разі показується дефолт.
 *
 * Схема таблиці (одна вкладка, рядок = блок) описана в SHEET.md.
 * Порядок рядків = порядок на сторінці.
 */

import { SHEET_ID, SHEET_GID } from './config.js';
import { content as defaultContent } from './content.js';

/** URL CSV-експорту одного аркуша (без ключів API; треба лише доступ
 *  «за посиланням: перегляд»). */
const csvUrl = (id, gid) =>
  `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}`;

/**
 * Головна функція. Вантажить і збирає контент; null → лишається дефолт.
 */
export async function loadContentFromSheet() {
  if (!SHEET_ID) return null; // таблиця не налаштована
  try {
    const res = await fetch(csvUrl(SHEET_ID, SHEET_GID), { cache: 'no-store' });
    if (!res.ok) return null;
    const rows = parseCSV(await res.text());
    const sections = buildSections(rows);
    if (!sections.length) return null; // порожня/некоректна таблиця
    // Секцію контактів беремо з дефолту (вона не редагується через таблицю),
    // решту — з таблиці. Дані художниці/форми теж лишаються з дефолту.
    const contact = defaultContent.sections.find((s) => s.type === 'contact');
    return { ...defaultContent, sections: contact ? [...sections, contact] : sections };
  } catch {
    return null;
  }
}

/* ── CSV-парсер (без залежностей) ────────────────────────────── */

/**
 * Парсить CSV у масив об'єктів, ключі — із заголовкового рядка.
 * Коректно обробляє лапки, коми й переноси рядків усередині комірок та CRLF.
 */
export function parseCSV(text) {
  const s = text.replace(/^﻿/, ''); // прибрати BOM
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue; } // подвоєні лапки
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  row.push(field);
  rows.push(row);
  // прибрати завершальний порожній рядок
  if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') rows.pop();
  if (!rows.length) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o = {};
    headers.forEach((h, idx) => { o[h] = r[idx] ?? ''; });
    return o;
  });
}

/* ── Збірка секцій із рядків ──────────────────────────────────── */

/** Двомовне поле з пари колонок; null якщо обидві порожні. */
const bi = (o, ukKey, enKey) => {
  const uk = (o[ukKey] || '').trim();
  const en = (o[enKey] || '').trim();
  if (!uk && !en) return null;
  return { uk, en: en || uk };
};

/** Абзаци: ділимо обидві мови по порожньому рядку й зшиваємо за індексом. */
const toParagraphs = (o) => {
  const split = (v) => (v || '').split(/\r?\n\s*\r?\n/).map((x) => x.trim()).filter(Boolean);
  const uk = split(o['Текст (укр)']);
  const en = split(o['Текст (eng)']);
  return uk.map((u, idx) => ({ uk: u, en: en[idx] || u }));
};

/** Лінк секції. Якщо задано «Тип-лінка» (video/pdf) — відкриється в
 *  лайтбоксі; адресу для iframe виведе render.js з href (YouTube/Drive).
 *  undefined якщо URL порожній. */
const buildLink = (o) => {
  const href = (o['Лінк-URL'] || '').trim();
  if (!href) return undefined;
  const label = bi(o, 'Лінк-текст (укр)', 'Лінк-текст (eng)') || { uk: '↗', en: '↗' };
  const embed = (o['Тип-лінка'] || '').trim();
  return embed ? { label, href, embed } : { label, href };
};

/**
 * Перетворює лінійний список рядків на масив секцій.
 * Рядки типів section / group / work читаються по порядку й відтворюють
 * дерево секцій та груп робіт.
 */
export function buildSections(rows) {
  const sections = [];
  let section = null;   // поточна секція
  let group = null;     // поточна група робіт (для галерей)

  // Дописати накопичену групу в секцію, якщо в ній є роботи.
  const flushGroup = () => {
    if (section && section.type === 'gallery' && group && group.works.length) {
      section.groups.push(group);
    }
    group = null;
  };

  for (const o of rows) {
    const type = (o['Тип'] || '').trim().toLowerCase();
    if (!type) continue;

    if (type === 'section') {
      flushGroup();
      const kind = (o['Тип-секції'] || '').trim().toLowerCase();
      const title = bi(o, 'Заголовок (укр)', 'Заголовок (eng)');
      const caption = bi(o, 'Підпис (укр)', 'Підпис (eng)');
      const grid = (o['Сітка'] || 'grid-2').trim();

      if (kind === 'statement') {
        section = { type: 'statement', title: (title && title.uk) || 'Artist Statement', paragraphs: toParagraphs(o) };
      } else if (kind === 'split' || kind === 'split-reverse') {
        section = {
          type: 'split',
          ...(kind === 'split-reverse' ? { reverse: true } : {}),
          kicker: bi(o, 'Кікер (укр)', 'Кікер (eng)') || { uk: '', en: '' },
          title: title || { uk: '', en: '' },
          paragraphs: toParagraphs(o),
          link: buildLink(o),
          image: {
            src: (o['Зображення'] || '').trim(),
            alt: (title && title.uk) || '',
            ...(caption ? { caption } : {}),
          },
        };
      } else { // gallery
        section = { type: 'gallery', title: title || { uk: '', en: '' }, paragraphs: toParagraphs(o), link: buildLink(o), groups: [] };
        // перша група успадковує сітку й (опційно) підпис із рядка секції
        group = { grid, works: [], ...(caption ? { caption } : {}) };
      }
      sections.push(section);
      continue;
    }

    if (type === 'group') {
      flushGroup();
      group = {
        grid: (o['Сітка'] || 'grid-2').trim(),
        works: [],
        ...(bi(o, 'Заголовок (укр)', 'Заголовок (eng)') ? { title: bi(o, 'Заголовок (укр)', 'Заголовок (eng)') } : {}),
        ...(bi(o, 'Підпис (укр)', 'Підпис (eng)') ? { caption: bi(o, 'Підпис (укр)', 'Підпис (eng)') } : {}),
      };
      continue;
    }

    if (type === 'work') {
      if (!section) continue;
      if (!group) group = { grid: 'grid-2', works: [] }; // на випадок роботи без секції-галереї
      const title = bi(o, 'Заголовок (укр)', 'Заголовок (eng)');
      const work = {
        src: (o['Зображення'] || '').trim(),
        alt: (title && title.uk) || '',
        ...(title ? { title } : {}),
        ...(bi(o, 'Матеріали (укр)', 'Матеріали (eng)') ? { materials: bi(o, 'Матеріали (укр)', 'Матеріали (eng)') } : {}),
      };
      group.works.push(work);
      continue;
    }
  }
  flushGroup();
  return sections;
}
