import { App, Modal } from "obsidian";
import { MusicBrainzRelease, AlbumSuggestion, SuggestionWithStatus } from "./types";

export class SearchModal extends Modal {
  private artistInput: HTMLInputElement;
  private albumInput: HTMLInputElement;
  private resultsEl: HTMLDivElement;
  private statusEl: HTMLDivElement;
  private suggestionsEl: HTMLDivElement;
  private results: MusicBrainzRelease[] = [];
  private debounceTimer: number | null = null;
  private searchFn: (artist: string, album: string) => Promise<MusicBrainzRelease[]>;
  private onSelect: (release: MusicBrainzRelease) => void;
  private suggestionsPromise?: Promise<SuggestionWithStatus[]>;
  private onSuggestionSelect?: (suggestion: AlbumSuggestion) => void;
  private isSearching = false;
  private suggestionsLoaded = false;

  constructor(
    app: App,
    searchFn: (artist: string, album: string) => Promise<MusicBrainzRelease[]>,
    onSelect: (release: MusicBrainzRelease) => void,
    suggestionsPromise?: Promise<SuggestionWithStatus[]>,
    onSuggestionSelect?: (suggestion: AlbumSuggestion) => void
  ) {
    super(app);
    this.searchFn = searchFn;
    this.onSelect = onSelect;
    this.suggestionsPromise = suggestionsPromise;
    this.onSuggestionSelect = onSuggestionSelect;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "Search for Album" });

    // Add styles
    contentEl.createEl("style", {
      text: `
        .album-search-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 10px;
        }
        .album-search-input {
          width: 100%;
          padding: 10px;
          font-size: 16px;
        }
        .album-search-status {
          padding: 10px;
          color: var(--text-muted);
          font-style: italic;
        }
        .album-results-list {
          max-height: 400px;
          overflow-y: auto;
        }
        .album-result-item {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 10px;
          border-bottom: 1px solid var(--background-modifier-border);
          cursor: pointer;
        }
        .album-result-item:hover {
          background-color: var(--background-modifier-hover);
        }
        .album-cover-thumb {
          width: 50px;
          height: 50px;
          object-fit: cover;
          border-radius: 4px;
          background: var(--background-secondary);
          flex-shrink: 0;
        }
        .album-cover-placeholder {
          width: 50px;
          height: 50px;
          background: var(--background-secondary);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-size: 20px;
          flex-shrink: 0;
        }
        .album-result-info {
          flex: 1;
          min-width: 0;
        }
        .album-result-title {
          font-weight: bold;
          margin-bottom: 4px;
        }
        .album-result-details {
          font-size: 0.9em;
          color: var(--text-muted);
        }
        .suggestion-header {
          color: var(--text-muted);
          font-size: 0.85em;
          padding: 8px 10px 4px;
        }
        .suggestion-item {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 10px;
          border-bottom: 1px solid var(--background-modifier-border);
          cursor: pointer;
        }
        .suggestion-item:hover {
          background-color: var(--background-modifier-hover);
        }
        .suggestion-item.suggestion-added {
          opacity: 0.5;
          cursor: default;
        }
        .suggestion-item.suggestion-added:hover {
          background-color: transparent;
        }
        .suggestion-cover {
          width: 50px;
          height: 50px;
          object-fit: cover;
          border-radius: 4px;
          background: var(--background-secondary);
          flex-shrink: 0;
        }
        .suggestion-cover-placeholder {
          width: 50px;
          height: 50px;
          background: var(--background-secondary);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-size: 20px;
          flex-shrink: 0;
        }
        .suggestion-info {
          flex: 1;
          min-width: 0;
        }
        .suggestion-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 2px;
        }
        .suggestion-title {
          font-weight: bold;
        }
        .suggestion-added-badge {
          font-size: 0.75em;
          padding: 1px 6px;
          border-radius: 3px;
          background: var(--background-modifier-border);
          color: var(--text-muted);
        }
        .suggestion-artist {
          color: var(--text-muted);
          font-size: 0.9em;
          margin-bottom: 4px;
        }
        .suggestion-stats {
          font-size: 0.85em;
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        .suggestion-progress-bar {
          height: 3px;
          background: var(--background-modifier-border);
          border-radius: 2px;
          overflow: hidden;
        }
        .suggestion-progress-fill {
          height: 100%;
          background: var(--interactive-accent);
          border-radius: 2px;
        }
      `,
    });

    // Search inputs container
    const searchContainer = contentEl.createEl("div", { cls: "album-search-container" });

    // Artist input
    this.artistInput = searchContainer.createEl("input", {
      cls: "album-search-input",
      attr: {
        type: "text",
        placeholder: "Artist...",
      },
    });

    // Album input
    this.albumInput = searchContainer.createEl("input", {
      cls: "album-search-input",
      attr: {
        type: "text",
        placeholder: "Album...",
      },
    });

    this.artistInput.addEventListener("input", () => this.onSearchInput());
    this.albumInput.addEventListener("input", () => this.onSearchInput());

    // Status area (for loading/empty states)
    this.statusEl = contentEl.createEl("div", { cls: "album-search-status" });

    // Suggestions container
    this.suggestionsEl = contentEl.createEl("div", { cls: "album-results-list" });

    // Results container (hidden initially)
    this.resultsEl = contentEl.createEl("div", { cls: "album-results-list" });
    this.resultsEl.style.display = "none";

    // Load suggestions if available
    if (this.suggestionsPromise) {
      this.statusEl.setText("Loading suggestions...");
      this.suggestionsPromise
        .then((suggestions) => {
          this.suggestionsLoaded = true;
          const artist = this.artistInput.value.trim();
          const album = this.albumInput.value.trim();
          if (!artist && !album) {
            this.renderSuggestions(suggestions);
          }
        })
        .catch((err) => {
          console.error("Failed to load suggestions:", err);
          if (!this.artistInput.value.trim() && !this.albumInput.value.trim()) {
            this.statusEl.setText("Type to search...");
          }
        });
    } else {
      this.statusEl.setText("Type to search...");
      this.suggestionsEl.style.display = "none";
    }

    // Focus the artist input
    this.artistInput.focus();
  }

  private renderSuggestions(items: SuggestionWithStatus[]) {
    this.suggestionsEl.empty();

    if (items.length === 0) {
      this.statusEl.setText("Type to search...");
      this.suggestionsEl.style.display = "none";
      return;
    }

    this.statusEl.style.display = "none";
    this.suggestionsEl.style.display = "block";

    this.suggestionsEl.createEl("div", {
      cls: "suggestion-header",
      text: "From your Last.fm (last 14 days)",
    });

    // Sort: non-added first, then added
    const sorted = [...items].sort((a, b) => {
      if (a.alreadyAdded !== b.alreadyAdded) return a.alreadyAdded ? 1 : -1;
      return 0;
    });

    for (const { suggestion, alreadyAdded } of sorted) {
      const cls = alreadyAdded ? "suggestion-item suggestion-added" : "suggestion-item";
      const itemEl = this.suggestionsEl.createEl("div", { cls });

      // Cover art
      if (suggestion.imageUrl) {
        const img = itemEl.createEl("img", {
          cls: "suggestion-cover",
          attr: { src: suggestion.imageUrl, alt: "" },
        });
        img.onerror = () => {
          img.remove();
          itemEl.insertBefore(this.createSuggestionPlaceholder(), itemEl.firstChild);
        };
      } else {
        itemEl.appendChild(this.createSuggestionPlaceholder());
      }

      // Info
      const infoEl = itemEl.createEl("div", { cls: "suggestion-info" });

      const titleRow = infoEl.createEl("div", { cls: "suggestion-title-row" });
      titleRow.createEl("span", { cls: "suggestion-title", text: suggestion.album });
      if (alreadyAdded) {
        titleRow.createEl("span", { cls: "suggestion-added-badge", text: "Added" });
      }

      infoEl.createEl("div", { cls: "suggestion-artist", text: suggestion.artist });

      const pct = Math.min(Math.round(suggestion.completeness * 100), 100);
      infoEl.createEl("div", {
        cls: "suggestion-stats",
        text: `${Math.min(suggestion.tracksPlayed, suggestion.totalTracks)}/${suggestion.totalTracks} tracks (${pct}%) \u00B7 ${suggestion.totalScrobbles} plays`,
      });

      const barEl = infoEl.createEl("div", { cls: "suggestion-progress-bar" });
      barEl.createEl("div", {
        cls: "suggestion-progress-fill",
        attr: { style: `width: ${pct}%` },
      });

      if (!alreadyAdded) {
        itemEl.addEventListener("click", () => {
          this.close();
          this.onSuggestionSelect?.(suggestion);
        });
      }
    }
  }

  private onSearchInput() {
    const artist = this.artistInput.value.trim();
    const album = this.albumInput.value.trim();

    // Clear any pending debounce
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Clear results if both fields are empty
    if (!artist && !album) {
      this.results = [];
      this.resultsEl.empty();
      this.resultsEl.style.display = "none";

      // Show suggestions again if loaded
      if (this.suggestionsLoaded) {
        this.suggestionsEl.style.display = "block";
        this.statusEl.style.display = "none";
      } else {
        this.statusEl.setText("Type to search...");
        this.statusEl.style.display = "block";
      }
      return;
    }

    // Hide suggestions, show search status
    this.suggestionsEl.style.display = "none";
    this.statusEl.setText("Searching...");
    this.statusEl.style.display = "block";

    // Debounce the search (300ms)
    this.debounceTimer = window.setTimeout(() => {
      this.performSearch(artist, album);
    }, 300);
  }

  private async performSearch(artist: string, album: string) {
    if (this.isSearching) {
      return;
    }

    this.isSearching = true;

    try {
      this.results = await this.searchFn(artist, album);
      this.renderResults();
    } catch (error) {
      console.error("Search error:", error);
      this.statusEl.setText("Search failed. Please try again.");
      this.statusEl.style.display = "block";
      this.resultsEl.empty();
      this.resultsEl.style.display = "none";
    } finally {
      this.isSearching = false;
    }
  }

  private renderResults() {
    this.resultsEl.empty();

    if (this.results.length === 0) {
      const artist = this.artistInput.value.trim();
      const album = this.albumInput.value.trim();
      if (artist || album) {
        this.statusEl.setText("No albums found. Try a different search.");
      }
      this.statusEl.style.display = "block";
      this.resultsEl.style.display = "none";
      return;
    }

    // Hide status, show results
    this.statusEl.style.display = "none";
    this.resultsEl.style.display = "block";

    for (const release of this.results) {
      const itemEl = this.resultsEl.createEl("div", { cls: "album-result-item" });

      // Cover art thumbnail
      if (release.coverArtUrl) {
        const img = itemEl.createEl("img", {
          cls: "album-cover-thumb",
          attr: { src: release.coverArtUrl, alt: "" },
        });
        img.onerror = () => {
          // Replace with placeholder on 404
          img.remove();
          itemEl.insertBefore(this.createPlaceholder(), itemEl.firstChild);
        };
      } else {
        itemEl.appendChild(this.createPlaceholder());
      }

      // Info container
      const infoEl = itemEl.createEl("div", { cls: "album-result-info" });

      infoEl.createEl("div", {
        cls: "album-result-title",
        text: release.title,
      });

      const details: string[] = [release.artist];
      if (release.year) {
        details.push(String(release.year));
      }
      if (release.country) {
        details.push(release.country);
      }
      if (release.label) {
        details.push(release.label);
      }

      infoEl.createEl("div", {
        cls: "album-result-details",
        text: details.join(" \u2022 "),
      });

      itemEl.addEventListener("click", () => {
        this.close();
        this.onSelect(release);
      });
    }
  }

  private createPlaceholder(): HTMLElement {
    const placeholder = document.createElement("div");
    placeholder.className = "album-cover-placeholder";
    placeholder.textContent = "\u266A";
    return placeholder;
  }

  private createSuggestionPlaceholder(): HTMLElement {
    const placeholder = document.createElement("div");
    placeholder.className = "suggestion-cover-placeholder";
    placeholder.textContent = "\u266A";
    return placeholder;
  }

  onClose() {
    // Clear any pending debounce timer
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }
    const { contentEl } = this;
    contentEl.empty();
  }
}
