/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-insights.
 * Base block: hero. Model: image (reference), imageAlt (collapsed), text (richtext).
 * Source: https://www.teksystems.com/en/insights (intro featured-report promo).
 * Structure (1 column, up to 3 rows): [name] / [image] / [text: title, subheading, body, CTA].
 */
export default function parse(element, { document }) {
  // INPUT extraction (validated against source.html)
  const image = element.querySelector('.score-right img, img.score-image, img');
  const caption = element.querySelector('.caption') || element;
  const title = caption.querySelector('h2, h1, h3');
  const subheading = caption.querySelector('h3:not(:first-of-type), .score-highlight-header');
  const body = caption.querySelector('.score-highlight-body, .score-highlight-body p, p');
  const ctas = Array.from(caption.querySelectorAll('.score-call-to-action a, a.score-button'));

  // Collect text-cell content
  const textEls = [];
  if (title) textEls.push(title);
  // h3 immediately after h2 is the subheading
  const h3 = caption.querySelector('h2 ~ h3');
  if (h3) textEls.push(h3);
  if (body) textEls.push(body);
  ctas.forEach((a) => textEls.push(a));

  // Empty-block guard
  if (!image && textEls.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Row: image (field:image). imageAlt collapses into the <img> alt attribute.
  if (image) {
    cells.push([[document.createComment(' field:image '), image]]);
  }

  // Row: text (field:text)
  if (textEls.length) {
    cells.push([[document.createComment(' field:text '), ...textEls]]);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-insights', cells });
  element.replaceWith(block);
}
