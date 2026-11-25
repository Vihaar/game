// Original line illustrations, shared by the physical book's controls and counters.
const ICONS = {
  vitality: "M12 20S3 14 3 8a5 5 0 019-3 5 5 0 019 3c0 6-9 12-9 12Z",
  ink: "M12 3C10 7 5 11 5 15a7 7 0 0014 0c0-4-5-8-7-12ZM8 15q0 4 4 4",
  guard: "M12 3 21 6v6c0 5-9 9-9 9s-9-4-9-9V6ZM8 11l3 3 5-6",
  strike: "m5 19 10-10m-9 4 5 5M13 9l2-5 6-1-1 6-5 2M3 21l3-1-2-2Z",
  forge: "M3 6h6v5H3Zm12 0h6v5h-6ZM6 11v4l6 5 6-5v-4M9 20h6",
  draw: "M5 4h11v14H5Zm4 17h11V8M8 8h5M8 12h5",
};
export function bookIcon(name) {
  return `<svg class="book-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[name] || ICONS.ink}"/></svg>`;
}
