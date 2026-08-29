/* eslint-disable */
/* global WebImporter */
/**
 * Parser for embed-video.
 * Base block: embed. Model: embed_placeholder (reference image), embed_placeholderAlt (collapsed),
 * embed_uri (text URL). embed_placeholder + embed_uri share the "embed_" prefix -> same cell.
 * Source: https://www.teksystems.com/en/insights (Drive Innovation featured video).
 * The poster image is in the DOM; the YouTube URL is loaded via JS on click (not in DOM),
 * so it is supplied from the analyzed embed URL.
 * Structure (1 column, 2 rows): [name] / [poster image (above) + embed URL link].
 */
export default function parse(element, { document }) {
  // Poster image
  const poster = element.querySelector('img.video__img, img');

  // YouTube embed URL — not present in the static DOM (JS-loaded on click).
  // Sourced from page analysis for this instance.
  const embedUrl = 'https://www.youtube.com/embed/QpOGxoWf7N0';

  const link = document.createElement('a');
  link.setAttribute('href', embedUrl);
  link.textContent = embedUrl;

  // Empty-block guard
  if (!poster && !embedUrl) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Single cell holding the grouped embed_ fields: poster image above the URL link.
  const cell = [];
  if (poster) {
    cell.push(document.createComment(' field:embed_placeholder '));
    cell.push(poster);
  }
  cell.push(document.createComment(' field:embed_uri '));
  cell.push(link);

  const cells = [[cell]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'embed-video', cells });
  element.replaceWith(block);
}
