import { App, Modal } from "obsidian";
import { MusicBrainzRelease } from "./types";

export class SearchModal extends Modal {
  private artistInput: HTMLInputElement;
  private albumInput: HTMLInputElement;
  private resultsEl: HTMLDivElement;
  private statusEl: HTMLDivElement;
  private results: MusicBrainzRelease[] = [];
  private debounceTimer: number | null = null;
  private searchFn: (artist: string, album: string) => Promise<MusicBrainzRelease[]>;
  private onSelect: (release: MusicBrainzRelease) => void;
  private isSearching = false;

  constructor(
    app: App,
    searchFn: (artist: string, album: string) => Promise<MusicBrainzRelease[]>,
    onSelect: (release: MusicBrainzRelease) => void
  ) {
    super(app);
    this.searchFn = searchFn;
    this.onSelect = onSelect;
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
    this.statusEl.setText("Type to search...");

    // Results container
    this.resultsEl = contentEl.createEl("div", { cls: "album-results-list" });

    // Focus the artist input
    this.artistInput.focus();
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
      this.renderResults();
      this.statusEl.setText("Type to search...");
      this.statusEl.style.display = "block";
      return;
    }

    // Show searching state
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
      return;
    }

    // Hide status when we have results
    this.statusEl.style.display = "none";

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
        text: details.join(" • "),
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
    placeholder.textContent = "♪";
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
