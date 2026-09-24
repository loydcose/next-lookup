export function readIdList(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeIdList(key, ids) {
  window.localStorage.setItem(key, JSON.stringify([...ids]));
}
