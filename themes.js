// Theme management
export function initThemes() {
    // Determine theme from storage or fallback to default
    const defaultTheme = 'ocean';
    const savedTheme = localStorage.getItem('theme');
    const currentTheme = savedTheme || defaultTheme;
    if (!savedTheme) {
        localStorage.setItem('theme', currentTheme);
    }
    // Apply the saved or default theme
    applyTheme(currentTheme);

    // Set up theme selectors
    const themeSelects = document.querySelectorAll('.theme-select');
    themeSelects.forEach(select => {
        // Set the current theme in the select
        select.value = currentTheme;
        
        // Add change event listener
        select.addEventListener('change', (e) => {
            const theme = e.target.value;
            applyTheme(theme);
            localStorage.setItem('theme', theme);
            
            // Update all theme selectors to match
            themeSelects.forEach(s => s.value = theme);
        });
    });
}

function applyTheme(theme) {
    // Set the theme attribute on the root element
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update the theme color meta tag for mobile browsers
    const themeColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--theme-primary').trim();
    
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
        themeColorMeta = document.createElement('meta');
        themeColorMeta.name = 'theme-color';
        document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.content = themeColor;
}

// Get the current theme
export function getCurrentTheme() {
    return localStorage.getItem('theme') || 'ocean';
}

// Get theme color for charts or other JS-based elements
export function getThemeColor(type = 'primary') {
    const root = document.documentElement;
    return getComputedStyle(root).getPropertyValue(`--theme-${type}`).trim();
}
