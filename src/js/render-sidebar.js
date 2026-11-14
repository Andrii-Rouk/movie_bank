import { getBackdropUrl, getReleaseYear } from './helpers.js';

export function renderSidebarList(
  listElement,
  movies,
  activeMovieId,
  append = false
) {
  const markup = movies
    .map(movie => {
      const thumbUrl = getBackdropUrl(movie.backdrop_path || movie.poster_path);
      const year = getReleaseYear(movie.release_date);
      const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '—';
      const isActive = movie.id === activeMovieId ? 'active' : '';

      return `
        <li class="movie-card ${isActive}" data-id="${movie.id}">
          <img
            src="${thumbUrl}"
            alt="${movie.title}"
            class="movie-card-thumb"
            loading="lazy"
          />
          <div class="movie-card-info">
            <h3 class="movie-card-title">${movie.title}</h3>
            <p class="movie-card-meta">★ ${rating} • ${year}</p>
          </div>
        </li>
      `;
    })
    .join('');

  if (append) {
    listElement.insertAdjacentHTML('beforeend', markup);
  } else {
    listElement.innerHTML = markup;
  }
}
