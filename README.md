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

The CV lives in one place and is published from there:

```
cv-data.json     canonical — the only file to edit by hand
cv-data.js       generated — `window.DEFAULT_CV = …`, loaded with a plain
                 script tag by research.html, projects.html, teaching.html
                 and the MyCV editor
```

`cv-data.js` is regenerated from `cv-data.json` on every save and should never
be edited directly. The MyCV editor (`MyCV/index.html`) writes both files
through whichever sync path is available:

- **Cloud sync (`MyCV/gh-sync.js`)** — commits both files to this repository
  through the GitHub API, in a single commit, then GitHub Pages republishes.
  Works in any browser, including phones and tablets, which makes it the way
  to keep several devices in step. Needs a fine-grained personal access token
  scoped to this repository with **Contents: read and write**; it is entered
  once per device in the editor's ☁ dialog and stored encrypted with the edit
  password.
- **Disk sync (`MyCV/fs-sync.js`)** — writes straight into a local checkout
  via the File System Access API. Chromium only, and needs the repo cloned.
- **Export / Import** — a JSON download and upload, as a fallback.

Both sync paths share `MyCV/cv-serialize.js`, which generates the two files
and refuses a save that would drop publications, publication links or venue
acronyms compared to the copy it is about to overwrite. Cloud sync adds a
staleness check: if the copy on GitHub changed since this device last synced,
the push is blocked and the editor offers **Load cloud** or **Push anyway**
rather than silently overwriting.

Opening the editor on a device that is merely out of date pulls the newer
version automatically; a device with its own unpushed edits is told instead of
being overwritten.

## Citation Figures

The citation counts and h-indexes under *Publications* used to be retyped by
hand from two profile pages. In edit mode the section now carries **⟳ Google
Scholar** and **⟳ Scopus** buttons, which fetch them and stamp the source line
with today's date. ⚙ next to them holds the settings.

The two sources are reached very differently:

- **Scopus** is a direct call to `api.elsevier.com`, which answers browsers —
  it echoes the page's `Origin`. It needs a free API key from
  [dev.elsevier.com](https://dev.elsevier.com/apikey/manage), registered to the
  site the editor is served from: a key registered to `cragkhit.github.io` will
  not work from a `file://` page or a different host. The key is stored
  encrypted with the edit password, exactly like the GitHub token.
- **Google Scholar** has no API, sends no CORS headers, and answers shared
  proxies with *"your computer or network may be sending automated queries"*.
  The button therefore calls a relay you deploy yourself:
  `tools/scholar-worker.js`, a Cloudflare Worker that reads the profile
  server-side and returns the two figures as JSON. Deploy it free at
  dash.cloudflare.com (Workers & Pages → Create → paste the file over the
  template), or with
  `npx wrangler deploy tools/scholar-worker.js --name cv-stats`, then paste the
  worker URL under ⚙. Add any extra origin you serve MyCV from to `ALLOWED` at
  the top of the file. The worker caches for half an hour, only accepts profile
  IDs, and reports a Google block rather than writing a wrong number.

Both buttons write into `pubStats` like any other edit, so the result still has
to be pushed — nothing is committed behind your back — and either figure can be
typed over by hand if a fetch is unavailable.

Profile IDs default to the ones linked from the public site
(Scholar `VArdauUAAAAJ`, Scopus `56422351700`), so a new device needs only the
relay URL and the API key.

## Regenerating the Faculty CV

The ICT Faculty CV was kept as a Word document by hand, alongside `cv-data.json`,
so the two drifted. `tools/gen-cv.py` builds it from the data instead:

```
python3 tools/gen-cv.py                 # .docx and .pdf into dist/
python3 tools/gen-cv.py --format docx   # skip the PDF step
python3 tools/gen-cv.py --format md     # inspect the intermediate Markdown
python3 tools/gen-cv.py --data cv-data.js --reference other.docx
```

The pipeline is `cv-data.json` → Markdown → `.docx` → `.pdf`. Pandoc produces
the `.docx`, taking its styles — headings, body text, list indents — from the
existing faculty document via `--reference-doc`; only its styles are used,
never its content. Microsoft Word then renders the PDF over AppleScript. The
`Latest update:` line in the page header is restamped from `meta.lastUpdate`,
since pandoc would otherwise copy whatever date the template froze.

Publication counts under *Publication Statistics* are derived from the
publication list rather than stored, so they cannot fall out of step with it.
Outputs land in `dist/`, which is git-ignored.

Without Word, use `--format docx` and convert by hand. Without pandoc
(`brew install pandoc`), only `--format md` works.

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