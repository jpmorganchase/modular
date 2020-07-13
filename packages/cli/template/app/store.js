const prefix = 'DASHBOARD-DEMO';

export function get(id) {
  return JSON.parse(localStorage.getItem(`${prefix}:${id}`));
}

export function ids() {
  return JSON.parse(localStorage.getItem(`${prefix}:items`)) || [];
}

export function set(id, value) {
  localStorage.setItem(
    `${prefix}:items`,
    JSON.stringify([...new Set(ids()).add(id)]),
  );
  localStorage.setItem(`${prefix}:${id}`, JSON.stringify(value));
}

export function del(id) {
  localStorage.setItem(
    `${prefix}:items`,
    JSON.stringify(ids().filter((x) => x !== id)),
  );
  localStorage.removeItem(`${prefix}:${id}`);
}

export function clear() {
  const allIds = ids();
  allIds.forEach((id) => del(id));
  localStorage.removeItem(`${prefix}:items`);
}
