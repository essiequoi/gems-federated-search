const APP_ID = 'XEN89OMQH5';
const SEARCH_ONLY_API_KEY = 'a684e78a4a24acf2e7391c6612d2cad1';

const INDICES = {
  series: 'prod_gems_series_EN_test',
  products: 'prod_gems_products_EN_test',
  documents: 'prod_gems_documents_EN_test',
  pages: 'prod_gems_pages_EN_test'
};


const FIELD_MAP = {
  series: {
    title: ['name', 'sku', 'objectID'],
    description: ['description', 'meta_description', 'summary'],
    image: ['ProductSeriesImage', 'SKUImage', 'images.image_url'],
    url: ['custom_url']
  },
  products: {
    title: ['name','WebsiteTitle'],
    description: ['description', 'meta_description'],
    image: ['images.image_url', 'SKUImage'],
    url: ['custom_url']
  },
  documents: {
    title: ['title'],
    description: ['fileShortDescription', 'series'],
    url: ['url']
  },
  pages: {
    title: ['title'],
    description: ['description'],
    url: ['url'],
    image: ['image']
  }
};

const searchClient = algoliasearch(APP_ID, SEARCH_ONLY_API_KEY);

// Optional: logs the federated multi-query request
const loggingSearchClient = {
  ...searchClient,
  search(requests) {
    console.log('Algolia multi-query requests:', requests);
    return searchClient.search(requests).then((response) => {
      console.log('Algolia multi-query response:', response);
      return response;
    });
  }
};

const search = instantsearch({
  indexName: INDICES.series,
  searchClient: loggingSearchClient,
  routing: true
});

let activeTab = 'series';

function firstValue(hit, paths = []) {
  for (const path of paths) {
    const value = hit[path];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function truncate(value = '', max = 140) {
  const text = String(value).trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function getSeriesCard(hit) {
  const title = firstValue(hit, FIELD_MAP.series.title) || 'Untitled series';
  const description = truncate(
    firstValue(hit, FIELD_MAP.series.description) || '',
    110
  );
  const image = firstValue(hit, FIELD_MAP.series.image) || 'https://via.placeholder.com/500x300?text=Series';
  const url = firstValue(hit, FIELD_MAP.series.url) || '#';

  return `
    <article class="result-card">
      <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" />
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
      <a href="${escapeHtml(url)}">VIEW FULL DETAILS</a>
    </article>
  `;
}

function getProductRow(hit) {
  const title = firstValue(hit, FIELD_MAP.products.title) || 'Untitled product';
  const description = truncate(firstValue(hit, FIELD_MAP.products.description) || '', 180);
  const image = firstValue(hit, FIELD_MAP.products.image);
  const url = firstValue(hit, FIELD_MAP.products.url) || '#';

  return `
    <article class="row-card">
      ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" style="width:120px;height:120px;object-fit:contain;margin-bottom:12px;" />` : ''}
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
      <a href="${escapeHtml(url)}">View product</a>
    </article>
  `;
}

function getDocumentRow(hit) {
  const title = firstValue(hit, FIELD_MAP.documents.title) || 'Untitled document';
  const description = truncate(firstValue(hit, FIELD_MAP.documents.description) || '', 220);
  const url = firstValue(hit, FIELD_MAP.documents.url) || '#';

  return `
    <article class="row-card">
      <div class="row-meta">Document</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open document</a>
    </article>
  `;
}

function getPageRow(hit) {
  const title = firstValue(hit, FIELD_MAP.pages.title) || 'Untitled page';
  const description = truncate(firstValue(hit, FIELD_MAP.pages.description) || '', 220);
  const url = firstValue(hit, FIELD_MAP.pages.url) || '#';

  return `
    <article class="row-card">
      <div class="row-meta">Page</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open page</a>
    </article>
  `;
}

const customSearchBox = instantsearch.connectors.connectSearchBox(
  (renderOptions, isFirstRender) => {
    const { query, refine, clear } = renderOptions;
    const container = document.querySelector('#searchbox');

    if (isFirstRender) {
      container.innerHTML = `
        <div class="custom-searchbox">
          <input type="search" placeholder="3B" aria-label="Search" />
          <div class="custom-searchbox-actions">
            <button class="search-icon" type="button" aria-label="Search">⌕</button>
            <button class="clear-btn" type="button" aria-label="Clear">✕</button>
          </div>
        </div>
      `;

      const input = container.querySelector('input');
      const clearBtn = container.querySelector('.clear-btn');

      let timer;

      input.addEventListener('input', (event) => {
        const value = event.currentTarget.value;
        clearTimeout(timer);
        timer = setTimeout(() => {
          refine(value);
        }, 250);
      });

      clearBtn.addEventListener('click', () => {
        input.value = '';
        clear();
        input.focus();
      });
    }

    const input = container.querySelector('input');
    if (input && input.value !== query) {
      input.value = query;
    }
  }
);

function updateTabUI(nextTab) {
  activeTab = nextTab;

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.tab === nextTab);
  });

  document.querySelectorAll('.panel').forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.panel === nextTab);
  });

  updateResultsMeta();
}

function getIndexResults(indexId) {
  const state = search.renderState?.[INDICES[indexId]];
  return state?.hits?.results || null;
}

function getIndexHitCount(indexId) {
  const results = getIndexResults(indexId);
  return results?.nbHits || 0;
}

function updateTabCounts() {
  document.getElementById('count-series').textContent = getIndexHitCount('series');
  document.getElementById('count-products').textContent = getIndexHitCount('products');
  document.getElementById('count-documents').textContent = getIndexHitCount('documents');
  document.getElementById('count-pages').textContent = getIndexHitCount('pages');
}

function updateResultsMeta() {
  const meta = document.getElementById('results-meta');
  const results = getIndexResults(activeTab);
  const query = search.helper?.state?.query || '';

  if (!results) {
    meta.textContent = query
      ? `Showing 0 results for ${query}`
      : 'Showing all results';
    return;
  }

  const start = results.nbHits === 0 ? 0 : results.page * results.hitsPerPage + 1;
  const end = Math.min((results.page + 1) * results.hitsPerPage, results.nbHits);

  meta.textContent = query
    ? `Showing ${start} - ${end} of ${results.nbHits} for ${query}`
    : `Showing ${start} - ${end} of ${results.nbHits}`;
}

document.getElementById('tabs').addEventListener('click', (event) => {
  const button = event.target.closest('.tab');
  if (!button) return;
  updateTabUI(button.dataset.tab);
});

search.addWidgets([
  customSearchBox({
    container: '#searchbox'
  }),

  instantsearch.widgets.configure({
    hitsPerPage: 8,
    clickAnalytics: true
  }),

  instantsearch.widgets.index({ indexName: INDICES.series }).addWidgets([
    instantsearch.widgets.hits({
      container: '#hits-series',
      templates: {
        empty: 'No product series found.',
        item(hit) {
          return getSeriesCard(hit);
        }
      }
    }),
    instantsearch.widgets.pagination({
      container: '#pagination-series'
    }),
    instantsearch.widgets.refinementList({
      container: '#series-refinement',
      attribute: 'series',
      searchable: true,
      operator: 'or',
      limit: 8,
      showMore: true
    })
  ]),

  instantsearch.widgets.index({ indexName: INDICES.products }).addWidgets([
    instantsearch.widgets.hits({
      container: '#hits-products',
      templates: {
        empty: 'No part numbers found.',
        item(hit) {
          return getProductRow(hit);
        }
      },
      cssClasses: {
        list: 'product-list'
      }
    }),
    instantsearch.widgets.pagination({
      container: '#pagination-products'
    })
  ]),

  instantsearch.widgets.index({ indexName: INDICES.documents }).addWidgets([
    instantsearch.widgets.hits({
      container: '#hits-documents',
      templates: {
        empty: 'No documents found.',
        item(hit) {
          return getDocumentRow(hit);
        }
      },
      cssClasses: {
        list: 'doc-list'
      }
    }),
    instantsearch.widgets.pagination({
      container: '#pagination-documents'
    })
  ]),

  instantsearch.widgets.index({ indexName: INDICES.pages }).addWidgets([
    instantsearch.widgets.hits({
      container: '#hits-pages',
      templates: {
        empty: 'No pages found.',
        item(hit) {
          return getPageRow(hit);
        }
      },
      cssClasses: {
        list: 'page-list'
      }
    }),
    instantsearch.widgets.pagination({
      container: '#pagination-pages'
    })
  ])
]);

search.on('render', () => {
  updateTabCounts();
  updateResultsMeta();
});

search.start();