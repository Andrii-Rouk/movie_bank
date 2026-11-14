import iziToast from 'izitoast';
import 'izitoast/dist/css/iziToast.min.css';

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export function getBackdropUrl(path) {
  return path
    ? `${IMAGE_BASE_URL}/w500${path}`
    : 'https://placehold.co/320x180/1e1e1e/aaaaaa?text=No+Preview';
}

export function getActorPhotoUrl(path) {
  return path
    ? `${IMAGE_BASE_URL}/w185${path}`
    : 'https://placehold.co/185x278/272727/aaaaaa?text=No+Photo';
}

export function getReleaseYear(releaseDate) {
  return releaseDate ? releaseDate.slice(0, 4) : 'Н/Д';
}

export function showError(message) {
  iziToast.error({
    title: 'Помилка',
    message,
    position: 'topRight',
    timeout: 3500,
  });
}

export function showInfo(message) {
  iziToast.info({
    title: 'Інфо',
    message,
    position: 'topRight',
    timeout: 3000,
  });
}
