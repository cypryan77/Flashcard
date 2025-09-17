// Function to set the theme
function setTheme(themeName) {
    localStorage.setItem('theme', themeName);
    document.documentElement.setAttribute('data-theme', themeName);
}

// Function to apply the saved theme on initial load
function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        // Set a default theme if none is saved
        setTheme('light');
    }
}

// Apply the theme immediately to prevent FOUC (Flash of Unstyled Content)
applySavedTheme();


// Add event listeners after the DOM has loaded
document.addEventListener('DOMContentLoaded', () => {
    const themeSwitcher = document.querySelector('.theme-switcher');

    // Handle theme button clicks
    if (themeSwitcher) {
        themeSwitcher.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const theme = e.target.dataset.theme;
                if (theme) {
                    setTheme(theme);
                }
            }
        });
    }
});
