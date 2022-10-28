export function removeFileNameHash(fileName: string): string {
  return fileName
    .replace(/\\/g, '/')
    .replace(/\/?(.*)(\.chunk)?(\.[0-9a-f]+)(\.js|\.css)/, `$1$4`);
}
