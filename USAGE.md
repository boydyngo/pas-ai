# PAS AI Website - Usage Guide

## 🌓 Dark/Light Mode
A toggle switch has been added to the navigation bar (top right).
- **Default**: Dark Mode (as per design).
- **Toggle**: Click the icon (Moon/Sun) to switch themes.
- **Persistence**: Your preference is saved to your browser's local storage.

## 🔄 Updating Projects
To fetch fresh data from GitHub and update the projects list:

1. **Ensure your repo list is correct**: If you have new repos, make sure they are in `complete_repo_list.json` (you may need to run `fetch_repos.js` or update it manually if that's your workflow).
2. **Run the update script**:
   ```bash
   npm run update-projects
   ```
   (This runs `node generate_enriched_projects.js` which fetches the latest stars, commits, and branches from GitHub).

3. **Re-deploy**: If the site is published, you must rebuild and redeploy for changes to appear.
   ```bash
   npm run build
   # Check 'dist' folder and deploy it
   ```

## 🌐 Publishing the Website
You have several options to make your site accessible online (`boydyngo.gotdns.com` or other).

### Option 1: GitHub Pages (Recommended, Free, Easy)
1. Initialize git if not already: `git init`
2. Commit your code: `git add . && git commit -m "Initial commit"`
3. Push to a GitHub repository.
4. Go to **Settings > Pages** in your repo.
5. Select **Source**: GitHub Actions or Deploy from Branch (usually `gh-pages` branch).
   - *Better yet*: Use `gh-pages` package.
     - `npm install gh-pages --save-dev`
     - Add `"deploy": "gh-pages -d dist"` to `package.json`.
     - Run `npm run build && npm run deploy`.
   - Your site will be at `https://boydyngo.github.io/pas-ai`.

### Option 2: Self-Hosting (DynDNS)
To use `boydyngo.gotdns.com` (which points to your home IP):
1. **Build the app**:
   ```bash
   npm run build
   ```
2. **Serve the `dist` folder**:
   - You need a web server (Nginx, Apache, or a simple Node server).
   - **Simple way**: Install `serve` globally: `npm install -g serve`
   - Run: `serve -s dist -l 80` (requires sudo/admin for port 80).
3. **Port Forwarding**: Ensure port 80 (HTTP) on your router is forwarded to your computer's IP.

### Option 3: Netlify / Vercel
1. Create an account on Netlify or Vercel.
2. Connect your GitHub repository.
3. It will automatically detect `Vite` and deploy.
4. **Updates**: Every time you push to GitHub, it auto-deploys.
