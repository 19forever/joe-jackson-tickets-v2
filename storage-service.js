/**
 * Storage Service for Joe Jackson Memorabilia Museum
 * Centralizes localStorage access and handles credentials migration and defaults.
 */

(function(global) {
  'use strict';

  const DEFAULT_CONFIG = {
    token: '',
    owner: '19forever',
    repo: 'joe-jackson-tickets-v2',
    file: 'joe_jackson_tickets_cleaned.csv'
  };

  const StorageService = {
    /**
     * Automatically migrates legacy keys if present.
     */
    init() {
      try {
        if (typeof localStorage === 'undefined') return;
        const legacyPat = localStorage.getItem('jj_github_pat');
        const ghToken = localStorage.getItem('gh_token');
        if (legacyPat && !ghToken) {
          localStorage.setItem('gh_token', legacyPat);
        }
      } catch (e) {
        console.warn('StorageService init warning:', e);
      }
    },

    /**
     * Get a value from localStorage with a default fallback.
     */
    get(key, defaultValue = null) {
      try {
        if (typeof localStorage === 'undefined') return defaultValue;
        const val = localStorage.getItem(key);
        return val !== null ? val : defaultValue;
      } catch (e) {
        console.warn(`StorageService.get error for ${key}:`, e);
        return defaultValue;
      }
    },

    /**
     * Set a value in localStorage.
     */
    set(key, value) {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn(`StorageService.set error for ${key}:`, e);
      }
    },

    /**
     * Remove a key from localStorage.
     */
    remove(key) {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`StorageService.remove error for ${key}:`, e);
      }
    },

    /**
     * Retrieves current GitHub configuration object with defaults.
     * @returns {{ token: string, owner: string, repo: string, file: string }}
     */
    getGitHubConfig() {
      try {
        const token = (this.get('gh_token') || this.get('jj_github_pat') || '').trim();
        const owner = this.get('gh_owner', DEFAULT_CONFIG.owner) || DEFAULT_CONFIG.owner;
        const repo = this.get('gh_repo', DEFAULT_CONFIG.repo) || DEFAULT_CONFIG.repo;
        const file = this.get('gh_file', DEFAULT_CONFIG.file) || DEFAULT_CONFIG.file;
        return { token, owner, repo, file };
      } catch (e) {
        return { ...DEFAULT_CONFIG };
      }
    },

    /**
     * Persists GitHub configuration keys consistently.
     * @param {{ token?: string, owner?: string, repo?: string, file?: string }} config
     */
    setGitHubConfig(config = {}) {
      try {
        if (config.token !== undefined) {
          const t = config.token ? config.token.trim() : '';
          if (t) {
            this.set('gh_token', t);
            this.set('jj_github_pat', t);
          } else {
            this.remove('gh_token');
            this.remove('jj_github_pat');
          }
        }
        if (config.owner !== undefined) {
          this.set('gh_owner', config.owner ? config.owner.trim() : DEFAULT_CONFIG.owner);
        }
        if (config.repo !== undefined) {
          this.set('gh_repo', config.repo ? config.repo.trim() : DEFAULT_CONFIG.repo);
        }
        if (config.file !== undefined) {
          this.set('gh_file', config.file ? config.file.trim() : DEFAULT_CONFIG.file);
        }
      } catch (e) {
        console.warn('StorageService.setGitHubConfig error:', e);
      }
    }
  };

  // Run initialization on load
  StorageService.init();

  // Export globally
  global.StorageService = StorageService;

})(typeof window !== 'undefined' ? window : this);
