# Deploy Next.js Standalone to Azure App Service

## Architecture

```
GitHub push main
  -> GitHub Actions: npm ci + npm run build (standalone)
  -> postbuild: copy public/ + .next/static/ into .next/standalone/
  -> cp -a .next/standalone/ -> deploy/
  -> Override package.json start script: "node server.js"
  -> azure/webapps-deploy -> Azure App Service (Linux)
  -> Azure runs: npm start -> node server.js
```

## Key Configuration

### next.config.mjs

```js
output: 'standalone'   // Self-contained build, no external node_modules needed at runtime
images: { unoptimized: true }  // No Vercel image optimization
```

### package.json scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `build` | `next build` | Creates `.next/standalone/` with server.js + minimal node_modules |
| `postbuild` | `node scripts/copy-assets.js` | Copies `public/` and `.next/static/` into standalone folder |
| `start` | `node .next/standalone/server.js` | Local production start |
| `start:azure` | `node azure-startup.js` | Azure startup with health checks |

### scripts/copy-assets.js

Runs automatically after `npm run build`. Copies:
- `public/` -> `.next/standalone/public/`
- `.next/static/` -> `.next/standalone/.next/static/`

These are not included in standalone output by default and must be copied manually.

## GitHub Actions Workflow

File: `.github/workflows/main_vibeappfe.yml`

**Single-job design** (build + deploy in one runner). This avoids `upload-artifact` which drops hidden directories (`.next/`) by default.

Flow:
1. `npm ci` - Install dependencies
2. `npm run build` - Build standalone output + postbuild copies assets
3. `cp -a .next/standalone/. deploy/` - Copy all files (including hidden `.next/`) to deploy folder
4. Override `package.json` start script to `node server.js` (because standalone contents are deployed to wwwroot root, not nested under `.next/standalone/`)
5. `azure/webapps-deploy` - Deploy `deploy/` folder to Azure

### Why single-job instead of build + deploy jobs?

`actions/upload-artifact@v4` defaults to `include-hidden-files: false`. The `.next/` folder inside standalone starts with a dot and gets **silently dropped** during artifact transfer. This causes:

```
Error: Could not find a production build in the './.next' directory.
```

Single-job eliminates this problem entirely since no artifact transfer occurs.

## Azure App Service Configuration

### Required Application Settings

Set in **Azure Portal > App Service > Configuration > Application settings**:

| Setting | Value | Required |
|---------|-------|----------|
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` | Yes - Prevents Oryx from re-running npm install and interfering with deployed files |
| `WEBSITE_NODE_DEFAULT_VERSION` | `~22` | Yes - Node.js version |
| `NODE_ENV` | `production` | Yes |
| `NEXT_PUBLIC_API_URL` | `https://<backend>.azurewebsites.net/api/v1` | Yes - Backend API endpoint |

### Why SCM_DO_BUILD_DURING_DEPLOYMENT = false?

Azure's Oryx build system runs by default on deployment. It will:
- Run `npm install` again (unnecessary, standalone has its own node_modules)
- Potentially overwrite or remove deployed files
- Extract tar.gz based node_modules, replacing the standalone's minimal set

Since the app is fully built in GitHub Actions, Oryx must be disabled.

### GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `AZUREAPPSERVICE_PUBLISHPROFILE_...` | Azure publish profile for deployment authentication |

Download from: Azure Portal > App Service > Overview > Get publish profile

## How server.js Works on Azure

```
/home/site/wwwroot/          <- Azure wwwroot (deployed contents of .next/standalone/)
  ├── server.js              <- Next.js standalone server
  ├── package.json           <- start script: "node server.js"
  ├── node_modules/          <- Minimal dependencies (only what's needed at runtime)
  ├── .next/                 <- Build artifacts
  │   ├── BUILD_ID
  │   ├── server/            <- Compiled server pages
  │   ├── static/            <- Static assets (_next/static/*)
  │   ├── routes-manifest.json
  │   └── ...
  └── public/                <- Public assets (images, manifest.json, etc.)
```

`server.js` does:
1. `process.chdir(__dirname)` - Sets CWD to `/home/site/wwwroot/`
2. Reads `distDir: "./.next"` from embedded config
3. Looks for `.next/BUILD_ID` relative to CWD
4. Starts Next.js server on `PORT` (set by Azure via `WEBSITES_PORT`)

## Troubleshooting

### "Could not find a production build in the './.next' directory"

`.next/` folder is missing from deployed package. Check:
1. GitHub Actions log: "Prepare deployment package" step should show `.next/` contents and BUILD_ID
2. If using 2-job workflow with `upload-artifact`, add `include-hidden-files: true`
3. Verify `SCM_DO_BUILD_DURING_DEPLOYMENT=false` to prevent Oryx interference

### "Cannot find module '.next/standalone/server.js'"

The deployed `package.json` has wrong start script. The workflow must override it to `node server.js` (not `node .next/standalone/server.js`) because standalone contents are at wwwroot root.

### Oryx still running (logs show "Extracting modules...")

`SCM_DO_BUILD_DURING_DEPLOYMENT` is not set to `false`. Set it in Azure Portal > Configuration > Application settings.
