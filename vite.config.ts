import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * `base` controls the public path every asset URL is prefixed with.
 *
 *  - Vercel, Netlify, Cloudflare Pages and any root-domain host: leave it
 *    unset. The default '/' is correct.
 *  - GitHub Pages at `user.github.io/<repo>/`: the site is served from a
 *    subdirectory, so build with `VITE_BASE_PATH=/<repo>/ npm run build`
 *    or the assets 404.
 *
 * The trailing slash matters; '/repo' resolves siblings of `repo`, not
 * children of it.
 */
const base = process.env.VITE_BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        /* Split the heavy, rarely-changing dependencies out of the app
           chunk. Recharts and its d3 transitive deps are the bulk of the
           bundle; isolating them means an app-code deploy doesn't
           invalidate them in visitors' caches. */
        codeSplitting: {
          groups: [
            {
              name: 'charts',
              test: /[\\/]node_modules[\\/](recharts|d3-|internmap|delaunator|robust-predicates|victory-|decimal\.js)/,
            },
            {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|use-sync-external-store)[\\/]/,
            },
          ],
        },
      },
    },
  },
})
