import { App, Modal } from "obsidian";
import { AlbumSuggestion, MusicBrainzRelease } from "./types";
import { RELEASE_LIST_STYLES, renderReleaseRow } from "./release-list";

/**
 * Shown when a Last.fm suggestion cannot be matched to a MusicBrainz release with
 * confidence. Picking the right release is what gets the note its genres, since
 * genres are looked up from the release's release-group.
 */
export class ReleasePickerModal extends Modal {
  private suggestion: AlbumSuggestion;
  private releases: MusicBrainzRelease[];
  private onSelect: (release: MusicBrainzRelease | null) => void;

  constructor(
    app: App,
    suggestion: AlbumSuggestion,
    releases: MusicBrainzRelease[],
    onSelect: (release: MusicBrainzRelease | null) => void
  ) {
    super(app);
    this.suggestion = suggestion;
    this.releases = releases;
    this.onSelect = onSelect;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "Which release is this?" });
    contentEl.createEl("p", {
      cls: "release-picker-subtitle",
      text: `No confident match for "${this.suggestion.artist} – ${this.suggestion.album}". Pick the right release so genres can be looked up.`,
    });

    contentEl.createEl("style", {
      text: `
        ${RELEASE_LIST_STYLES}
        .release-picker-subtitle {
          color: var(--text-muted);
          margin-top: -8px;
          margin-bottom: 12px;
          font-size: 0.9em;
        }
        .release-picker-fallback {
          padding: 10px;
          margin-top: 4px;
          color: var(--text-muted);
          cursor: pointer;
          text-align: center;
        }
        .release-picker-fallback:hover {
          background-color: var(--background-modifier-hover);
        }
      `,
    });

    const listEl = contentEl.createEl("div", { cls: "album-results-list" });

    for (const release of this.releases) {
      renderReleaseRow(listEl, release, () => this.resolve(release));
    }

    const fallbackEl = contentEl.createEl("div", {
      cls: "release-picker-fallback",
      text: "None of these — use Last.fm data instead",
    });
    fallbackEl.addEventListener("click", () => this.resolve(null));
  }

  private resolve(release: MusicBrainzRelease | null) {
    this.close();
    this.onSelect(release);
  }

  onClose() {
    // Dismissing without choosing (Esc / click-away) cancels: no note is created.
    const { contentEl } = this;
    contentEl.empty();
  }
}
