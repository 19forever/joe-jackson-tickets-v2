/**
 * GitHub Service for Joe Jackson Memorabilia Museum
 * Provides robust REST API communication with GitHub for committing dataset changes.
 */

(function(global) {
  'use strict';

  function utf8_to_b64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
  }

  function getConfig() {
    if (typeof global.StorageService !== 'undefined' && typeof global.StorageService.getGitHubConfig === 'function') {
      return global.StorageService.getGitHubConfig();
    }

    let token = '';
    let owner = '19forever';
    let repo = 'joe-jackson-tickets-v2';
    let file = 'joe_jackson_tickets_cleaned.csv';

    try {
      if (typeof localStorage !== 'undefined') {
        token = localStorage.getItem('gh_token') || localStorage.getItem('jj_github_pat') || '';
        owner = localStorage.getItem('gh_owner') || '19forever';
        repo = localStorage.getItem('gh_repo') || 'joe-jackson-tickets-v2';
        file = localStorage.getItem('gh_file') || 'joe_jackson_tickets_cleaned.csv';
      }
    } catch (e) {
      console.warn('Storage access warning in GitHubService:', e);
    }

    return { token: token ? token.trim() : '', owner, repo, file };
  }

  function getRepoUrl(cfg) {
    const fullRepo = cfg.repo.includes('/') ? cfg.repo : `${cfg.owner}/${cfg.repo}`;
    return `https://api.github.com/repos/${fullRepo}/contents/${cfg.file}`;
  }

  function mapStatusToMessage(status, rawMessage) {
    if (status === 200 || status === 201) {
      return "✅ Saved successfully to GitHub.";
    }
    if (status === 401 || status === 403) {
      return "❌ Invalid GitHub PAT token or missing 'repo' write permissions.";
    }
    if (status === 404) {
      return "❌ Target repository or CSV file path not found.";
    }
    if (rawMessage) {
      return `❌ GitHub API error (${status}): ${rawMessage}`;
    }
    return `❌ GitHub API error occurred (Status ${status}).`;
  }

  const GitHubService = {
    utf8_to_b64: utf8_to_b64,
    getConfig: getConfig,

    /**
     * Retrieves the current SHA hash for the CSV file on GitHub.
     * @returns {Promise<{ success: boolean, sha?: string, status: number, message: string, raw?: any }>}
     */
    async getFileSha() {
      const cfg = getConfig();
      if (!cfg.token) {
        return {
          success: false,
          status: 401,
          message: "❌ GitHub PAT token is not configured. Please set your token first."
        };
      }

      const url = getRepoUrl(cfg);

      try {
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${cfg.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        let json = {};
        try { json = await res.json(); } catch (e) {}

        if (!res.ok) {
          console.error("GitHub Commit Error (getFileSha):", res.status, json);
          return {
            success: false,
            status: res.status,
            message: mapStatusToMessage(res.status, json.message),
            raw: json
          };
        }

        return {
          success: true,
          sha: json.sha,
          status: res.status,
          message: "SHA retrieved successfully.",
          raw: json
        };
      } catch (err) {
        console.error("GitHub Commit Error (getFileSha Network):", err);
        return {
          success: false,
          status: 0,
          message: "❌ Network error connecting to GitHub: " + err.message,
          raw: err
        };
      }
    },

    /**
     * Commits updated CSV content directly to GitHub.
     * @param {string} updatedCsvContent - Plain text CSV data.
     * @param {string} [commitMessage] - Optional custom commit message.
     * @returns {Promise<{ success: boolean, status: number, message: string, raw?: any }>}
     */
    async commitFile(updatedCsvContent, commitMessage = "Update ticket metadata via Admin Editor") {
      const cfg = getConfig();
      if (!cfg.token) {
        return {
          success: false,
          status: 401,
          message: "❌ GitHub PAT token is not configured. Please set your token first."
        };
      }

      const shaResult = await this.getFileSha();
      if (!shaResult.success || !shaResult.sha) {
        return shaResult;
      }

      const url = getRepoUrl(cfg);

      try {
        const encodedContent = utf8_to_b64(updatedCsvContent);

        const res = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${cfg.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            message: commitMessage,
            content: encodedContent,
            sha: shaResult.sha
          })
        });

        let json = {};
        try { json = await res.json(); } catch (e) {}

        if (!res.ok) {
          console.error("GitHub Commit Error (commitFile):", res.status, json);
          return {
            success: false,
            status: res.status,
            message: mapStatusToMessage(res.status, json.message),
            raw: json
          };
        }

        return {
          success: true,
          status: res.status,
          message: mapStatusToMessage(res.status),
          raw: json
        };
      } catch (err) {
        console.error("GitHub Commit Error (commitFile Network):", err);
        return {
          success: false,
          status: 0,
          message: "❌ Failed to commit to GitHub: " + err.message,
          raw: err
        };
      }
    }
  };

  // Export globally
  global.GitHubService = GitHubService;

})(typeof window !== 'undefined' ? window : this);
