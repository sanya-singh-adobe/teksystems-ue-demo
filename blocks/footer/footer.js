/**
 * Fetches the footer fragment, trying the local /content path first and then
 * the production root path. Metadata-independent by design so DA/EDS preview and
 * publish both resolve correctly.
 * @returns {Promise<Document|null>} parsed fragment document
 */
async function fetchFooterFragment() {
  // metadata-independent: /content first (localhost / aem up), then root (DA/EDS prod)
  let base = '/content/';
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) {
    base = '/';
    resp = await fetch('/footer.plain.html');
  }
  if (!resp.ok) return null;
  const html = await resp.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Resolve relative image paths against the fragment location, not the page URL.
  doc.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src');
    if (src && !/^(https?:)?\/\//.test(src) && !src.startsWith('/')) {
      img.setAttribute('src', `${base}${src}`);
    }
  });
  doc.querySelectorAll('source[srcset]').forEach((s) => {
    const src = s.getAttribute('srcset');
    if (src && !/^(https?:)?\/\//.test(src) && !src.startsWith('/')) {
      s.setAttribute('srcset', `${base}${src}`);
    }
  });
  return doc;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const fragment = await fetchFooterFragment();
  if (!fragment) return;

  block.textContent = '';
  const footer = document.createElement('div');
  const sections = [...fragment.body.querySelectorAll(':scope > div')];
  sections.forEach((section) => footer.append(section));

  // label sections in document order:
  // brand (logo) | description | resources | policies | legal | disclaimer
  const classes = [
    'footer-brand',
    'footer-description',
    'footer-links',
    'footer-links',
    'footer-legal',
    'footer-disclaimer',
  ];
  [...footer.children].forEach((section, i) => {
    if (classes[i]) section.classList.add(classes[i]);
  });

  // distinguish the two link columns (first = resources, second = policies)
  const linkCols = footer.querySelectorAll('.footer-links');
  if (linkCols[0]) linkCols[0].classList.add('footer-resources');
  if (linkCols[1]) linkCols[1].classList.add('footer-policies');

  // group description + the two link columns into one responsive row
  const cols = footer.querySelectorAll('.footer-description, .footer-links');
  if (cols.length) {
    const row = document.createElement('div');
    row.className = 'footer-columns';
    cols[0].before(row);
    cols.forEach((col) => row.append(col));
  }

  block.append(footer);
}
