(() => {
  const archive = document.getElementById('editionArchive');
  if (!archive || typeof WORLD_STORY_EDITIONS === 'undefined') return;

  const colorThemes = ['coral', 'blue', 'lilac', 'yellow', 'mint'];

  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const formatDate = (value) => {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return 'Eerdere editie';
    return new Intl.DateTimeFormat('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const findColoring = (slug) => {
    if (!slug || typeof COLORINGS === 'undefined') return null;
    return COLORINGS.find((item) => item.slug === slug) || null;
  };

  const imageUrl = (value) => '/' + String(value || '')
    .replace(/^\.\.\//, '')
    .replace(/^\/+/, '');

  const renderVisual = (story, number, theme) => {
    const coloring = findColoring(story.coloringSlug);
    if (!coloring) {
      return `
        <div class="archive-story-image archive-story-placeholder" aria-label="De kleurplaat voor dit verhaal wordt nog gemaakt">
          <span class="archive-story-number">${number}</span>
          <span class="archive-story-icon" aria-hidden="true">${escapeHtml(story.icon || '✦')}</span>
          <span class="archive-story-image-label">Kleurplaat wordt gemaakt</span>
        </div>
      `;
    }

    const title = story.title || coloring.nl?.title || 'Kleurplaat';
    const image = imageUrl(coloring.img);
    const coloringUrl = `/kleurplaat/${encodeURIComponent(coloring.slug)}`;

    return `
      <a class="archive-story-image archive-story-${theme}" href="${coloringUrl}" aria-label="Bekijk een passende kleurplaat bij: ${escapeHtml(title)}">
        <span class="archive-story-number">${number}</span>
        <img src="${escapeHtml(image)}" alt="${escapeHtml(coloring.nl?.altText || title)}" loading="lazy"/>
        <span class="archive-story-image-label">Bijpassende kleurplaat</span>
      </a>
    `;
  };

  if (!WORLD_STORY_EDITIONS.length) {
    archive.innerHTML = '<p class="earth-empty">De eerste editie wordt nu gemaakt. Kom snel nog eens kijken!</p>';
    return;
  }

  archive.innerHTML = WORLD_STORY_EDITIONS.map((edition, editionIndex) => {
    const label = editionIndex === 0 ? 'Nieuwste editie' : 'Uit het archief';
    const stories = (edition.stories || []).map((story, storyIndex) => {
      const theme = colorThemes[storyIndex % colorThemes.length];
      const number = String(storyIndex + 1).padStart(2, '0');
      const coloring = findColoring(story.coloringSlug);
      const coloringUrl = coloring ? `/kleurplaat/${encodeURIComponent(coloring.slug)}` : '';
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
              <h4>Wist je dat?</h4>
              <ul>${(story.facts || []).map((fact) => `<li>${escapeHtml(fact)}</li>`).join('')}</ul>
            </div>
            <p class="earth-question"><span>Praatvraag</span>${escapeHtml(story.question)}</p>
            <div class="earth-links">
              ${coloring ? `<a class="earth-color-button" href="${coloringUrl}">Open de kleurplaat <span aria-hidden="true">→</span></a>` : ''}
              ${coloring ? `<a href="${escapeHtml(image)}" download>Download kleurplaat ↓</a>` : ''}
              <a href="${escapeHtml(story.sourceUrl)}" target="_blank" rel="noopener">Bron: ${escapeHtml(story.sourceLabel)} ↗</a>
              <a href="${escapeHtml(story.referenceUrl)}" target="_blank" rel="noopener">Referentiefoto ↗</a>
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
          <span>${edition.stories.length} wereldverhalen om te lezen en te kleuren</span>
        </header>
        ${stories}
      </section>
    `;
  }).join('');
})();
