import {
  fetchGenres,
  fetchTrendingMovies,
  discoverMovies,
  searchMovies,
  fetchMovieTrailer,
  fetchMovieCredits,
  fetchActorMovies,
} from './api/tmdb-api.js';
import { renderPlayer } from './js/render-player.js';
import { renderSidebarList } from './js/render-sidebar.js';
import {
  showError,
  showInfo,
  getBackdropUrl,
  getReleaseYear,
} from './js/helpers.js';

const refs = {
  searchForm: document.getElementById('search-form'),
  filtersBar: document.getElementById('filters-bar'),
  genreDropdown: document.getElementById('genre-dropdown'),
  yearDropdown: document.getElementById('year-dropdown'),
  resetFiltersBtn: document.getElementById('reset-filters-btn'),
  playerContainer: document.getElementById('player-container'),
  sidebarTitle: document.getElementById('sidebar-title'),
  movieList: document.getElementById('movie-list'),
  loadMoreBtn: document.getElementById('load-more-btn'),
};

const state = {
  movies: [],
  actorMovies: [],
  activeMovie: null,
  activeTrailerKey: null,
  activeCast: [],
  playerMode: 'trailer',
  currentQuery: '',
  genres: [],
  years: [],
  countries: [],
  languages: [],
  currentPage: 1,
  totalPages: 1,
};

function populateYears() {
  const currentYear = new Date().getFullYear();
  let html = '';
  for (let y = currentYear; y >= 1980; y -= 1) {
    html += `
      <label class="filter-option">
        <input type="checkbox" value="${y}" data-text="${y}" />
        <span>${y}</span>
      </label>
    `;
  }
  refs.yearDropdown.innerHTML = html;
}

async function initFilters() {
  populateYears();
  try {
    const genres = await fetchGenres();
    const html = genres
      .map(g => {
        const title = g.name[0].toUpperCase() + g.name.slice(1);
        return `
          <label class="filter-option">
            <input type="checkbox" value="${g.id}" data-text="${title}" />
            <span>${title}</span>
          </label>
        `;
      })
      .join('');
    refs.genreDropdown.innerHTML = html;
  } catch (error) {
    console.error('Не вдалося завантажити жанри:', error);
  }
}

function closeAllDropdowns() {
  document
    .querySelectorAll('.multi-filter.is-open')
    .forEach(el => el.classList.remove('is-open'));
}

function updateFilterButtonLabel(filterEl) {
  const labelEl = filterEl.querySelector('.filter-btn-label');
  const toggleBtn = filterEl.querySelector('.filter-toggle-btn');
  const defaultText = labelEl.dataset.default;
  const checked = Array.from(
    filterEl.querySelectorAll('input[type="checkbox"]:checked')
  );

  if (checked.length === 0) {
    labelEl.textContent = defaultText;
    toggleBtn.classList.remove('has-selection');
  } else if (checked.length === 1) {
    labelEl.textContent = checked[0].dataset.text;
    toggleBtn.classList.add('has-selection');
  } else {
    labelEl.textContent = `${checked[0].dataset.text} +${checked.length - 1}`;
    toggleBtn.classList.add('has-selection');
  }
}

function syncFiltersFromDOM() {
  const getCheckedValues = filterName =>
    Array.from(
      refs.filtersBar.querySelectorAll(
        `.multi-filter[data-filter="${filterName}"] input[type="checkbox"]:checked`
      )
    ).map(cb => cb.value);

  state.genres = getCheckedValues('genre');
  state.years = getCheckedValues('year');
  state.countries = getCheckedValues('country');
  state.languages = getCheckedValues('language');
}

async function selectMovie(movie) {
  state.activeMovie = movie;
  state.playerMode = 'trailer';
  state.activeCast = [];

  renderSidebarList(refs.movieList, state.movies, movie.id, false);

  try {
    const [trailerKey, cast] = await Promise.all([
      fetchMovieTrailer(movie.id),
      fetchMovieCredits(movie.id).catch(() => []),
    ]);

    state.activeTrailerKey = trailerKey;
    state.activeCast = cast;

    renderPlayer(
      refs.playerContainer,
      movie,
      state.activeTrailerKey,
      state.playerMode,
      state.activeCast
    );
  } catch (error) {
    showError('Не вдалося завантажити відео для цього фільму.');
    renderPlayer(refs.playerContainer, movie, null, state.playerMode, []);
  }
}

function closeActorModal() {
  const existing = document.getElementById('actor-movies-modal');
  if (existing) {
    existing.remove();
    document.body.style.overflow = '';
  }
}

async function openActorModal(actorId, actorName) {
  closeActorModal();

  const modal = document.createElement('div');
  modal.id = 'actor-movies-modal';
  modal.className = 'actor-modal-backdrop';
  modal.innerHTML = `
    <div class="actor-modal-window" role="dialog" aria-modal="true">
      <div class="actor-modal-header">
        <h2 class="actor-modal-title">Фільмографія: ${actorName}</h2>
        <button type="button" class="actor-modal-close" aria-label="Закрити">&times;</button>
      </div>
      <div class="actor-modal-body" id="actor-modal-body">
        <div class="actor-modal-loading">Завантаження фільмів...</div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.closest('.actor-modal-close')) {
      closeActorModal();
      return;
    }

    const movieCard = e.target.closest('.actor-movie-item');
    if (movieCard) {
      const movieId = Number(movieCard.dataset.movieId);
      const chosen = state.actorMovies.find(m => m.id === movieId);
      if (chosen) {
        closeActorModal();
        if (!state.movies.some(m => m.id === chosen.id)) {
          state.movies = [chosen, ...state.movies];
        }
        selectMovie(chosen);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  });

  try {
    const movies = await fetchActorMovies(actorId);
    state.actorMovies = movies;
    const bodyEl = document.getElementById('actor-modal-body');
    if (!bodyEl) return;

    if (!movies || movies.length === 0) {
      bodyEl.innerHTML =
        '<div class="actor-modal-loading">Фільми за участю цього актора не знайдені.</div>';
      return;
    }

    bodyEl.innerHTML = `
      <ul class="actor-movies-grid">
        ${movies
          .map(m => {
            const thumb = getBackdropUrl(m.poster_path || m.backdrop_path);
            const year = getReleaseYear(m.release_date);
            const rating = m.vote_average ? m.vote_average.toFixed(1) : '—';
            const role = m.character ? `Роль: ${m.character}` : '';

            return `
              <li class="actor-movie-item" data-movie-id="${m.id}">
                <img src="${thumb}" alt="${m.title}" class="actor-movie-poster" loading="lazy" />
                <div class="actor-movie-info">
                  <h4 class="actor-movie-title">${m.title}</h4>
                  <p class="actor-movie-meta">★ ${rating} • ${year}</p>
                  ${role ? `<p class="actor-movie-role">${role}</p>` : ''}
                </div>
              </li>
            `;
          })
          .join('')}
      </ul>
    `;
  } catch (error) {
    const bodyEl = document.getElementById('actor-modal-body');
    if (bodyEl) {
      bodyEl.innerHTML =
        '<div class="actor-modal-loading">Помилка завантаження фільмографії.</div>';
    }
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeActorModal();
    closeAllDropdowns();
  }
});

function getSelectedTexts(filterName) {
  return Array.from(
    refs.filtersBar.querySelectorAll(
      `.multi-filter[data-filter="${filterName}"] input[type="checkbox"]:checked`
    )
  ).map(cb => cb.dataset.text);
}

function updateSidebarHeading() {
  if (state.currentQuery) {
    refs.sidebarTitle.textContent = `Результати: «${state.currentQuery}»`;
    return;
  }

  const parts = [
    ...getSelectedTexts('country'),
    ...getSelectedTexts('genre'),
    ...getSelectedTexts('year').map(y => `${y} р.`),
    ...getSelectedTexts('language'),
  ];

  refs.sidebarTitle.textContent =
    parts.length > 0 ? parts.join(' • ') : 'Популярні фільми';
}

async function loadMovies(page = 1, append = false) {
  try {
    let data;
    const hasFilters = Boolean(
      state.genres.length ||
      state.years.length ||
      state.countries.length ||
      state.languages.length
    );

    if (state.currentQuery) {
      data = await searchMovies(state.currentQuery, page, state.years);
      if (state.genres.length > 0) {
        const genreNums = state.genres.map(Number);
        data.results = data.results.filter(m =>
          genreNums.every(gId => m.genre_ids?.includes(gId))
        );
      }
      if (state.years.length > 1) {
        data.results = data.results.filter(
          m =>
            m.release_date && state.years.includes(m.release_date.slice(0, 4))
        );
      }
      if (state.countries.length > 0) {
        data.results = data.results.filter(m =>
          m.origin_country?.some(c => state.countries.includes(c))
        );
      }
      if (state.languages.length > 0) {
        data.results = data.results.filter(m =>
          state.languages.includes(m.original_language)
        );
      }
    } else if (hasFilters) {
      data = await discoverMovies({
        genres: state.genres,
        years: state.years,
        countries: state.countries,
        languages: state.languages,
        page,
      });
    } else {
      data = await fetchTrendingMovies(page);
    }

    updateSidebarHeading();

    if (!data.results || data.results.length === 0) {
      showInfo('За обраними параметрами фільмів не знайдено.');
      if (!append) {
        refs.movieList.innerHTML = '';
        refs.loadMoreBtn.classList.add('is-hidden');
      }
      return;
    }

    state.currentPage = data.page;
    state.totalPages = data.total_pages;
    state.movies = append ? [...state.movies, ...data.results] : data.results;

    if (!append) {
      await selectMovie(state.movies[0]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      renderSidebarList(
        refs.movieList,
        data.results,
        state.activeMovie?.id,
        true
      );
    }

    if (state.currentPage < state.totalPages) {
      refs.loadMoreBtn.classList.remove('is-hidden');
    } else {
      refs.loadMoreBtn.classList.add('is-hidden');
    }
  } catch (error) {
    showError('Помилка з’єднання з TMDB API.');
  }
}

// Відкриття/закриття випадаючих фільтрів
refs.filtersBar.addEventListener('click', e => {
  const toggleBtn = e.target.closest('.filter-toggle-btn');
  if (!toggleBtn) return;

  const parentFilter = toggleBtn.closest('.multi-filter');
  const wasOpen = parentFilter.classList.contains('is-open');
  closeAllDropdowns();
  if (!wasOpen) {
    parentFilter.classList.add('is-open');
  }
});

// Закриття меню при кліку поза фільтрами
document.addEventListener('click', e => {
  if (!e.target.closest('.multi-filter')) {
    closeAllDropdowns();
  }
});

// Зміна чекбоксів у фільтрах
refs.filtersBar.addEventListener('change', e => {
  if (e.target.type !== 'checkbox') return;

  const filterEl = e.target.closest('.multi-filter');
  if (filterEl) {
    updateFilterButtonLabel(filterEl);
  }
  syncFiltersFromDOM();
  loadMovies(1, false);
});

// Пошук за назвою
refs.searchForm.addEventListener('submit', e => {
  e.preventDefault();
  const query = e.currentTarget.elements.searchQuery.value.trim();

  if (!query) {
    showInfo('Введіть назву фільму або скористайтеся фільтрами нижче.');
    return;
  }

  state.currentQuery = query;
  loadMovies(1, false);
});

// Скидання всіх фільтрів і пошуку
refs.resetFiltersBtn.addEventListener('click', () => {
  state.currentQuery = '';
  state.genres = [];
  state.years = [];
  state.countries = [];
  state.languages = [];

  refs.searchForm.reset();
  refs.filtersBar
    .querySelectorAll('input[type="checkbox"]:checked')
    .forEach(cb => {
      cb.checked = false;
    });
  refs.filtersBar
    .querySelectorAll('.multi-filter')
    .forEach(updateFilterButtonLabel);

  closeAllDropdowns();
  loadMovies(1, false);
});

// Клік по картці фільму
refs.movieList.addEventListener('click', e => {
  const card = e.target.closest('.movie-card');
  if (!card) return;

  const movieId = Number(card.dataset.id);
  const chosenMovie = state.movies.find(m => m.id === movieId);

  if (chosenMovie && chosenMovie.id !== state.activeMovie?.id) {
    selectMovie(chosenMovie);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

// Перемикання режимів плеєра та клік по актору
refs.playerContainer.addEventListener('click', e => {
  const actorCard = e.target.closest('.cast-card');
  if (actorCard) {
    const actorId = Number(actorCard.dataset.actorId);
    const actorName = actorCard.dataset.actorName;
    if (actorId) {
      openActorModal(actorId, actorName);
    }
    return;
  }

  const modeBtn = e.target.closest('.mode-btn');
  if (!modeBtn) return;

  const newMode = modeBtn.dataset.mode;
  if (newMode !== state.playerMode) {
    state.playerMode = newMode;
    renderPlayer(
      refs.playerContainer,
      state.activeMovie,
      state.activeTrailerKey,
      state.playerMode,
      state.activeCast
    );
  }
});

// Завантажити ще
refs.loadMoreBtn.addEventListener('click', () => {
  loadMovies(state.currentPage + 1, true);
});

// Старт застосунку
initFilters();
loadMovies(1, false);
