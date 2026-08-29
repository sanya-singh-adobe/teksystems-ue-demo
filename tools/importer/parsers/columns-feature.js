/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-feature.
 * Base block: columns (2 columns, 1 row). Columns blocks use DEFAULT CONTENT only — NO field hints.
 * Source: https://www.teksystems.com/en/insights (Featured success-story section).
 * Row 2: [left column: eyebrow, title, body, CTA] [right column: image].
 */
export default function parse(element, { document }) {
  const left = element.querySelector('.score-left') || element;
  const right = element.querySelector('.score-right');

  // LEFT column content
  const leftEls = [];
  const eyebrow = left.querySelector('.score-highlight-header');
  if (eyebrow && eyebrow.textContent.trim()) {
    const p = document.createElement('p');
    p.textContent = eyebrow.textContent.trim();
    leftEls.push(p);
  }
  const title = left.querySelector('.caption h2, h2, h1, h3');
  if (title) leftEls.push(title);
  const body = left.querySelector('.score-highlight-body');
  if (body) leftEls.push(body);
  const cta = left.querySelector('.score-call-to-action a, a.score-button');
  if (cta) leftEls.push(cta);

  // RIGHT column content (image)
  const rightEls = [];
  const img = (right || element).querySelector('img.score-image, img');
  if (img) rightEls.push(img);

  // Empty-block guard
  if (!leftEls.length && !rightEls.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Columns block: one content row with two cells (no field hints).
  const cells = [[leftEls, rightEls]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-feature', cells });
  element.replaceWith(block);
}
