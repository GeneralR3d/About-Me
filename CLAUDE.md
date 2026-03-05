# CLAUDE.md

## Project Overview

This is a 3D portfolio website that reimagines a traditional resume as an immersive, physics-enabled game. Built with Three.js and Ammo.js, users can walk around a 3D world and discover career milestones embedded in the terrain.

## Tech Stack

- **3D Rendering**: Three.js
- **Physics**: Ammo.js
- **Animation**: GSAP
- **Build Tool**: Vite
- **Language**: JavaScript (ES Modules), HTML5, CSS3

## Project Structure

```
src/
  main.js        # Entry point
  Game.js        # Core game logic
  World/         # 3D world/scene components
  Utils/         # Utility helpers
index.html       # HTML entry
style.css        # Global styles
vite.config.js   # Vite configuration
public/          # Static assets
dist/            # Build output (gitignored)
```

## Common Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development Notes

- The project uses ES Modules (`"type": "module"` in package.json)
- Vite is used for bundling and hot module replacement during development
- Three.js handles 3D rendering; Ammo.js (a WebAssembly port of Bullet Physics) handles physics simulation
- GSAP is used for animations and transitions
