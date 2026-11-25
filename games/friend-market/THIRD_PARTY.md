# Research and third-party notices

Reviewed before building: the official Vite 6.4.6 vanilla starter (https://github.com/vitejs/vite/tree/v6.4.6/packages/create-vite/template-vanilla), the MIT historical trading simulator https://github.com/shiro-FFFFFF/stock-trading-game, and https://github.com/khandelwal-parth/chronos-trade. The latter two were references only: their real-market/data/React systems were unnecessary for a small fictional static economy, so none of their code/assets were copied.

Actual reuse: Vite 6.4.6 build tool; official vanilla HTML starter retained under vendor/upstream, create-vite license in public/licenses/create-vite.txt (templates CC0; tool MIT). This repo's Soup Vite config is retained under vendor/upstream and adapted for a relative configurable base. The Fold's existing seededRandom generator is reused verbatim in rules.mjs; original project MIT text retained in public/licenses/source-project.txt. No new runtime engine is needed for this DOM-based game. npm's Vite and bundled dependencies retain their package licenses.

Portraits: copies of the already requested server-kart/public/portraits assets, including CREDITS.md. Torin/Jonah/Grant images were captured from the requested Discord profile avatar regions; Mike is the requested server icon. No chats/account data are included. These requested third-party visual assets are EXCLUDED from the code's MIT license; no claim to underlying artwork/likeness rights. Replace them with assets you have permission to use when remixing. No Discord connection is made at runtime.

All remaining graphics, layout, text and game mechanics are original code. No AI API, third-party market prices, tracking, remote fonts or remote image requests.
