const prefix = 'DASHBOARD-DEMO';

export function get<TReturnValue = unknown>(id: string): unknown | null {
  const value = localStorage.getItem(`${prefix}:${id}`);
  return value ? (JSON.parse(value) as TReturnValue) : null;
}

export function ids(): Array<string> {
  const values = localStorage.getItem(`${prefix}:items`);
  return values ? (JSON.parse(values) as Array<string>) : [];
}

export function set<TSetValue = unknown>(id: string, value: TSetValue): void {
  localStorage.setItem(
    `${prefix}:items`,
    JSON.stringify(Array.from(new Set(ids()).add(id))),
  );
  localStorage.setItem(`${prefix}:${id}`, JSON.stringify(value));
}

export function del(id: string): void {
  localStorage.setItem(
    `${prefix}:items`,
    JSON.stringify(ids().filter((x) => x !== id)),
  );
  localStorage.removeItem(`${prefix}:${id}`);
}

export function clear(): void {
  const allIds = ids();
  allIds.forEach((id) => del(id));
  localStorage.removeItem(`${prefix}:items`);
}
