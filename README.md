# Chaiyong Ragkhitwetsagul - Modern Personal Website

A modern, responsive personal website for Chaiyong Ragkhitwetsagul, built with HTML5, CSS3, and vanilla JavaScript.

## Features

### 🎨 Modern Design
- Clean, minimalist design with modern typography
- Responsive layout that works on all devices
- Smooth animations and transitions
- Professional color scheme with CSS custom properties

### 📱 Responsive & Mobile-First
- Mobile-first responsive design
- Hamburger menu for mobile navigation
- Optimized for all screen sizes
- Touch-friendly interface

### ⚡ Performance
- Fast loading with optimized assets
- Lazy loading for images
- Smooth scrolling and animations
- Minimal JavaScript footprint

### 🎯 User Experience
- Intuitive navigation with active state highlighting
- Smooth scroll animations
- Back-to-top button
- Loading animations
- Form validation (when applicable)

## File Structure

```
new_website/
├── index.html          # Home page
├── styles.css          # Main stylesheet
├── script.js           # JavaScript functionality
├── README.md           # This file
└── old_website/        # Original website files
    ├── images/         # Original images
    ├── files/          # Original files (CV, publications, etc.)
    └── ...             # Other original files
```

## Pages

### Home Page (`index.html`)
- Hero section with introduction
- About section
- Research areas overview
- Podcast section
- Partnerships section
- Footer with social links

### Planned Pages (to be created)
- `research.html` - Detailed research information
- `teaching.html` - Teaching experience and courses
- `students.html` - Student information and supervision
- `projects.html` - Project portfolio
- `links.html` - Useful links and resources
- `contact.html` - Contact information and form

## CV Data and Sync

The CV is edited in one file and flows one way from there:

```
cv-data.json   canonical — the only file to edit
   │  push to master → .github/workflows/cv-sync.yml
   ├─► cv-data.js        static fallback, committed back by the Action
   └─► Firestore cv/main live copy
          │  cv-live.js (onSnapshot)
          ▼
research.html · projects.html · teaching.html · MyCV
```

Every page renders straight away from `cv-data.js`, then `cv-live.js`
replaces `window.DEFAULT_CV` with the Firestore copy and fires a `cv:update`
event that each page re-renders on. Pages that are already open update within
seconds of the Action finishing, with no reload. If Firebase can't be reached,
the static render simply stays. MyCV is read-only: it shows, prints and
exports the CV, but has no editor.

The Firebase app is set up once in `firebase.js`, which also starts Google
Analytics (`measurementId`). Every main page loads it, either directly or
through `cv-live.js`.

`tools/firebase-sync.mjs` does the work (`npm run cv:build-js`,
`npm run cv:push`, `push --dry-run`). It builds `cv-data.js` with the
serializer in `MyCV/cv-serialize.js` and stores the CV in Firestore as one
JSON string, which keeps field order intact (Firestore maps come back with
their keys sorted). `firestore.rules` makes `cv/main` world-readable, and no
browser can write to it. Only the Action can, through the Admin SDK.

### One-time Firebase setup

1. Create a Firebase project and enable Firestore (production mode).
2. Register a Web app and paste its config into `FIREBASE_CONFIG` in
   `firebase.js`.
3. Deploy the rules, either by pasting `firestore.rules` into the console's
   Rules tab or with `npx firebase-tools deploy --only firestore:rules`.
4. Under Project settings → Service accounts, generate a private key. Add the
   file's contents as the repository secret `FIREBASE_SERVICE_ACCOUNT`. Never
   commit the key (`.gitignore` covers the default file name).
5. Run **CV sync** once from the Actions tab to seed `cv/main`.

## Citation Figures

The citation counts and h-indexes in `pubStats` are edited in `cv-data.json`
like everything else. `tools/scholar-worker.js` (a Cloudflare Worker that reads
a Google Scholar profile server-side) is kept for a future scheduled job that
updates them. MyCV's fetch buttons went away with its editor.

## Technologies Used

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with Grid, Flexbox, and custom properties
- **Vanilla JavaScript** - Interactive functionality
- **Font Awesome** - Icons
- **Google Fonts** - Typography (Inter font family)

## CSS Features

### Custom Properties (CSS Variables)
```css
:root {
    --primary-color: #2563eb;
    --secondary-color: #64748b;
    --text-primary: #1e293b;
    /* ... more variables */
}
```

### Modern Layout
- CSS Grid for main layouts
- Flexbox for component layouts
- Responsive breakpoints
- Mobile-first approach

### Animations
- Smooth transitions
- Scroll-triggered animations
- Hover effects
- Loading animations

## JavaScript Features

### Navigation
- Mobile menu toggle
- Active link highlighting
- Smooth scrolling
- Navbar scroll effects

### Animations
- Intersection Observer for scroll animations
- Fade-in effects
- Typing effect (optional)

### User Experience
- Back-to-top button
- Form validation
- Loading states
- Error handling

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## Getting Started

1. Clone or download the repository
2. Open `index.html` in a web browser
3. The website should work immediately without any build process

## Customization

### Colors
Edit the CSS custom properties in `styles.css`:
```css
:root {
    --primary-color: #your-color;
    --secondary-color: #your-color;
    /* ... */
}
```

### Content
- Update content in `index.html`
- Add new pages following the same structure
- Modify styles in `styles.css`
- Add functionality in `script.js`

### Images
- Replace images in the `old_website/images/` directory
- Update image paths in HTML files
- Optimize images for web use

## Performance Tips

1. **Optimize Images**: Use WebP format when possible, compress images
2. **Minimize HTTP Requests**: Combine CSS/JS files if needed
3. **Use CDN**: Font Awesome and Google Fonts are loaded from CDN
4. **Lazy Loading**: Images are lazy-loaded for better performance

## Accessibility

- Semantic HTML structure
- ARIA labels where appropriate
- Keyboard navigation support
- Screen reader friendly
- High contrast ratios
- Focus indicators

## Future Enhancements

- [ ] Add dark mode toggle
- [ ] Implement search functionality
- [ ] Add blog section
- [ ] Create contact form with backend
- [ ] Add analytics tracking
- [ ] Implement PWA features
- [ ] Add more interactive elements

## License

This project is for personal use. Please respect the original content and design.

## Contact

For questions or suggestions about this website, please contact Chaiyong Ragkhitwetsagul.

---

**Note**: This is a modern redesign of the original website located in the `old_website/` directory. The original content and structure have been preserved while implementing modern web design principles and best practices. 