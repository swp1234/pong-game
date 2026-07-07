/**
 * Internationalization (i18n) Module
 * Handles multi-language support for Pong Game
 */

class I18n {
    constructor() {
        this.translations = {};
        this.supportedLanguages = ['ko', 'en', 'ja', 'zh', 'es', 'pt', 'id', 'tr', 'de', 'fr', 'hi', 'ru'];
        this.currentLang = this.detectLanguage();
        document.documentElement.lang = this.currentLang;
        this.loaded = false;
    }

    /**
     * Detect user's language preference
     * Priority: localStorage → browser language → 'en'
     */
    detectLanguage() {
        try {
            const params = new URLSearchParams(window.location.search);
            const urlLang = params.get('lang');
            if (urlLang && this.supportedLanguages.includes(urlLang)) {
                return urlLang;
            }
        } catch (e) {}

        // Check localStorage
        try {
            const saved = localStorage.getItem('selectedLanguage');
            if (saved && this.supportedLanguages.includes(saved)) {
                return saved;
            }
        } catch (e) {}

        // Check browser language
        const browserLang = navigator.language.split('-')[0];
        if (this.supportedLanguages.includes(browserLang)) {
            return browserLang;
        }

        // Default to English
        return 'en';
    }

    /**
     * Load translations from JSON file
     */
    async loadTranslations(lang) {
        try {
            const response = await fetch(`js/locales/${lang}.json`);
            if (!response.ok) throw new Error(`Failed to load ${lang}`);
            this.translations[lang] = await response.json();
        } catch (error) {
            console.error(`Error loading language: ${lang}`, error);
            // Fallback to English
            if (lang !== 'en') {
                return this.loadTranslations('en');
            }
        }
    }

    /**
     * Get translated text using dot notation
     * Example: i18n.t('menu.title') → translations.menu.title
     */
    t(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang];

        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                return key; // Return key if translation not found
            }
        }

        return value || key;
    }

    /**
     * Change language and update UI
     */
    async setLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) return;

        if (!this.translations[lang]) {
            await this.loadTranslations(lang);
        }

        this.currentLang = lang;
        document.documentElement.lang = lang;
        try {
            localStorage.setItem('selectedLanguage', lang);
        } catch (e) {}
        this.updateUI();
    }

    /**
     * Update all elements with data-i18n attribute
     */
    updateUI() {
        document.documentElement.lang = this.currentLang;

        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const text = this.t(key);

            if (element.tagName === 'INPUT' && element.type === 'checkbox') {
                // For checkboxes, update the label
                const label = element.nextElementSibling;
                if (label) {
                    label.textContent = text;
                }
            } else if (element.tagName === 'LABEL' && element.querySelector('input')) {
                // Skip labels that contain input elements
                const span = element.querySelector('span');
                if (span) {
                    span.textContent = text;
                }
            } else {
                element.textContent = text;
            }
        });

        document.querySelectorAll('.lang-option').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === this.currentLang);
        });
    }

    /**
     * Initialize i18n system
     */
    async init() {
        await this.loadTranslations(this.currentLang);
        this.updateUI();
        this.loaded = true;
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
        return this.currentLang;
    }

    /**
     * Get language name in native language
     */
    getLanguageName(lang) {
        const names = {
            'ko': '한국어',
            'en': 'English',
            'ja': '日本語',
            'zh': '中文',
            'es': 'Español',
            'pt': 'Português',
            'id': 'Bahasa Indonesia',
            'tr': 'Türkçe',
            'de': 'Deutsch',
            'fr': 'Français',
            'hi': 'हिन्दी',
            'ru': 'Русский'
        };
        return names[lang] || lang;
    }
}

// Create global i18n instance
const i18n = new I18n();
