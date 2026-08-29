/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: TEKsystems site-wide cleanup.
 * Removes non-authorable site chrome and dynamic controls so the import
 * contains only page-level authorable content.
 * All selectors verified against migration-work/cleaned.html.
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Cookie consent / privacy overlays and empty layout wrappers (verified in cleaned.html:
    // #onetrust-consent-sdk @2467, #onetrust-banner-sdk @2713, #overlay-wrapper @2,
    // empty #css-override > div:nth-of-type(2)). Removed before parsing so they cannot
    // interfere with block matching.
    WebImporter.DOMUtils.remove(element, [
      '#onetrust-consent-sdk',
      '#onetrust-banner-sdk',
      '#overlay-wrapper',
      '#css-override > div:nth-of-type(2)',
    ]);

    // rc4 listing dynamic controls — faceted search bar, typeahead search box,
    // results anchor, spinner, and pagination. These are runtime controls, not
    // authorable content (verified: .score-facet-container @1207, .score-search-box @1608,
    // a#results.score-anchorpoint @1204, .more-spinner @1835, ul.pagination.score-classic-pager @1839).
    // Removed before parsing so the cards-insights parser only sees the .score-tile-grid tiles.
    WebImporter.DOMUtils.remove(element, [
      '.score-facet-container',
      '.score-search-box',
      'a#results.score-anchorpoint',
      '.more-spinner',
      'ul.pagination.score-classic-pager',
    ]);

    // Client-side search "no results / service unavailable" messages rendered into
    // the listing section from the (now-stubbed) search index. Not authorable.
    WebImporter.DOMUtils.remove(element, [
      '.score-no-search-results',
      '.score-search-service-unavailable',
    ]);

    // Decorative full-bleed background image placed as a direct child of the intro
    // cover stripe (outside the hero-insights block). The authorable hero image is
    // inside .score-column2.wide-left; this backdrop is presentational chrome.
    element.querySelectorAll('.score-stripe.padding-top-30px.cover > img').forEach((img) => img.remove());

    // Inline SVG-gradient-def images (zero-size) the page injects at body top for
    // icon theming. The importer's preProcess converts these base64 data URIs to
    // empty blob: URLs before this hook runs, so match both forms. Presentational only.
    element.querySelectorAll('img[src^="data:image/svg+xml"], img[src^="blob:"]').forEach((img) => img.remove());
  }

  if (hookName === TransformHook.afterTransform) {
    // Site chrome — non-authorable global header/nav/footer
    // (verified: header.score-header @12, nav.score-megamenu @321, footer.score-footer @2244).
    WebImporter.DOMUtils.remove(element, [
      'header.score-header',
      'nav.score-megamenu',
      'footer.score-footer',
    ]);

    // Leftover non-content elements safe to strip.
    WebImporter.DOMUtils.remove(element, [
      'noscript',
      'iframe',
      'link',
      'style',
      'script',
    ]);
  }
}
