# 3D Chess

An interactive, responsive 3D chess game built with React, Three.js, Tailwind CSS, and chess.js. Features tournament Staunton 3D piece models, 6 AI difficulty tiers (450–2500 ELO), customizable visual themes, pass-and-play local multiplayer, move notations, timer clocks, and sound effects.

---

## 🚀 Live Deployment on GitHub Pages

This repository is pre-configured for automated deployment with **GitHub Actions**.

### 1. Enable GitHub Pages in your Repository Settings
1. Go to your repository on GitHub: `https://github.com/<username>/<repo-name>`
2. Click on **Settings** (top navigation).
3. In the left sidebar, click **Pages** (under the "Code and automation" section).
4. Under **Build and deployment** > **Source**, select:
   👉 **GitHub Actions**
5. Save your settings.

### 2. Trigger the Deployment
- Push any commit to `main` (or `master`), or go to the **Actions** tab on GitHub, click **Deploy to GitHub Pages**, and click **Run workflow**.
- Within 1–2 minutes, your live site URL will be displayed in the Actions run and in **Settings > Pages** (e.g., `https://<username>.github.io/<repo-name>/`).

---

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

---

## ⚙️ Configuration Files
- `.github/workflows/deploy.yml`: GitHub Actions automated CI/CD pipeline for GitHub Pages.
- `site.config.ts` & `site.config.json`: Application and deployment metadata configuration.
- `vite.config.ts`: Configured with relative base `./` for subpath compatibility on GitHub Pages.
- `public/.nojekyll`: Disables Jekyll processing on GitHub Pages to serve Vite static assets seamlessly.
