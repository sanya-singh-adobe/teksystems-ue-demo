/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroInsightsParser from './parsers/hero-insights.js';
import cardsInsightsParser from './parsers/cards-insights.js';
import columnsFeatureParser from './parsers/columns-feature.js';
import embedVideoParser from './parsers/embed-video.js';
import cardsNewsParser from './parsers/cards-news.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/teksystems-cleanup.js';
import sectionsTransformer from './transformers/teksystems-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero-insights': heroInsightsParser,
  'cards-insights': cardsInsightsParser,
  'columns-feature': columnsFeatureParser,
  'embed-video': embedVideoParser,
  'cards-news': cardsNewsParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'insights',
  description: 'Insights landing page: intro hero promo, faceted insight tile listing, featured success-story columns, video + success stories + newsroom, and a Connect With Us social band.',
  urls: [
    'https://www.teksystems.com/en/insights',
  ],
  blocks: [
    {
      name: 'hero-insights',
      instances: ['.score-stripe.padding-top-30px.cover .score-column2.wide-left.vertically-center-alignment-desktop'],
    },
    {
      name: 'cards-insights',
      instances: [
        '.score-tile-grid',
        '.collection-left',
      ],
    },
    {
      name: 'columns-feature',
      instances: ['.score-column2.equal.vertically-center-alignment-tablet.tablet-width-initial'],
    },
    {
      name: 'embed-video',
      instances: ['.video-container'],
    },
    {
      name: 'cards-news',
      instances: ['.news.collection-short'],
    },
  ],
  sections: [
    {
      id: 'rc3',
      name: 'Insights intro + featured report promo',
      selector: '#main-content > div.score-stripe.padding-top-30px.cover',
      style: null,
      blocks: ['hero-insights'],
      defaultContent: [
        '#main-content > div.score-stripe.padding-top-30px.cover .score-breadcrumb',
        '#main-content > div.score-stripe.padding-top-30px.cover .score-content-spot.h1-type-2',
      ],
    },
    {
      id: 'rc4',
      name: 'Insights listing grid',
      selector: '#main-content > div.score-stripe.animate.fadeInUp:nth-of-type(2)',
      style: null,
      blocks: ['cards-insights'],
      defaultContent: [],
    },
    {
      id: 'rc5',
      name: 'Featured success story (columns)',
      selector: '#main-content > div.score-stripe.animate.divide-top.fadeInUp:nth-of-type(3)',
      style: null,
      blocks: ['columns-feature'],
      defaultContent: [],
    },
    {
      id: 'rc6',
      name: 'Video + Success Stories + Newsroom',
      selector: '#main-content > div.score-stripe.animate.divide-top.extra-padding.top.fadeInUp',
      style: null,
      blocks: ['embed-video', 'cards-insights', 'cards-news'],
      defaultContent: [],
    },
    {
      id: 'rc7',
      name: 'Connect with Us social band',
      selector: '#main-content > div.score-stripe.connect-with-us',
      style: 'highlight',
      blocks: [],
      defaultContent: ['#main-content > div.score-stripe.connect-with-us'],
    },
  ],
};

// TRANSFORMER REGISTRY - cleanup first, then section breaks/metadata
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 * @param {string} hookName - 'beforeTransform' or 'afterTransform'
 * @param {Element} element - The DOM element to transform
 * @param {Object} payload - { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Array of block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

// EXPORT DEFAULT CONFIGURATION
export default {
  transform: (payload) => {
    const {
      document, url, html, params,
    } = payload;

    const main = document.body;

    // 1. Execute beforeTransform transformers (initial cleanup + section breaks)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return; // Already replaced by earlier parser
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. Execute afterTransform transformers (final cleanup + section metadata)
    executeTransformers('afterTransform', main, payload);

    // 5. Apply WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Generate sanitized path (root URL maps to /index to avoid importer crash)
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
