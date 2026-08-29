/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-insights.
 * Base block: cards (container). Child model "card": image (reference), imageAlt (collapsed), text (richtext).
 * Source: https://www.teksystems.com/en/insights
 * Handles TWO DOM shapes:
 *   1. Main tile listing: .score-tile-grid > ul > li.tek-tiles (anchor-wrapped tile__img / tile__content)
 *   2. Success Stories column: .collection-left ... article.tile__item (tile__img / tile__content)
 * Each card = one row with 2 cells: [image] [text: type, title, description, CTA].
 */
export default function parse(element, { document }) {
  // Collect card units from either shape. Prefer <li> tiles, else <article> tiles.
  let items = Array.from(element.querySelectorAll('li.tek-tiles'));
  if (!items.length) items = Array.from(element.querySelectorAll('article.tile__item'));
  if (!items.length) items = Array.from(element.querySelectorAll('.tek-search-item.tile'));

  const cells = [];

  items.forEach((item) => {
    // IMAGE cell -----------------------------------------------------------
    const imgWrap = item.querySelector('.tile__img');
    const img = (imgWrap || item).querySelector('img');
    const imageCell = [];
    // Only include images that actually have a src (newsroom-style empty imgs skipped)
    if (img && img.getAttribute('src')) {
      imageCell.push(document.createComment(' field:image '));
      imageCell.push(img);
    }
    // else leave empty cell (no field hint on empty cell)

    // TEXT cell ------------------------------------------------------------
    const content = item.querySelector('.tile__content') || item;
    const textEls = [];

    // Content type / eyebrow
    const type = content.querySelector('.tek-tile--content-type, .tile__type');
    if (type) {
      const p = document.createElement('p');
      p.textContent = type.textContent.trim();
      textEls.push(p);
    }

    // Title — may be a heading (article shape) or a plain div (li shape). Link if present.
    const link = item.querySelector('.tile__img a, .tile__title a, a[href]');
    const href = link ? link.getAttribute('href').trim() : null;
    const titleEl = content.querySelector('.tek-tile--title, .tile__title');
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

    // Description
    const desc = content.querySelector('.tek-tile--description, .tile__text');
    if (desc && desc.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = desc.textContent.trim();
      textEls.push(p);
    }

    // Call-to-action — reuse the tile link as an explicit anchor. The li shape uses
    // a non-anchor span ("Read More"); the article shape has .tile__action a ("Read How").
    const ctaSpan = content.querySelector('.score-content-spot .btn-link, .tile__action a');
    const ctaText = ctaSpan ? ctaSpan.textContent.trim() : '';
    if (href && ctaText) {
      const a = document.createElement('a');
      a.setAttribute('href', href);
      a.textContent = ctaText;
      textEls.push(a);
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

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-insights', cells });
  element.replaceWith(block);
}
