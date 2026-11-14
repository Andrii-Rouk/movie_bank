import {
  fetchGenres,
  fetchTrendingMovies,
  discoverMovies,
  searchMovies,
  fetchMovieTrailer,
} from './api/tmdb-api.js';
import { renderPlayer } from './js/render-player.js';
import { renderSidebarList } from './js/render-sidebar.js';
import { showError, showInfo } from './js/helpers.js';

const TMDB_API_KEY = '41051303f327246273452580f561c1a9';

async function fetchMovieCredits(movieId) {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}&language=uk-UA`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.cast ? data.cast.slice(0, 8) : [];
}

const refs = {
  searchForm: document.getElementById('search-form'),
  genreSelect: document.getElementById('genre-select'),
  yearSelect: document.getElementById('year-select'),
  countrySelect: document.getElementById('country-select'),
  langSelect: document.getElementById('lang-select'),
  resetFiltersBtn: document.getElementById('reset-filters-btn'),
  playerContainer: document.getElementById('player-container'),
  sidebarTitle: document.getElementById('sidebar-title'),
  movieList: document.getElementById('movie-list'),
  loadMoreBtn: document.getElementById('load-more-btn'),
};

const state = {
  movies: [],
  activeMovie: null,
  activeTrailerKey: null,
  activeCast: [],
  playerMode: 'trailer',
  currentQuery: '',
  genre: '',
  year: '',
  country: '',
  language: '',
  currentPage: 1,
  totalPages: 1,
};

function populateYears() {
  const currentYear = new Date().getFullYear();
  let options = '<option value="">Усі роки</option>';
  for (let y = currentYear; y >= 1980; y -= 1) {
    options += `<option value="${y}">${y}</option>`;
  }
  refs.yearSelect.innerHTML = options;
}

async function initFilters() {
  populateYears();
  try {
    const genres = await fetchGenres();
    const options = genres
      .map(
        g =>
          `<option value="${g.id}">${g.name[0].toUpperCase() + g.name.slice(1)}</option>`
      )
      .join('');
    refs.genreSelect.insertAdjacentHTML('beforeend', options);
  } catch (error) {
    console.error('Не вдалося завантажити жанри:', error);
  }
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

function updateSidebarHeading() {
  if (state.currentQuery) {
    refs.sidebarTitle.textContent = `Результати: «${state.currentQuery}»`;
    return;
  }

  const parts = [];
  if (state.country) {
    const countryText =
      refs.countrySelect.options[refs.countrySelect.selectedIndex]?.text;
    if (countryText) parts.push(countryText);
  }
  if (state.genre) {
    const genreText =
      refs.genreSelect.options[refs.genreSelect.selectedIndex]?.text;
    if (genreText) parts.push(genreText);
  }
  if (state.year) parts.push(`${state.year} р.`);
  if (state.language) {
    const langText =
      refs.langSelect.options[refs.langSelect.selectedIndex]?.text;
    if (langText) parts.push(langText);
  }

  refs.sidebarTitle.textContent =
    parts.length > 0 ? parts.join(' • ') : 'Популярні фільми';
}

async function loadMovies(page = 1, append = false) {
  try {
    let data;
    const hasFilters = Boolean(
      state.genre || state.year || state.country || state.language
    );

    if (state.currentQuery) {
      data = await searchMovies(state.currentQuery, page, state.year);
      if (state.genre) {
        data.results = data.results.filter(m =>
          m.genre_ids?.includes(Number(state.genre))
        );
      }
      if (state.country) {
        data.results = data.results.filter(m =>
          m.origin_country?.includes(state.country)
        );
      }
      if (state.language) {
        data.results = data.results.filter(
          m => m.original_language === state.language
        );
      }
    } else if (hasFilters) {
      data = await discoverMovies({
        genre: state.genre,
        year: state.year,
        country: state.country,
        language: state.language,
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

// Зміна фільтрів (Категорія, Рік, Країна, Мова)
[
  refs.genreSelect,
  refs.yearSelect,
  refs.countrySelect,
  refs.langSelect,
].forEach(select => {
  select.addEventListener('change', () => {
    state.genre = refs.genreSelect.value;
    state.year = refs.yearSelect.value;
    state.country = refs.countrySelect.value;
    state.language = refs.langSelect.value;
    loadMovies(1, false);
  });
});

// Скидання всіх фільтрів і пошуку
refs.resetFiltersBtn.addEventListener('click', () => {
  state.currentQuery = '';
  state.genre = '';
  state.year = '';
  state.country = '';
  state.language = '';

  refs.searchForm.reset();
  refs.genreSelect.value = '';
  refs.yearSelect.value = '';
  refs.countrySelect.value = '';
  refs.langSelect.value = '';

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

// Перемикання режимів плеєра
refs.playerContainer.addEventListener('click', e => {
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
