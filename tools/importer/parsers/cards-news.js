/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-news.
 * Base block: cards (container). Child model "card": image (reference), imageAlt (collapsed), text (richtext).
 * Source: https://www.teksystems.com/en/insights (Newsroom list .news.collection-short).
 * No-image dated newsroom list: article.tile__item with empty/hidden <img> (no src).
 * Each card = one row with 2 cells: [image (empty here)] [text: type, date, title(link)].
 */
export default function parse(element, { document }) {
  const items = Array.from(element.querySelectorAll('article.tile__item'));

  const cells = [];

  items.forEach((item) => {
    const content = item.querySelector('.tile__content') || item;

    // IMAGE cell — newsroom items carry an empty/hidden <img> with no src; keep cell empty.
    const img = item.querySelector('.tile__img img');
    const imageCell = [];
    if (img && img.getAttribute('src')) {
      imageCell.push(document.createComment(' field:image '));
      imageCell.push(img);
    }

    // TEXT cell
    const textEls = [];

    const type = content.querySelector('.tile__type');
    const date = content.querySelector('.tile__date');
    if (type || date) {
      const p = document.createElement('p');
      const parts = [];
      if (type && type.textContent.trim()) parts.push(type.textContent.trim());
      if (date && date.textContent.trim()) parts.push(date.textContent.trim());
      p.textContent = parts.join(' — ');
      if (parts.length) textEls.push(p);
    }

    const titleEl = content.querySelector('.tile__title');
    const link = content.querySelector('.tile__title a, .tile__action a, a[href]');
    const href = link ? link.getAttribute('href').trim() : null;
    if (titleEl) {
      const h = document.createElement('h3');
      const titleText = titleEl.textContent.trim();
      if (href) {
        const a = document.createElement('a');
        a.setAttribute('href', href);
        a.textContent = titleText;
        h.appendChild(a);
      } else {
        h.textContent = titleText;
      }
      textEls.push(h);
    }

    // Description (usually empty in newsroom list) — include only if present.
    const desc = content.querySelector('.tile__text');
    if (desc && desc.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = desc.textContent.trim();
      textEls.push(p);
    }

    const textCell = [];
    if (textEls.length) {
      textCell.push(document.createComment(' field:text '));
      textCell.push(...textEls);
    }

    cells.push([imageCell, textCell]);
  });

  // Empty-block guard
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-news', cells });
  element.replaceWith(block);
}
