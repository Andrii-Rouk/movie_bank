import { getReleaseYear } from './helpers.js';

const MOVIE_SOURCES = {
  src1: {
    label: '🍿 Плеєр 1 (Основний)',
    getUrl: id => `https://www.2embed.cc/embed/${id}`,
  },
  src2: {
    label: '🍿 Плеєр 2 (Резерв)',
    getUrl: id => `https://vidlink.pro/movie/${id}`,
  },
  src3: {
    label: '🍿 Плеєр 3 (Резерв 2)',
    getUrl: id => `https://autoembed.co/movie/tmdb/${id}`,
  },
};

export function renderPlayer(container, movie, trailerKey, mode = 'trailer') {
  if (!movie) {
    container.innerHTML =
      '<div class="player-placeholder">Фільм не обрано</div>';
    return;
  }

  const year = getReleaseYear(movie.release_date);
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '—';
  const overview =
    movie.overview || 'Опис для цього фільму українською мовою поки відсутній.';

  let iframeMarkup = '';

  if (mode === 'trailer') {
    if (trailerKey) {
      iframeMarkup = `
        <iframe
          src="https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0"
          title="${movie.title}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      `;
    } else {
      iframeMarkup = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#aaa;padding:20px;text-align:center;">
          Трейлер не знайдено. Оберіть один із плеєрів фільму нижче.
        </div>
      `;
    }
  } else {
    const activeSource = MOVIE_SOURCES[mode] || MOVIE_SOURCES.src1;
    iframeMarkup = `
      <iframe
        src="${activeSource.getUrl(movie.id)}"
        title="${movie.title}"
        allow="autoplay; fullscreen; picture-in-picture"
        referrerpolicy="origin"
        allowfullscreen
      ></iframe>
    `;
  }

  const sourceButtonsMarkup = Object.entries(MOVIE_SOURCES)
    .map(
      ([key, source]) => `
        <button
          type="button"
          class="mode-btn ${mode === key ? 'active' : ''}"
          data-mode="${key}"
        >
          ${source.label}
        </button>
      `
    )
    .join('');

  container.innerHTML = `
    <div class="video-wrapper">
      ${iframeMarkup}
    </div>

    <div class="player-controls-bar">
      <div class="mode-switcher">
        <button
          type="button"
          class="mode-btn ${mode === 'trailer' ? 'active' : ''}"
          data-mode="trailer"
        >
          🎬 Трейлер
        </button>
        ${sourceButtonsMarkup}
      </div>
    </div>

    <div class="movie-details">
      <h1 class="movie-title">${movie.title}</h1>
      <div class="movie-meta">
        <span class="movie-rating">★ ${rating}</span>
        <span>Рік: ${year}</span>
        <span>Оригінал: ${movie.original_title}</span>
      </div>
      <p class="movie-overview">${overview}</p>
    </div>
  `;
}
