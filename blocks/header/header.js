// media query match that indicates desktop width
const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Fetches the nav fragment, trying the local /content path first and then the
 * production root path. Metadata-independent by design so DA/EDS preview and
 * publish both resolve correctly.
 * @returns {Promise<Document|null>} parsed fragment document
 */
async function fetchNavFragment() {
  // metadata-independent: /content first (localhost / aem up), then root (DA/EDS prod)
  let base = '/content/';
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) {
    base = '/';
    resp = await fetch('/nav.plain.html');
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
 * Closes all open dropdown panels and controls in the nav.
 * @param {Element} nav The nav container
 */
function closeAllPanels(nav) {
  nav.querySelectorAll('[aria-expanded="true"]').forEach((el) => {
    el.setAttribute('aria-expanded', 'false');
    const owner = el.closest('li');
    if (owner) owner.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Toggles a single dropdown/megamenu panel, closing any siblings first.
 * The open state is read from the owning <li> (what the CSS uses to reveal the
 * panel) rather than the trigger, so external tooling that pre-sets
 * aria-expanded on the trigger cannot desync the toggle.
 * @param {Element} trigger The trigger element that owns the panel
 * @param {Element} nav The nav container
 */
function togglePanel(trigger, nav) {
  const owner = trigger.closest('li');
  const expanded = owner ? owner.getAttribute('aria-expanded') === 'true' : trigger.getAttribute('aria-expanded') === 'true';
  closeAllPanels(nav);
  const next = expanded ? 'false' : 'true';
  trigger.setAttribute('aria-expanded', next);
  if (owner) owner.setAttribute('aria-expanded', next);
}

/**
 * Builds an interactive control (search or locale) from a source link. The link
 * copy/label and href come from the nav DOM; the control chrome is created here.
 * @param {Element} link The source <a> to enhance
 * @param {string} type Control type: 'search' or 'locale'
 * @param {Element} nav The nav container
 */
function buildControl(link, type, nav) {
  const li = link.closest('li');
  li.classList.add('nav-control', `nav-${type}`);
  const label = link.textContent.trim();
  const { href } = link;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'nav-control-trigger';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-label', label);
  trigger.innerHTML = `<span class="nav-control-label">${label}</span>`;

  const panel = document.createElement('div');
  panel.className = 'nav-control-panel';

  if (type === 'search') {
    const form = document.createElement('form');
    form.setAttribute('role', 'search');
    form.action = href;
    const input = document.createElement('input');
    input.type = 'search';
    input.name = 'q';
    input.placeholder = 'Type search term here';
    input.setAttribute('aria-label', 'Search');
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = 'Search';
    form.append(input, submit);
    panel.append(form);
    // keep a real link target for the search page (also gives the panel a
    // navigable item) — href/label are read from the source nav DOM
    const go = document.createElement('a');
    go.href = href;
    go.textContent = label;
    panel.append(go);
  } else {
    // locale: list current locale option(s) read from the source link label
    const list = document.createElement('ul');
    const opt = document.createElement('li');
    const optLink = document.createElement('a');
    optLink.href = href;
    optLink.textContent = label;
    opt.append(optLink);
    list.append(opt);
    panel.append(list);
  }

  li.textContent = '';
  li.append(trigger, panel);

  trigger.addEventListener('click', () => {
    const expanded = trigger.getAttribute('aria-expanded') === 'true';
    closeAllPanels(nav);
    trigger.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    li.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  });
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await fetchNavFragment();
  if (!fragment) return;

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-expanded', 'false');
  const sections = fragment.body.querySelectorAll(':scope > div');
  sections.forEach((section) => nav.append(section));

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  // brand: strip button decoration if present
  const navBrand = nav.querySelector('.nav-brand');
  if (navBrand) {
    const brandLink = navBrand.querySelector('.button');
    if (brandLink) {
      brandLink.className = '';
      const container = brandLink.closest('.button-container');
      if (container) container.className = '';
    }
  }

  // main nav sections: mark items that own a sub-panel and wire click toggles
  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll(':scope > ul > li').forEach((item) => {
      const panel = item.querySelector(':scope > ul');
      if (panel) {
        item.classList.add('nav-drop');
        item.setAttribute('aria-expanded', 'false');
        panel.classList.add('nav-megamenu-panel');
        panel.setAttribute('role', 'menu');
        const trigger = item.querySelector(':scope > a');
        if (trigger) {
          trigger.setAttribute('aria-expanded', 'false');
          trigger.setAttribute('aria-haspopup', 'true');
          trigger.addEventListener('click', (e) => {
            e.preventDefault();
            togglePanel(trigger, nav);
          });
        }
      }
    });
  }

  // tools: build search + locale controls from the source links
  const navTools = nav.querySelector('.nav-tools');
  if (navTools) {
    navTools.querySelectorAll('a').forEach((link) => {
      const label = link.textContent.trim().toLowerCase();
      if (label === 'search') buildControl(link, 'search', nav);
      else if (label.includes('english') || label.includes('locale')) buildControl(link, 'locale', nav);
    });
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => {
    const expanded = nav.getAttribute('aria-expanded') === 'true';
    nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    hamburger.querySelector('button').setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
    document.body.style.overflowY = expanded ? '' : 'hidden';
  });
  nav.prepend(hamburger);

  // close panels on outside click
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) closeAllPanels(nav);
  });

  // close panels on escape
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') closeAllPanels(nav);
  });

  // reset state when crossing the desktop/mobile breakpoint
  isDesktop.addEventListener('change', () => {
    closeAllPanels(nav);
    nav.setAttribute('aria-expanded', 'false');
    document.body.style.overflowY = '';
    const btn = hamburger.querySelector('button');
    if (btn) btn.setAttribute('aria-label', 'Open navigation');
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
