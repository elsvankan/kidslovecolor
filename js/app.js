/**
 * KidsLoveColor — Main Application
 * ===================================
 * Handles: rendering, search, filter, modal, print, download,
 *          dynamic SEO (meta title/description/canonical),
 *          structured data injection (ImageObject per page)
 * Languages: nl (Dutch), en (English), fr (French), es (Spanish), zh (Chinese)
 */

// -------------------------------------------------------
// STATE
// -------------------------------------------------------
const _htmlLang = document.documentElement.lang;
let currentLang = ['nl','en','fr','es','zh'].includes(_htmlLang) ? _htmlLang : 'nl';

// Fix image paths: subpages (en/fr/es/zh) keep the ../ prefix; root (nl) strips it
const _IS_SUBPAGE = currentLang !== 'nl';
function resolveImgPath(img) {
  if (!img) return null;
  return _IS_SUBPAGE ? img : img.replace(/^\.\.\//, '');
}

let activeCategory  = 'all';
let searchQuery     = '';
let currentColoring = null;

// Base URL map for canonical / schema
const BASE_URL_MAP = {
  nl: 'https://kidslovecolor.com/',
  en: 'https://kidslovecolor.com/en/',
  fr: 'https://kidslovecolor.com/fr/',
  es: 'https://kidslovecolor.com/es/',
  zh: 'https://kidslovecolor.com/zh/',
};
const BASE_URL = BASE_URL_MAP[currentLang] || 'https://kidslovecolor.com/';

// -------------------------------------------------------
// TRANSLATIONS
// -------------------------------------------------------
const t = (key) => TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS.nl[key] || key;

const TRANSLATIONS = {
  nl: {
    all_pages:          'Alle kleurplaten',
    search_placeholder: 'Zoek kleurplaten...',
    print_btn:          'Afdrukken',
    download_btn:       'Downloaden',
    close:              'Sluiten',
    difficulty_easy:    'Makkelijk',
    difficulty_medium:  'Gemiddeld',
    difficulty_hard:    'Moeilijk',
    no_results_title:   'Geen kleurplaten gevonden',
    no_results_text:    'Probeer een andere zoekterm of selecteer een andere categorie.',
    result_count:       '{n} gratis kleurplaten',
    free_label:         '100% Gratis',
    ad_label:           'Advertentie',
    license_note:       'Gratis voor persoonlijk gebruik',
    section_heading:    'Printbare Kleurplaten',
    free_coloring_page: 'Gratis kleurplaat',
    keywords_label:     'Zoektermen',
    license_text:       'CC0 Gratis',
    popup_alert:        'Sta pop-ups toe om af te drukken.',
    no_img_alert:       'Geen afbeelding beschikbaar.',
    print_tagline:      '🎨 Gratis kleurplaten voor kinderen — kidslovecolor.com',
    card_aria:          'Gratis kleurplaat: {title}, categorie {cat}, moeilijkheid {diff}',
    all_free_label:     'Alle gratis kleurplaten',
    free_cat_label:     'Gratis {label} kleurplaten',
  },
  en: {
    all_pages:          'All coloring pages',
    search_placeholder: 'Search coloring pages...',
    print_btn:          'Print',
    download_btn:       'Download',
    close:              'Close',
    difficulty_easy:    'Easy',
    difficulty_medium:  'Medium',
    difficulty_hard:    'Hard',
    no_results_title:   'No coloring pages found',
    no_results_text:    'Try a different search term or select another category.',
    result_count:       '{n} free coloring pages',
    free_label:         '100% Free',
    ad_label:           'Advertisement',
    license_note:       'Free for personal use',
    section_heading:    'Printable Coloring Pages',
    free_coloring_page: 'Free coloring page',
    keywords_label:     'Keywords',
    license_text:       'CC0 Free',
    popup_alert:        'Please allow pop-ups to print.',
    no_img_alert:       'No image available.',
    print_tagline:      '🎨 Free coloring pages for kids — kidslovecolor.com',
    card_aria:          'Free coloring page: {title}, category {cat}, difficulty {diff}',
    all_free_label:     'All free coloring pages',
    free_cat_label:     'Free {label} coloring pages',
  },
  fr: {
    all_pages:          'Toutes les pages à colorier',
    search_placeholder: 'Rechercher des pages à colorier...',
    print_btn:          'Imprimer',
    download_btn:       'Télécharger',
    close:              'Fermer',
    difficulty_easy:    'Facile',
    difficulty_medium:  'Moyen',
    difficulty_hard:    'Difficile',
    no_results_title:   'Aucune page à colorier trouvée',
    no_results_text:    'Essayez un autre terme de recherche ou sélectionnez une autre catégorie.',
    result_count:       '{n} pages à colorier gratuites',
    free_label:         '100% Gratuit',
    ad_label:           'Publicité',
    license_note:       'Gratuit pour usage personnel',
    section_heading:    'Pages à Colorier Imprimables',
    free_coloring_page: 'Page à colorier gratuite',
    keywords_label:     'Mots-clés',
    license_text:       'CC0 Gratuit',
    popup_alert:        'Veuillez autoriser les fenêtres contextuelles pour imprimer.',
    no_img_alert:       'Aucune image disponible.',
    print_tagline:      '🎨 Pages à colorier gratuites pour enfants — kidslovecolor.com',
    card_aria:          'Page à colorier gratuite : {title}, catégorie {cat}, difficulté {diff}',
    all_free_label:     'Toutes les pages à colorier gratuites',
    free_cat_label:     'Pages à colorier {label} gratuites',
  },
  es: {
    all_pages:          'Todas las páginas para colorear',
    search_placeholder: 'Buscar páginas para colorear...',
    print_btn:          'Imprimir',
    download_btn:       'Descargar',
    close:              'Cerrar',
    difficulty_easy:    'Fácil',
    difficulty_medium:  'Medio',
    difficulty_hard:    'Difícil',
    no_results_title:   'No se encontraron páginas para colorear',
    no_results_text:    'Prueba con un término de búsqueda diferente o selecciona otra categoría.',
    result_count:       '{n} páginas para colorear gratis',
    free_label:         '100% Gratis',
    ad_label:           'Publicidad',
    license_note:       'Gratis para uso personal',
    section_heading:    'Páginas para Colorear Imprimibles',
    free_coloring_page: 'Página para colorear gratis',
    keywords_label:     'Palabras clave',
    license_text:       'CC0 Gratis',
    popup_alert:        'Por favor, permite las ventanas emergentes para imprimir.',
    no_img_alert:       'No hay imagen disponible.',
    print_tagline:      '🎨 Páginas para colorear gratis para niños — kidslovecolor.com',
    card_aria:          'Página para colorear gratis: {title}, categoría {cat}, dificultad {diff}',
    all_free_label:     'Todas las páginas para colorear gratis',
    free_cat_label:     'Páginas para colorear de {label} gratis',
  },
  zh: {
    all_pages:          '所有涂色页',
    search_placeholder: '搜索涂色页...',
    print_btn:          '打印',
    download_btn:       '下载',
    close:              '关闭',
    difficulty_easy:    '简单',
    difficulty_medium:  '中等',
    difficulty_hard:    '困难',
    no_results_title:   '未找到涂色页',
    no_results_text:    '请尝试其他搜索词或选择其他类别。',
    result_count:       '{n} 张免费涂色页',
    free_label:         '100% 免费',
    ad_label:           '广告',
    license_note:       '免费供个人使用',
    section_heading:    '可打印涂色页',
    free_coloring_page: '免费涂色页',
    keywords_label:     '关键词',
    license_text:       'CC0 免费',
    popup_alert:        '请允许弹出窗口以进行打印。',
    no_img_alert:       '没有可用的图片。',
    print_tagline:      '🎨 免费儿童涂色页 — kidslovecolor.com',
    card_aria:          '免费涂色页：{title}，类别 {cat}，难度 {diff}',
    all_free_label:     '所有免费涂色页',
    free_cat_label:     '免费{label}涂色页',
  },
};

// -------------------------------------------------------
// INIT
// -------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  renderCategories();
  renderGrid();
  setupSearch();
  setupModal();
  setupScrollTop();
  updateLangUI();
  setupMobileSearch();
  hideEmptyAdBanners();
  injectColoringPageSchema();   // structured data on page load

  // Restore URL from 404.html SPA redirect (for /kleurplaat/SLUG direct visits)
  const spaPendingPath = sessionStorage.getItem('spa_path');
  if (spaPendingPath) {
    sessionStorage.removeItem('spa_path');
    history.replaceState({}, '', spaPendingPath);
  }

  // Auto-open modal when visiting /kleurplaat/SLUG directly
  const slugMatch = window.location.pathname.match(/^\/kleurplaat\/([^/]+)$/);
  if (slugMatch) {
    const item = COLORINGS.find(c => c.slug === slugMatch[1]);
    if (item) openModal(item.id);
  }
});

// -------------------------------------------------------
// DYNAMIC SEO — update meta tags when category/search changes
// -------------------------------------------------------
function updateSEO(cat) {
  const catData = CATEGORIES[cat] || CATEGORIES.all;
  const langData = catData[currentLang] || catData.nl;

  // Title
  const title = langData.pageTitle || CATEGORIES.all[currentLang]?.pageTitle || CATEGORIES.all.nl.pageTitle;
  document.title = title;
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = title;

  // Meta description
  const desc = langData.metaDesc || CATEGORIES.all[currentLang]?.metaDesc || CATEGORIES.all.nl.metaDesc;
  const metaDescEl = document.getElementById('metaDesc');
  if (metaDescEl) metaDescEl.setAttribute('content', desc);
  const allMetaDesc = document.querySelector('meta[name="description"]');
  if (allMetaDesc) allMetaDesc.setAttribute('content', desc);

  // OG tags
  setMeta('og:title',            title);
  setMeta('og:description',      desc);
  setMeta('twitter:title',       title);
  setMeta('twitter:description', desc);

  // Canonical URL
  const canonicalUrl = cat === 'all'
    ? BASE_URL
    : BASE_URL + '?cat=' + encodeURIComponent(cat);
  const canonicalEl = document.getElementById('canonical');
  if (canonicalEl) canonicalEl.setAttribute('href', canonicalUrl);
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink) canonicalLink.setAttribute('href', canonicalUrl);

  // H2 section heading
  const h2 = document.getElementById('sectionHeading');
  if (h2) {
    const catIcon = (CATEGORIES[cat] || CATEGORIES.all).icon;
    h2.innerHTML = catIcon
      ? `<span aria-hidden="true">${catIcon}</span> ${langData.h2 || t('section_heading')}`
      : langData.h2 || t('section_heading');
  }

  // Category intro text
  const intro = document.getElementById('categoryIntro');
  if (intro && langData.intro) intro.textContent = langData.intro;

  // Breadcrumb
  updateBreadcrumb(cat);

  // Re-inject schema for current filtered set
  injectColoringPageSchema(cat);
}

function setMeta(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`)
        || document.querySelector(`meta[name="${property}"]`);
  if (el) el.setAttribute('content', content);
}

// -------------------------------------------------------
// BREADCRUMB
// -------------------------------------------------------
function updateBreadcrumb(cat) {
  const catItem = document.getElementById('breadcrumbCategory');
  const catName = document.getElementById('breadcrumbCategoryName');
  if (!catItem || !catName) return;

  if (cat && cat !== 'all') {
    const catData = CATEGORIES[cat];
    const label   = catData ? (catData[currentLang]?.label || catData.nl.label) : cat;
    catName.textContent = label;
    catItem.style.display = '';
  } else {
    catItem.style.display = 'none';
  }
}

// -------------------------------------------------------
// STRUCTURED DATA — ImageObject per coloring page
// -------------------------------------------------------
function injectColoringPageSchema(cat) {
  const existing = document.getElementById('coloringSchemaScript');
  if (existing) existing.remove();

  const items = COLORINGS.filter(item =>
    !cat || cat === 'all' || item.category === cat
  );

  const langData = (item) => item[currentLang] || item.nl;
  const listName = {
    nl: 'Gratis Printbare Kleurplaten voor Kinderen',
    en: 'Free Printable Coloring Pages for Kids',
    fr: 'Pages à Colorier Gratuites pour Enfants',
    es: 'Páginas para Colorear Gratis para Niños',
    zh: '免费儿童涂色页',
  };
  const freeLabel = {
    nl: 'Gratis Kleurplaat',
    en: 'Free Coloring Page',
    fr: 'Page à Colorier Gratuite',
    es: 'Página para Colorear Gratis',
    zh: '免费涂色页',
  };

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': listName[currentLang] || listName.nl,
    'numberOfItems': items.length,
    'itemListElement': items.map((item, i) => {
      const ld = langData(item);
      const imgUrl = `https://kidslovecolor.com/${item.img.replace(/^\.\.\//,'').replace(/^svg\//,'svg/')}`;
      return {
        '@type': 'ListItem',
        'position': i + 1,
        'item': {
          '@type': 'ImageObject',
          '@id': `${BASE_URL}?kleurplaat=${item.slug}`,
          'name': `${ld.title} – ${freeLabel[currentLang] || freeLabel.nl}`,
          'description': ld.description || '',
          'contentUrl': imgUrl,
          'encodingFormat': item.img.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
          'license': 'https://creativecommons.org/publicdomain/zero/1.0/',
          'acquireLicensePage': 'https://kidslovecolor.com/disclaimer',
          'keywords': ld.keywords || '',
          'representativeOfPage': i === 0,
        }
      };
    })
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id   = 'coloringSchemaScript';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

// -------------------------------------------------------
// CATEGORY NAV
// -------------------------------------------------------
function renderCategories() {
  const nav = document.getElementById('categoryNav');
  if (!nav) return;

  nav.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => {
    const label = cat[currentLang]?.label || cat.nl.label;
    const titleAttr = key === 'all'
      ? t('all_free_label')
      : t('free_cat_label').replace('{label}', label.toLowerCase());
    return `<button
      class="cat-btn ${key === activeCategory ? 'active' : ''}"
      data-cat="${key}"
      aria-pressed="${key === activeCategory}"
      title="${titleAttr}"
    >
      ${cat.icon ? `<span class="cat-icon" aria-hidden="true">${cat.icon}</span>` : ''}
      ${label}
    </button>`;
  }).join('');

  nav.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      nav.querySelectorAll('.cat-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.cat === activeCategory);
        b.setAttribute('aria-pressed', b.dataset.cat === activeCategory);
      });
      renderGrid();
      updateSEO(activeCategory);
      const newUrl = activeCategory === 'all'
        ? window.location.pathname
        : window.location.pathname + '?cat=' + encodeURIComponent(activeCategory);
      history.replaceState({ cat: activeCategory }, '', newUrl);
    });
  });
}

// -------------------------------------------------------
// GRID RENDER
// -------------------------------------------------------
function renderGrid() {
  const grid    = document.getElementById('coloringGrid');
  const noRes   = document.getElementById('noResults');
  const counter = document.getElementById('resultCount');
  if (!grid) return;

  const filtered = COLORINGS.filter(item => {
    const matchCat    = activeCategory === 'all' || item.category === activeCategory;
    const ld          = item[currentLang] || item.nl;
    const searchIn    = (ld.title + ' ' + ld.keywords + ' ' + item.category).toLowerCase();
    const matchSearch = !searchQuery || searchIn.includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  if (counter) {
    counter.textContent = t('result_count').replace('{n}', filtered.length);
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (noRes) {
      noRes.innerHTML = `
        <div class="no-results-icon" aria-hidden="true">🎨</div>
        <h3>${t('no_results_title')}</h3>
        <p>${t('no_results_text')}</p>`;
      noRes.classList.add('visible');
    }
    return;
  }

  if (noRes) noRes.classList.remove('visible');

  grid.innerHTML = filtered.map(item => renderCard(item)).join('');

  // Attach card events
  grid.querySelectorAll('.coloring-card').forEach(card => {
    const id = parseInt(card.dataset.id);

    card.addEventListener('click', (e) => {
      if (!e.target.closest('.overlay-btn')) openModal(id);
    });
    card.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.overlay-btn')) {
        e.preventDefault();
        openModal(id);
      }
    });

    const printBtn = card.querySelector('[data-action="print"]');
    if (printBtn) printBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = COLORINGS.find(c => c.id === id);
      if (item) printColoring(item);
    });

    const dlBtn = card.querySelector('[data-action="download"]');
    if (dlBtn) dlBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = COLORINGS.find(c => c.id === id);
      if (item) downloadColoring(item);
    });
  });
}

// -------------------------------------------------------
// CARD TEMPLATE
// -------------------------------------------------------
function renderCard(item) {
  const ld        = item[currentLang] || item.nl;
  const catKey    = item.category;
  const cat       = CATEGORIES[catKey];
  const catLabel  = cat ? (cat[currentLang]?.label || cat.nl.label) : catKey;
  const diffLabel = t('difficulty_' + item.difficulty);
  const diffClass = 'difficulty-' + item.difficulty;

  const altText = ld.altText || `${t('free_coloring_page')} ${ld.title} – KidsLoveColor`;
  const imgSrc  = resolveImgPath(item.img) || `data:image/svg+xml,${encodeURIComponent(placeholderSVG(ld.title))}`;

  const printLabel    = `${t('print_btn')} – ${ld.title}`;
  const downloadLabel = `${t('download_btn')} – ${ld.title}`;
  const cardAria      = t('card_aria')
    .replace('{title}', ld.title)
    .replace('{cat}',   catLabel)
    .replace('{diff}',  diffLabel);

  return `<article
    class="coloring-card"
    data-id="${item.id}"
    data-category="${catKey}"
    data-slug="${item.slug}"
    role="listitem"
    tabindex="0"
    aria-label="${cardAria}"
  >
    <div class="card-thumbnail">
      <img
        src="${imgSrc}"
        alt="${altText}"
        loading="lazy"
        decoding="async"
        width="300"
        height="424"
        title="${ld.title} – ${t('free_coloring_page')}"
      />
      <div class="card-overlay" aria-hidden="true">
        <button class="overlay-btn" data-action="print"    title="${printLabel}"    aria-label="${printLabel}">🖨️</button>
        <button class="overlay-btn" data-action="download" title="${downloadLabel}" aria-label="${downloadLabel}">⬇️</button>
      </div>
    </div>
    <div class="card-info">
      <h3 class="card-title">${ld.title}</h3>
      <div class="card-meta">
        <span class="card-category">
          <span aria-hidden="true">${cat?.icon || ''}</span>
          <span>${catLabel}</span>
        </span>
        <span class="card-difficulty ${diffClass}" aria-label="${diffLabel}">${diffLabel}</span>
      </div>
    </div>
  </article>`;
}

function placeholderSVG(title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
    <rect width="300" height="300" fill="#f3f0ff"/>
    <rect x="60" y="60" width="180" height="180" rx="12" fill="none" stroke="#c4b5fd" stroke-width="3" stroke-dasharray="10,6"/>
    <text x="150" y="155" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9ca3af">📷</text>
    <text x="150" y="175" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#c4b5fd">${title}</text>
  </svg>`;
}

// -------------------------------------------------------
// SEARCH
// -------------------------------------------------------
function setupSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;
  input.placeholder = t('search_placeholder');
  let debounceTimer;
  input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = e.target.value.trim();
      renderGrid();
      if (searchQuery) {
        history.replaceState({ q: searchQuery }, '', window.location.pathname + '?q=' + encodeURIComponent(searchQuery));
      } else {
        history.replaceState({}, '', window.location.pathname);
      }
    }, 220);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      searchQuery = '';
      renderGrid();
      history.replaceState({}, '', window.location.pathname);
    }
  });
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) { input.value = q; searchQuery = q; }
}

// -------------------------------------------------------
// MODAL
// -------------------------------------------------------
function setupModal() {
  const overlay = document.getElementById('modalOverlay');
  if (!overlay) return;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalPrint')?.addEventListener('click', () => {
    if (currentColoring) printColoring(currentColoring);
  });
  document.getElementById('modalDownload')?.addEventListener('click', () => {
    if (currentColoring) downloadColoring(currentColoring);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });
}

function openModal(id) {
  const item = COLORINGS.find(c => c.id === id);
  if (!item) return;
  currentColoring = item;

  const ld      = item[currentLang] || item.nl;
  const cat     = CATEGORIES[item.category];
  const catLabel= cat ? (cat[currentLang]?.label || cat.nl.label) : item.category;
  const imgSrc  = resolveImgPath(item.img) || `data:image/svg+xml,${encodeURIComponent(placeholderSVG(ld.title))}`;
  const altText = ld.altText || `${t('free_coloring_page')} ${ld.title}`;

  const modalTitle = document.getElementById('modalTitle');
  const modalImg   = document.getElementById('modalImg');
  const modalMeta  = document.getElementById('modalMeta');

  if (modalTitle) modalTitle.textContent = ld.title;
  if (modalImg) {
    modalImg.src   = imgSrc;
    modalImg.alt   = altText;
    modalImg.title = ld.title + ' – ' + t('free_coloring_page');
  }
  if (modalMeta) {
    const keywords = (ld.keywords || '').split(' ').filter(Boolean).slice(0, 8);
    modalMeta.innerHTML = `
      <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.6rem;">
        <span aria-hidden="true">${cat?.icon || ''}</span>
        ${catLabel} &nbsp;·&nbsp;
        <span aria-label="${t('difficulty_' + item.difficulty)}">${t('difficulty_' + item.difficulty)}</span>
        &nbsp;·&nbsp;
        <span title="${t('license_note')}">${t('license_text')}</span>
      </div>
      ${ld.description ? `<p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.6rem;">${ld.description}</p>` : ''}
      <div class="modal-tags" aria-label="${t('keywords_label')}">
        ${keywords.map(kw => `<span class="tag">${kw}</span>`).join('')}
      </div>`;
  }

  const overlay = document.getElementById('modalOverlay');
  overlay?.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => modalTitle?.focus(), 100);

  history.pushState({ modal: item.slug }, '', '/kleurplaat/' + item.slug);

  injectSingleImageSchema(item);
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  overlay?.classList.remove('open');
  document.body.style.overflow = '';
  currentColoring = null;
  if (window.location.pathname.startsWith('/kleurplaat/')) {
    history.pushState({}, '', '/');
  } else {
    history.back();
  }
}

// -------------------------------------------------------
// SINGLE IMAGE SCHEMA (open modal)
// -------------------------------------------------------
function injectSingleImageSchema(item) {
  const existing = document.getElementById('singleImageSchema');
  if (existing) existing.remove();

  const ld     = item[currentLang] || item.nl;
  const imgUrl = `https://kidslovecolor.com/${item.img.replace(/^\.\.\//,'').replace(/^svg\//,'svg/')}`;
  const freeLabel = {
    nl: 'Gratis Kleurplaat', en: 'Free Coloring Page',
    fr: 'Page à Colorier Gratuite', es: 'Página para Colorear Gratis', zh: '免费涂色页',
  };

  const schema = {
    '@context': 'https://schema.org',
    '@type':    'ImageObject',
    '@id':      `https://kidslovecolor.com/kleurplaat/${item.slug}`,
    'name':     `${ld.title} – ${freeLabel[currentLang] || freeLabel.nl}`,
    'description': ld.description || '',
    'contentUrl':  imgUrl,
    'encodingFormat': item.img.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
    'license':    'https://creativecommons.org/publicdomain/zero/1.0/',
    'keywords':   ld.keywords || '',
    'isPartOf': { '@id': BASE_URL + '#webpage' }
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id   = 'singleImageSchema';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

// -------------------------------------------------------
// PRINT
// -------------------------------------------------------
function printColoring(item) {
  const ld      = item[currentLang] || item.nl;
  const imgSrc  = resolveImgPath(item.img) || '';
  const printWin = window.open('', '_blank', 'width=800,height=900');
  if (!printWin) { alert(t('popup_alert')); return; }

  const absImgSrc = imgSrc.startsWith('http')
    ? imgSrc
    : window.location.origin + '/' + imgSrc.replace(/^\.\.\//,'');

  printWin.document.write(`<!DOCTYPE html>
<html lang="${currentLang}">
<head>
  <meta charset="UTF-8"/>
  <title>${ld.title} – KidsLoveColor.com</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:210mm; height:297mm; overflow:hidden; background:white; }
    body { display:flex; align-items:center; justify-content:center; }
    .print-img { width:200mm; height:283mm; object-fit:contain; display:block; }
    @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
  </style>
</head>
<body>
    <img class="print-img" src="${absImgSrc}" alt="${ld.altText || ld.title}"/>
  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  <\/script>
</body>
</html>`);
  printWin.document.close();
}

// -------------------------------------------------------
// DOWNLOAD
// -------------------------------------------------------
function downloadColoring(item) {
  if (!item.img) { alert(t('no_img_alert')); return; }
  const ld   = item[currentLang] || item.nl;
  const link = document.createElement('a');
  link.href     = resolveImgPath(item.img);
  link.download = item.slug + (item.img.endsWith('.svg') ? '.svg' : '.jpg');
  link.setAttribute('aria-label', `${ld.altText || ld.title} – download`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// -------------------------------------------------------
// SCROLL TO TOP
// -------------------------------------------------------
function setupScrollTop() {
  const btn = document.getElementById('scrollTop');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// -------------------------------------------------------
// MOBILE SEARCH TOGGLE
// -------------------------------------------------------
function setupMobileSearch() {
  const btn       = document.getElementById('mobileSearchBtn');
  const searchDiv = document.querySelector('.header-search');
  const headerTop = document.querySelector('.header-top');
  if (!btn || !searchDiv) return;

  btn.addEventListener('click', () => {
    const isOpen = searchDiv.classList.toggle('mobile-open');
    headerTop?.classList.toggle('search-expanded', isOpen);
    btn.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) document.getElementById('searchInput')?.focus();
  });

  // Close mobile search when Escape is pressed
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchDiv.classList.contains('mobile-open')) {
      searchDiv.classList.remove('mobile-open');
      headerTop?.classList.remove('search-expanded');
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }
  });
}

// -------------------------------------------------------
// HIDE EMPTY AD BANNERS
// -------------------------------------------------------
function hideEmptyAdBanners() {
  document.querySelectorAll('.ad-banner').forEach(banner => {
    if (!banner.querySelector('ins.adsbygoogle')) {
      const wrapper = banner.closest('[role="complementary"]') || banner.parentElement;
      if (wrapper) wrapper.style.display = 'none';
    }
  });
}

// -------------------------------------------------------
// LANGUAGE SWITCHER UI
// -------------------------------------------------------
function updateLangUI() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    const btnLang = btn.dataset.lang || btn.getAttribute('hreflang');
    btn.classList.toggle('active', btnLang === currentLang);
    btn.setAttribute('aria-current', btnLang === currentLang ? 'true' : 'false');
  });
}
