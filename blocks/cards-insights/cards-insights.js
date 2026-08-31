import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Builds a static (non-functional) filter bar matching the live Insights listing.
 * @returns {HTMLElement}
 */
function buildFilterBar() {
  const bar = document.createElement('div');
  bar.className = 'cards-insights-filters';
  bar.innerHTML = `
    <div class="cards-insights-facets">
      <a class="cards-insights-clear" href="#" tabindex="-1" aria-hidden="true">Clear All</a>
      <div class="cards-insights-facet">Service</div>
      <div class="cards-insights-facet">Content Type</div>
      <div class="cards-insights-facet">Industry</div>
    </div>
    <div class="cards-insights-search">
      <input type="text" placeholder="Search" aria-label="Search" disabled>
      <a class="cards-insights-search-btn" href="#" tabindex="-1" aria-hidden="true">Search</a>
    </div>`;
  return bar;
}

/**
 * Builds a static (non-functional) pagination bar matching the live Insights listing.
 * @returns {HTMLElement}
 */
function buildPagination() {
  const nav = document.createElement('nav');
  nav.className = 'cards-insights-pagination';
  nav.setAttribute('aria-label', 'Pagination');
  const pages = ['‹', '1', '2', '3', '…', '84', '85', '›'];
  const ul = document.createElement('ul');
  pages.forEach((p, i) => {
    const li = document.createElement('li');
    if (i === 1) li.className = 'active';
    if (i === 0) li.className = 'disabled';
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = p;
    a.setAttribute('tabindex', '-1');
    a.setAttribute('aria-hidden', 'true');
    li.append(a);
    ul.append(li);
  });
  nav.append(ul);
  return nav;
}

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-insights-card-image';
      else div.className = 'cards-insights-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';

  // Detect the "listing" instance vs the "Success Stories" instance.
  // The Success Stories instance shares its section with an embed-video block;
  // the standalone listing instance does not. Only the listing gets the
  // static filter bar and pagination.
  const section = block.closest('.section');
  const isListing = section && !section.querySelector('.embed-video');

  if (isListing) {
    block.classList.add('cards-insights-listing');
    block.append(buildFilterBar());
    block.append(ul);
    block.append(buildPagination());
  } else {
    block.classList.add('cards-insights-stories');
    block.append(ul);
  }
}
