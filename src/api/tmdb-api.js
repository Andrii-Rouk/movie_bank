import axios from 'axios';

const API_KEY = '7043a9efd9139b2ed54e2a9ee0304ddc';
const BASE_URL = 'https://api.themoviedb.org/3';

const tmdbClient = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
    language: 'uk-UA',
  },
});

export async function fetchGenres() {
  const { data } = await tmdbClient.get('/genre/movie/list');
  return data.genres || [];
}

export async function fetchTrendingMovies(page = 1) {
  const { data } = await tmdbClient.get('/trending/movie/week', {
    params: { page },
  });
  return data;
}

export async function discoverMovies({
  genre = '',
  year = '',
  country = '',
  language = '',
  page = 1,
}) {
  const params = {
    page,
    sort_by: 'popularity.desc',
    include_adult: false,
  };

  if (genre) params.with_genres = genre;
  if (year) params.primary_release_year = year;
  if (country) params.with_origin_country = country;
  if (language) params.with_original_language = language;

  const { data } = await tmdbClient.get('/discover/movie', { params });
  return data;
}

export async function searchMovies(query, page = 1, year = '') {
  const params = {
    query,
    page,
    include_adult: false,
  };

  if (year) params.primary_release_year = year;

  const { data } = await tmdbClient.get('/search/movie', { params });
  return data;
}

export async function fetchMovieTrailer(movieId) {
  let { data } = await tmdbClient.get(`/movie/${movieId}/videos`);
  let videos = data.results || [];

  if (videos.length === 0) {
    const fallbackRes = await tmdbClient.get(`/movie/${movieId}/videos`, {
      params: { language: 'en-US' },
    });
    videos = fallbackRes.data.results || [];
  }

  const trailer =
    videos.find(v => v.site === 'YouTube' && v.type === 'Trailer') ||
    videos.find(v => v.site === 'YouTube');

  return trailer ? trailer.key : null;
}

export async function fetchMovieCredits(movieId) {
  const { data } = await tmdbClient.get(`/movie/${movieId}/credits`);
  return data.cast ? data.cast.slice(0, 8) : [];
}
