import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Reorganizes the "video + Success Stories + Newsroom" section into a
 * full-width video followed by a two-column layout: Success Stories (left)
 * and Newsroom (right), matching the live site. This block (cards-news) is
 * the only single instance in that section, so we run the layout here once.
 * @param {HTMLElement} newsWrapper the .cards-news-wrapper element
 */
function buildTwoColumnLayout(newsWrapper) {
  const section = newsWrapper.closest('.section');
  if (!section || section.querySelector('.insights-two-col')) return;

  const findHeading = (text) => [...section.querySelectorAll('h2')]
    .find((h) => h.textContent.trim() === text);
  const ssHeading = findHeading('Success Stories');
  const newsHeading = findHeading('Newsroom');
  if (!ssHeading || !newsHeading) return;

  const ssCardsWrapper = section.querySelector('.cards-insights-wrapper');
  const moreSS = [...section.querySelectorAll('a[href]')]
    .find((a) => /success-stories$/.test(a.getAttribute('href') || ''));
  const moreNews = [...section.querySelectorAll('a[href]')]
    .find((a) => /newsroom$/.test(a.getAttribute('href') || ''));

  const twoCol = document.createElement('div');
  twoCol.className = 'insights-two-col';
  const left = document.createElement('div');
  left.className = 'insights-col insights-col-stories';
  const right = document.createElement('div');
  right.className = 'insights-col insights-col-news';
  twoCol.append(left, right);

  // Left column: Success Stories heading, cards, "More Success Stories"
  left.append(ssHeading);
  if (ssCardsWrapper) left.append(ssCardsWrapper);
  if (moreSS) left.append(moreSS.closest('p') || moreSS);

  // Right column: Newsroom heading, news cards, "More News"
  right.append(newsHeading);
  right.append(newsWrapper);
  if (moreNews) right.append(moreNews.closest('p') || moreNews);

  // Insert the two-column block after the video (or at the end).
  const videoWrapper = section.querySelector('.embed-video-wrapper');
  if (videoWrapper && videoWrapper.parentElement === section) {
    videoWrapper.after(twoCol);
  } else {
    section.append(twoCol);
  }

  // Clean up any now-empty default-content wrappers left behind.
  [...section.querySelectorAll('.default-content-wrapper')].forEach((w) => {
    if (!w.textContent.trim() && !w.querySelector('img, picture, a')) w.remove();
  });
}

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-news-card-image';
      else div.className = 'cards-news-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);

  const newsWrapper = block.closest('.cards-news-wrapper');
  if (newsWrapper) buildTwoColumnLayout(newsWrapper);
}
