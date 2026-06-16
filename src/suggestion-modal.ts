import { App, Modal } from "obsidian";
import { AlbumSuggestion, SuggestionWithStatus } from "./types";

export class SuggestionModal extends Modal {
  private suggestions: SuggestionWithStatus[] | null = null;
  private lookbackDays: number;
  private onSelect: (suggestion: AlbumSuggestion) => void;
  private listEl: HTMLElement | null = null;

  constructor(
    app: App,
    lookbackDays: number,
    onSelect: (suggestion: AlbumSuggestion) => void
  ) {
    super(app);
    this.lookbackDays = lookbackDays;
    this.onSelect = onSelect;
  }

  setSuggestions(suggestions: SuggestionWithStatus[]) {
    this.suggestions = suggestions;
    this.renderList();
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "Album Suggestions" });
    contentEl.createEl("p", {
      text: `Based on your Last.fm listening (last ${this.lookbackDays} days)`,
      cls: "suggestion-subtitle",
    });

    contentEl.createEl("style", {
      text: `
        .suggestion-subtitle {
          color: var(--text-muted);
          margin-top: -8px;
          margin-bottom: 12px;
          font-size: 0.9em;
        }
        .suggestion-list {
          max-height: 400px;
          overflow-y: auto;
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
        .suggestion-empty {
          padding: 20px;
          text-align: center;
          color: var(--text-muted);
        }
        .suggestion-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 32px 20px;
          color: var(--text-muted);
        }
        .suggestion-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid var(--background-modifier-border);
          border-top-color: var(--interactive-accent);
          border-radius: 50%;
          animation: suggestion-spin 0.8s linear infinite;
        }
        @keyframes suggestion-spin {
          to { transform: rotate(360deg); }
        }
      `,
    });

    this.listEl = contentEl.createEl("div", { cls: "suggestion-list" });
    this.renderList();
  }

  private renderList() {
    const listEl = this.listEl;
    if (!listEl) return;
    listEl.empty();

    // suggestions === null means we're still fetching
    if (this.suggestions === null) {
      const loadingEl = listEl.createEl("div", { cls: "suggestion-loading" });
      loadingEl.createEl("div", { cls: "suggestion-spinner" });
      loadingEl.createEl("div", { text: "Fetching your listening history…" });
      return;
    }

    if (this.suggestions.length === 0) {
      listEl.createEl("div", {
        cls: "suggestion-empty",
        text: `No fully-listened albums found in the last ${this.lookbackDays} days.`,
      });
      return;
    }

    // Sort: non-added first, then added
    const sorted = [...this.suggestions].sort((a, b) => {
      if (a.alreadyAdded !== b.alreadyAdded) return a.alreadyAdded ? 1 : -1;
      return 0;
    });

    for (const { suggestion, alreadyAdded } of sorted) {
      const cls = alreadyAdded ? "suggestion-item suggestion-added" : "suggestion-item";
      const itemEl = listEl.createEl("div", { cls });

      // Cover art
      if (suggestion.imageUrl) {
        const img = itemEl.createEl("img", {
          cls: "suggestion-cover",
          attr: { src: suggestion.imageUrl, alt: "" },
        });
        img.onerror = () => {
          img.remove();
          itemEl.insertBefore(this.createPlaceholder(), itemEl.firstChild);
        };
      } else {
        itemEl.appendChild(this.createPlaceholder());
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

      // Progress bar
      const barEl = infoEl.createEl("div", { cls: "suggestion-progress-bar" });
      barEl.createEl("div", {
        cls: "suggestion-progress-fill",
        attr: { style: `width: ${pct}%` },
      });

      if (!alreadyAdded) {
        itemEl.addEventListener("click", () => {
          this.close();
          this.onSelect(suggestion);
        });
      }
    }
  }

  private createPlaceholder(): HTMLElement {
    const placeholder = document.createElement("div");
    placeholder.className = "suggestion-cover-placeholder";
    placeholder.textContent = "\u266A";
    return placeholder;
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
