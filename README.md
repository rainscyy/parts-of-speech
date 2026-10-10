# Parts of Speech

Ten interactive studies by Raine: Wake, Encircle, Punch, and Wipe.

## Development

```sh
npm ci
npm run build:site
python3 -m http.server 8795 --directory _site
```

Visit http://localhost:8795. Each work has an isolated React preview; the gallery and assets use relative URLs for GitHub Pages.

## Publishing

Push to `main` to build and publish through GitHub Actions. In repository Settings → Pages, select GitHub Actions as the source.
