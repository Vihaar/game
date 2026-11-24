/** User-requested avatar captures. Separate from the MIT-licensed code and engine art. */
const baseUrl = import.meta.env?.BASE_URL ?? './';
export const MIKE_PORTRAIT = baseUrl + 'portraits/mike.webp';
export const PORTRAITS: Record<string,string> = {
  torin: baseUrl + 'portraits/torin.png',
  jonah: baseUrl + 'portraits/jonah.png',
  grant: baseUrl + 'portraits/grant.png',
};
