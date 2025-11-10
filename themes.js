export function initThemes() {
    const defaultTheme = 'ocean';
    const savedTheme = localStorage.getItem('themeWealthInc');
    const currentTheme = savedTheme || defaultTheme;
    if (!savedTheme) {
        localStorage.setItem('themeWealthInc', currentTheme);
    }
    applyTheme(currentTheme);

    const themeSelects = document.querySelectorAll('.theme-select');
    themeSelects.forEach(select => {
        select.value = currentTheme;
        select.addEventListener('change', (e) => {
            const theme = e.target.value;
            applyTheme(theme);
            localStorage.setItem('themeWealthInc', theme);
            themeSelects.forEach(s => s.value = theme);
        });
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
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

export function getCurrentTheme() {
    return localStorage.getItem('themeWealthInc') || 'ocean';
}

export function getThemeColor(type = 'primary') {
    const root = document.documentElement;
    return getComputedStyle(root).getPropertyValue(`--theme-${type}`).trim();
}
