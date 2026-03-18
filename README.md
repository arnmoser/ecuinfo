# ECU Info

ECU Info contains a legacy browser app and a native React workspace for module and mark management.

## Project Structure

- `web/`: Active React application (Vite + TypeScript)
- `src/`: Legacy JavaScript app and services
- `index.html` / `legacy-app.html`: Legacy entry points

## Setup

```bash
npm install
```

## Scripts

- `npm run dev`: Start React app in development mode
- `npm run typecheck`: Run TypeScript type checks
- `npm run lint`: Run ESLint for React TypeScript source
- `npm run build`: Build production assets
- `npm run test`: Run Jest (passes when no tests are present)
- `npm run format`: Format repository files with Prettier
- `npm run format:check`: Validate formatting without writing

## CI

GitHub Actions workflow is defined at `.github/workflows/ci.yml` and runs:

1. Typecheck
2. Lint
3. Build
4. Tests

## Notes

- React (`web/`) is the maintained path for new editor capabilities.
- Legacy `src/` remains available during migration.
