// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
}));

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = 'none';
    }
});

// Active navigation link highlighting
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}` || 
                (current === '' && link.getAttribute('href') === 'index.html')) {
                link.classList.add('active');
            }
        });
    });
}

// Scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Add fade-in class to elements and observe them
document.addEventListener('DOMContentLoaded', () => {
    const elementsToAnimate = document.querySelectorAll('.research-card, .about-content, .podcast-content, .partnerships-content');
    
    elementsToAnimate.forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Typing effect for hero title (optional enhancement)
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Initialize typing effect when page loads
document.addEventListener('DOMContentLoaded', () => {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const originalText = heroTitle.innerHTML;
        // Uncomment the line below to enable typing effect
        // typeWriter(heroTitle, originalText, 50);
    }
});

// Lazy loading for images
document.addEventListener('DOMContentLoaded', () => {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
});

// Back to top button functionality
function createBackToTopButton() {
    const backToTopButton = document.createElement('button');
    backToTopButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
    backToTopButton.className = 'back-to-top';
    backToTopButton.setAttribute('aria-label', 'Back to top');
    document.body.appendChild(backToTopButton);
    
    // Add CSS for the button
    const style = document.createElement('style');
    style.textContent = `
        .back-to-top {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            box-shadow: var(--shadow-lg);
            transition: var(--transition);
            z-index: 1000;
        }
        
        .back-to-top:hover {
            background-color: var(--primary-dark);
            transform: translateY(-2px);
        }
        
        .back-to-top.show {
            display: flex;
        }
    `;
    document.head.appendChild(style);
    
    // Show/hide button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopButton.classList.add('show');
        } else {
            backToTopButton.classList.remove('show');
        }
    });
    
    // Scroll to top when clicked
    backToTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Initialize back to top button
document.addEventListener('DOMContentLoaded', createBackToTopButton);

// Form validation for contact form (if exists)
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.querySelector('form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Basic form validation
            const requiredFields = contactForm.querySelectorAll('[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('error');
                } else {
                    field.classList.remove('error');
                }
            });
            
            if (isValid) {
                // Here you would typically send the form data
                alert('Thank you for your message! I will get back to you soon.');
                contactForm.reset();
            } else {
                alert('Please fill in all required fields.');
            }
        });
    }
});

// Add loading animation for page transitions
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

// Load More Publications functionality
document.addEventListener('DOMContentLoaded', () => {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const hiddenPublications = document.getElementById('hiddenPublications');
    
    if (loadMoreBtn && hiddenPublications) {
        loadMoreBtn.addEventListener('click', () => {
            if (hiddenPublications.style.display === 'none') {
                // Show hidden publications
                hiddenPublications.style.display = 'block';
                loadMoreBtn.textContent = 'Show Less Publications';
                
                // Smooth scroll to the newly shown content
                hiddenPublications.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            } else {
                // Hide publications
                hiddenPublications.style.display = 'none';
                loadMoreBtn.textContent = 'Load More Publications';
                
                // Smooth scroll back to the button
                loadMoreBtn.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }
        });
    }
});

// Venue Summary Auto-Update functionality
function updateVenueSummary() {
    // Extract venue information from all publications by looking for <span class="acronym"> elements
    const publicationItems = document.querySelectorAll('.publication-item');
    const venueMap = new Map();
    
    publicationItems.forEach(item => {
        // Look for the acronym span within this publication item
        const acronymElement = item.querySelector('.venue .acronym');
        if (acronymElement) {
            const venue = acronymElement.textContent.trim();
            if (venue) {
                venueMap.set(venue, (venueMap.get(venue) || 0) + 1);
            }
        }
    });
    
    // Sort venues by count (descending) and then alphabetically
    const sortedVenues = new Map([...venueMap.entries()].sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]; // Sort by count descending
        return a[0].localeCompare(b[0]); // Then alphabetically
    }));
    
    // Update the HTML with all venues in a single list
    updateAllVenues(sortedVenues);
}

function updateAllVenues(venueMap) {
    const venueStats = document.querySelector('.venue-stats');
    if (!venueStats) return;
    
    const categoryDiv = venueStats.querySelector('.venue-category');
    if (!categoryDiv) return;
    
    const venueTagsDiv = categoryDiv.querySelector('.venue-tags');
    if (!venueTagsDiv) return;
    
    // Clear existing tags
    venueTagsDiv.innerHTML = '';
    
    // Add all venue tags
    venueMap.forEach((count, venue) => {
        const tag = document.createElement('span');
        tag.className = `venue-tag ${getTagClassByCount(count)}`;
        tag.textContent = `${venue} × ${count}`;
        venueTagsDiv.appendChild(tag);
    });
}

function getTagClassByCount(count) {
    if (count >= 4) return 'high';    // Red for 4+ publications
    if (count >= 3) return 'medium';  // Orange for 3 publications
    if (count === 2) return 'low';    // Green for 2 publications
    return 'single';                  // Gray for 1 publication
}

function extractVenueAcronym(venueText) {
    // This function is now deprecated since we're reading directly from <span class="acronym"> elements
    // Keeping it for backward compatibility but it won't be used
    return null;
}

function extractVenueAcronym(venueText) {
    // This function is now deprecated since we're reading directly from <span class="acronym"> elements
    // Keeping it for backward compatibility but it won't be used
    return null;
}

function getTagClass(count, tagClasses) {
    if (count >= 4 && tagClasses.includes('high')) return 'high';
    if (count >= 3 && tagClasses.includes('medium')) return 'medium';
    if (count === 2 && tagClasses.includes('low')) return 'low';
    return 'single';
}

// Initialize venue summary update when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Add a small delay to ensure all content is loaded
    setTimeout(updateVenueSummary, 100);
    
    // Also update when "Load More" button is clicked
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            // Update after the content is shown/hidden
            setTimeout(updateVenueSummary, 300);
        });
    }
});

// Add CSS for loading animation
const loadingStyle = document.createElement('style');
loadingStyle.textContent = `
    body {
        opacity: 0;
        transition: opacity 0.5s ease;
    }
    
    body.loaded {
        opacity: 1;
    }
    
    .error {
        border-color: #ef4444 !important;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
    }
`;
document.head.appendChild(loadingStyle); 