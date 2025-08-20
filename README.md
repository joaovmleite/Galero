# Galero

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![GSAP](https://img.shields.io/badge/gsap-88CE02?style=for-the-badge&logo=greensock&logoColor=white)
![Figma](https://img.shields.io/badge/figma-%23F24E1E.svg?style=for-the-badge&logo=figma&logoColor=white)
![NPM](https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white)
![Netlify](https://img.shields.io/badge/netlify-%23000000.svg?style=for-the-badge&logo=netlify&logoColor=#00C7B7)


A minimal, privacy-first image search and color palette extractor. Galero lets you search photos from Unsplash and instantly extract a concise color palette from any image—no tracking, no analytics.

![Homepage](https://i.postimg.cc/KjTJKgmt/Screenshot-2025-08-20-12-28-17.png)  
![Extract Colors](https://i.postimg.cc/VN3tJZvH/Screenshot-2025-08-20-12-28-31.png)

## Features
- **Image search (Unsplash API):** Type a query (e.g., "nature", "people") and fetch curated results.
- **Instant color palettes:** Click any image to open a modal with up to 8 extracted colors.
- **Copy to clipboard:** Click a swatch to copy its RGB value.
- **Smooth UI animations:** Powered by GSAP for subtle transitions.
- **Privacy-first:** No cookies, analytics, or tracking scripts.

## Tech Stack
- Frontend: Vanilla HTML/CSS/JS (`index.html`, `public/assets/...`)
- Animations: GSAP (via CDN)
- Serverless: Netlify Functions (`netlify/functions/photos.js`)
- HTTP client: Axios (server-side)

## Project Structure
```
.
├─ index.html                     # App shell and UI
├─ public/
│  └─ assets/
│     ├─ css/style.css            # Styles
│     └─ js/script.js             # UI logic, search & palette modal
├─ netlify/
│  └─ functions/
│     └─ photos.js                # Netlify serverless function (Unsplash proxy)
├─ index.js                       # Alternate serverless handler (optional)
├─ package.json                   # Dependencies (axios, dotenv, etc.)
└─ README.md
```

## Usage
- Open the app.
- Enter a search term and press Enter.
- Click an image to open the Extracted Palette modal.
- Click a color swatch to copy its RGB value.

## Accessibility & Privacy
- The UI uses semantic roles and ARIA attributes for modals and interactive elements.
- No analytics, cookies, or third‑party tracking are included.

## COPYRIGHT © Galero 2025
