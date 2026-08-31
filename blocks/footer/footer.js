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

  // Ensure chrome images survive the fragment round-trip. When stored in JCR,
  // an image-wrapped-in-link can lose its <img>; restore from repo-served
  // /icons so the brand logo and social icons always render.
  const brand = footer.querySelector('.footer-brand');
  if (brand) {
    let brandImg = brand.querySelector('img');
    if (!brandImg) {
      brandImg = document.createElement('img');
      const holder = brand.querySelector('a') || brand.querySelector('p') || brand;
      holder.append(brandImg);
    }
    brandImg.src = '/icons/tek-tgs-footer-logo.svg';
    brandImg.alt = 'TEKsystems and TGS combined logo';
  }
  const socialMap = [
    ['linkedin', 'TEKsystems LinkedIn'],
    ['facebook', 'TEKsystems Facebook'],
    ['youtube', 'TEKsystems YouTube'],
    ['twitter', 'TEKsystems Twitter'],
    ['instagram', 'TEKsystems Instagram'],
  ];
  footer.querySelectorAll('.footer-legal a[href]').forEach((a) => {
    const match = socialMap.find(([key]) => a.getAttribute('href').includes(key));
    if (match && !a.querySelector('img')) {
      const icon = document.createElement('img');
      [, icon.alt] = match;
      icon.src = `/icons/${match[0]}.svg`;
      a.textContent = '';
      a.append(icon);
    }
  });

  block.append(footer);
}
