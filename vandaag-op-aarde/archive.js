(() => {
  const globe = document.querySelector('[data-world-globe]');
  if (globe) {
    const views = [
      'earth-north-america.webp',
      'earth-americas.webp',
      'earth-europe-africa.webp',
      'earth-africa.webp',
      'earth-asia.webp',
    ];
    const randomIndex = Math.floor(Math.random() * views.length);
    globe.addEventListener('load', () => globe.classList.add('is-ready'), { once: true });
    globe.src = `/img/vandaag-op-aarde/globes/${views[randomIndex]}`;
  }

  const archive = document.getElementById('editionArchive');
  if (!archive || typeof WORLD_STORY_EDITIONS === 'undefined') return;

  const lang = ['nl', 'en', 'fr', 'es', 'zh'].includes(document.documentElement.lang)
    ? document.documentElement.lang
    : 'nl';
  const archiveUi = typeof WORLD_ARCHIVE_UI !== 'undefined' ? WORLD_ARCHIVE_UI : null;
  if (!archiveUi) return;
  const ui = archiveUi[lang] || archiveUi.nl;
  const colorThemes = ['coral', 'blue', 'lilac', 'yellow', 'mint'];
  const storyMetaTranslations = {
    en: {
      'cusco-clean-heritage-festival': ['Cusco, Peru', '7 September 2026', 'Culture & sustainability'],
      'southern-right-whale-mother-calf-new-zealand': ['Northland, New Zealand', '10 September 2026', 'Ocean & animals'],
      'white-tailed-eagle-chicks-loch-sunart': ['Loch Sunart, Scotland', '9 September 2026', 'Nature & conservation'],
      'ishasha-tree-climbing-lion-rangers': ['Ishasha, Uganda', '8 September 2026', 'Animals & cooperation'],
    },
    fr: {
      'cusco-clean-heritage-festival': ['Cusco, Pérou', '7 septembre 2026', 'Culture et durabilité'],
      'southern-right-whale-mother-calf-new-zealand': ['Northland, Nouvelle-Zélande', '10 septembre 2026', 'Océan et animaux'],
      'white-tailed-eagle-chicks-loch-sunart': ['Loch Sunart, Écosse', '9 septembre 2026', 'Nature et protection'],
      'ishasha-tree-climbing-lion-rangers': ['Ishasha, Ouganda', '8 septembre 2026', 'Animaux et coopération'],
    },
    es: {
      'cusco-clean-heritage-festival': ['Cusco, Perú', '7 de septiembre de 2026', 'Cultura y sostenibilidad'],
      'southern-right-whale-mother-calf-new-zealand': ['Northland, Nueva Zelanda', '10 de septiembre de 2026', 'Océano y animales'],
      'white-tailed-eagle-chicks-loch-sunart': ['Loch Sunart, Escocia', '9 de septiembre de 2026', 'Naturaleza y protección'],
      'ishasha-tree-climbing-lion-rangers': ['Ishasha, Uganda', '8 de septiembre de 2026', 'Animales y cooperación'],
    },
    zh: {
      'cusco-clean-heritage-festival': ['秘鲁库斯科', '2026年9月7日', '文化与可持续发展'],
      'southern-right-whale-mother-calf-new-zealand': ['新西兰北地', '2026年9月10日', '海洋与动物'],
      'white-tailed-eagle-chicks-loch-sunart': ['苏格兰苏纳特湖', '2026年9月9日', '自然与保护'],
      'ishasha-tree-climbing-lion-rangers': ['乌干达伊沙沙', '2026年9月8日', '动物与合作'],
    },
  };

  const storyCount = WORLD_STORY_EDITIONS.reduce(
    (total, edition) => total + (Array.isArray(edition.stories) ? edition.stories.length : 0),
    0,
  );
  const storyCountElement = document.querySelector('[data-story-count]');
  if (storyCountElement) {
    storyCountElement.textContent = ui.totalStories(storyCount);
  }

  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const formatDate = (value) => {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return ui.previousDate;
    return new Intl.DateTimeFormat(ui.locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const localizeStory = (story) => {
    if (lang === 'nl') return story;
    const storedTranslation = typeof WORLD_STORY_TRANSLATIONS === 'undefined'
      ? null
      : WORLD_STORY_TRANSLATIONS[lang]?.[story.slug];
    if (storedTranslation) return { ...story, ...storedTranslation };

    const coloring = typeof COLORINGS === 'undefined'
      ? null
      : COLORINGS.find((item) => item.slug === story.coloringSlug);
    const coloringText = coloring?.[lang];
    if (!coloringText) return story;
    const translatedMeta = storyMetaTranslations[lang]?.[story.coloringSlug] || [];
    return {
      ...story,
      title: coloringText.title || story.title,
      location: coloringText.newsLocation || translatedMeta[0] || story.location,
      reportedDate: coloringText.newsReportedDate || translatedMeta[1] || story.reportedDate,
      theme: coloringText.newsTheme || translatedMeta[2] || story.theme,
      intro: coloringText.newsExplainer || story.intro,
      body: coloringText.newsArticle || story.body,
      facts: coloringText.newsFacts || story.facts,
      question: coloringText.newsQuestion || story.question,
    };
  };

  const findColoring = (slug) => {
    if (!slug || typeof COLORINGS === 'undefined') return null;
    return COLORINGS.find((item) => item.slug === slug) || null;
  };

  const imageUrl = (value) => '/' + String(value || '')
    .replace(/^\.\.\//, '')
    .replace(/^\/+/, '');

  const coloringUrl = (slug) => lang === 'nl'
    ? `/kleurplaat/${encodeURIComponent(slug)}`
    : `/${lang}/?kleurplaat=${encodeURIComponent(slug)}`;

  const renderVisual = (story, number, theme) => {
    const coloring = findColoring(story.coloringSlug);
    if (!coloring) {
      return `
        <div class="archive-story-image archive-story-placeholder" aria-label="${escapeHtml(ui.coloringPendingAria)}">
          <span class="archive-story-number">${number}</span>
          <span class="archive-story-icon" aria-hidden="true">${escapeHtml(story.icon || '✦')}</span>
          <span class="archive-story-image-label">${escapeHtml(ui.coloringPending)}</span>
        </div>
      `;
    }

    const coloringText = coloring[lang] || coloring.nl || {};
    const title = story.title || coloringText.title || ui.coloringFallback;
    const image = imageUrl(coloring.img);
    const pageUrl = coloringUrl(coloring.slug);

    return `
      <a class="archive-story-image archive-story-${theme}" href="${pageUrl}" aria-label="${escapeHtml(ui.matchingColoringAria)} ${escapeHtml(title)}">
        <span class="archive-story-number">${number}</span>
        <img src="${escapeHtml(image)}" alt="${escapeHtml(coloringText.altText || title)}" loading="lazy"/>
        <span class="archive-story-image-label">${escapeHtml(ui.matchingColoring)}</span>
      </a>
    `;
  };

  if (!WORLD_STORY_EDITIONS.length) {
    archive.innerHTML = `<p class="earth-empty">${escapeHtml(ui.empty)}</p>`;
    return;
  }

  archive.innerHTML = WORLD_STORY_EDITIONS.map((edition, editionIndex) => {
    const label = editionIndex === 0 ? ui.latestEdition : ui.archivedEdition;
    const stories = (edition.stories || []).map((sourceStory, storyIndex) => {
      const story = localizeStory(sourceStory);
      const theme = colorThemes[storyIndex % colorThemes.length];
      const number = String(storyIndex + 1).padStart(2, '0');
      const coloring = findColoring(story.coloringSlug);
      const pageUrl = coloring ? coloringUrl(coloring.slug) : '';
      const image = coloring ? imageUrl(coloring.img) : '';

      return `
        <article class="archive-story archive-story-${theme}" id="${escapeHtml(story.slug)}">
          ${renderVisual(story, number, theme)}
          <div class="archive-story-copy">
            <div class="earth-meta">
              <span>${escapeHtml(story.location)}</span>
              <span>${escapeHtml(story.reportedDate)}</span>
              <span>${escapeHtml(story.theme)}</span>
            </div>
            <h3>${escapeHtml(story.title)}</h3>
            <p class="earth-lead">${escapeHtml(story.intro)}</p>
            <p>${escapeHtml(story.body)}</p>
            <div class="earth-facts">
              <h4>${escapeHtml(ui.factsTitle)}</h4>
              <ul>${(story.facts || []).map((fact) => `<li>${escapeHtml(fact)}</li>`).join('')}</ul>
            </div>
            <p class="earth-question"><span>${escapeHtml(ui.questionLabel)}</span>${escapeHtml(story.question)}</p>
            <div class="earth-links">
              ${coloring ? `<a class="earth-color-button" href="${pageUrl}">${escapeHtml(ui.openColoring)} <span aria-hidden="true">→</span></a>` : ''}
              ${coloring ? `<a href="${escapeHtml(image)}" download>${escapeHtml(ui.downloadColoring)} ↓</a>` : ''}
              <a href="${escapeHtml(story.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(ui.source)}: ${escapeHtml(story.sourceLabel)} ↗</a>
              <a href="${escapeHtml(story.referenceUrl)}" target="_blank" rel="noopener">${escapeHtml(ui.reference)} ↗</a>
            </div>
          </div>
        </article>
      `;
    }).join('');

    return `
      <section class="earth-edition" aria-labelledby="edition-${escapeHtml(edition.published)}">
        <header class="earth-edition-heading">
          <p>${label}</p>
          <h3 id="edition-${escapeHtml(edition.published)}">${escapeHtml(formatDate(edition.published))}</h3>
          <span>${escapeHtml(ui.editionSummary(edition.stories.length))}</span>
        </header>
        ${stories}
      </section>
    `;
  }).join('');
})();
