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
  genres = [],
  years = [],
  countries = [],
  languages = [],
  page = 1,
}) {
  const params = {
    page,
    sort_by: 'popularity.desc',
    include_adult: false,
  };

  if (genres.length > 0) {
    params.with_genres = genres.join(',');
  }

  if (years.length === 1) {
    params.primary_release_year = years[0];
  } else if (years.length > 1) {
    const sortedYears = [...years].map(Number).sort((a, b) => a - b);
    params['primary_release_date.gte'] = `${sortedYears[0]}-01-01`;
    params['primary_release_date.lte'] =
      `${sortedYears[sortedYears.length - 1]}-12-31`;
  }

  if (countries.length > 0) {
    params.with_origin_country = countries.join('|');
  }

  if (languages.length > 0) {
    params.with_original_language = languages.join('|');
  }

  const { data } = await tmdbClient.get('/discover/movie', { params });

  if (years.length > 1 && Array.isArray(data.results)) {
    data.results = data.results.filter(
      m => m.release_date && years.includes(m.release_date.slice(0, 4))
    );
  }

  return data;
}

export async function searchMovies(query, page = 1, years = []) {
  const params = {
    query,
    page,
    include_adult: false,
  };

  if (years.length === 1) {
    params.primary_release_year = years[0];
  }

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
  return data.cast ? data.cast.slice(0, 5) : [];
}

export async function fetchActorMovies(actorId) {
  const { data } = await tmdbClient.get(`/person/${actorId}/movie_credits`);
  const castMovies = data.cast || [];

  const uniqueMap = new Map();
  castMovies.forEach(movie => {
    if (!uniqueMap.has(movie.id)) {
      uniqueMap.set(movie.id, movie);
    }
  });

  return Array.from(uniqueMap.values()).sort(
    (a, b) => (b.popularity || 0) - (a.popularity || 0)
  );
}
