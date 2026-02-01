import { App, Modal } from "obsidian";
import { MusicBrainzRelease } from "./types";

export class ResultsModal extends Modal {
  private results: MusicBrainzRelease[];
  private onSelect: (release: MusicBrainzRelease) => void;

  constructor(
    app: App,
    results: MusicBrainzRelease[],
    onSelect: (release: MusicBrainzRelease) => void
  ) {
    super(app);
    this.results = results;
    this.onSelect = onSelect;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "Select Album" });

    if (this.results.length === 0) {
      contentEl.createEl("p", {
        text: "No albums found. Try a different search.",
      });
      return;
    }

    const listEl = contentEl.createEl("div", { cls: "album-results-list" });

    // Add some basic styling
    contentEl.createEl("style", {
      text: `
        .album-results-list {
          max-height: 400px;
          overflow-y: auto;
        }
        .album-result-item {
          padding: 10px;
          border-bottom: 1px solid var(--background-modifier-border);
          cursor: pointer;
        }
        .album-result-item:hover {
          background-color: var(--background-modifier-hover);
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

    for (const release of this.results) {
      const itemEl = listEl.createEl("div", { cls: "album-result-item" });

      itemEl.createEl("div", {
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

      itemEl.createEl("div", {
        cls: "album-result-details",
        text: details.join(" • "),
      });

      itemEl.addEventListener("click", () => {
        this.close();
        this.onSelect(release);
      });
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
