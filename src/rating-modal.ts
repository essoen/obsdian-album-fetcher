import { App, Modal } from "obsidian";
import { MusicBrainzRelease } from "./types";

export const RATINGS = [
  { value: "Didn't like it", desc: "Ikke noe for meg." },
  { value: "It was ok", desc: "Helt greit, men ikke noe jeg noterer meg for gjenhør. Har kanskje gode spor. Kan godt hende albumet kan spilles i sosiale settinger" },
  { value: "Liked it", desc: "Bra, lytter gjerne gjennom flere ganger" },
  { value: "Really liked it", desc: "Skikkelig bra, ville nok kjøpt konsertbillett" },
  { value: "Loved it", desc: "YESS, life changing" },
];

export class RatingModal extends Modal {
  private release: MusicBrainzRelease;
  private onSubmit: (rating: string, note: string) => void;
  private notesTextarea: HTMLTextAreaElement;

  constructor(app: App, release: MusicBrainzRelease, onSubmit: (rating: string, note: string) => void) {
    super(app);
    this.release = release;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "Rate Album" });

    contentEl.createEl("style", {
      text: `
        .rating-album-header {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
          padding: 12px;
          background: var(--background-secondary);
          border-radius: 8px;
        }
        .rating-album-cover {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .rating-album-cover-placeholder {
          width: 80px;
          height: 80px;
          background: var(--background-modifier-border);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-size: 32px;
          flex-shrink: 0;
        }
        .rating-album-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
        }
        .rating-album-title {
          font-weight: bold;
          font-size: 1.1em;
          margin-bottom: 4px;
        }
        .rating-album-artist {
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        .rating-album-meta {
          font-size: 0.85em;
          color: var(--text-faint);
        }
        .rating-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 8px 0;
        }
        .rating-button {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 16px 20px;
          border: 1px solid var(--background-modifier-border);
          border-radius: 6px;
          background: var(--background-secondary);
          cursor: pointer;
          text-align: left;
          height: auto;
          min-height: fit-content;
          overflow: visible;
        }
        .rating-button:hover {
          background: var(--background-modifier-hover);
          border-color: var(--interactive-accent);
        }
        .rating-value {
          font-weight: bold;
          margin-bottom: 4px;
        }
        .rating-desc {
          font-size: 0.85em;
          color: var(--text-muted);
          word-wrap: break-word;
          white-space: normal;
          width: 100%;
        }
        .rating-notes-section {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--background-modifier-border);
        }
        .rating-notes-label {
          font-weight: bold;
          margin-bottom: 8px;
        }
        .rating-notes-textarea {
          width: 100%;
          min-height: 100px;
          padding: 10px;
          border: 1px solid var(--background-modifier-border);
          border-radius: 6px;
          background: var(--background-secondary);
          resize: vertical;
          font-family: inherit;
          font-size: 14px;
        }
        .rating-notes-textarea:focus {
          outline: none;
          border-color: var(--interactive-accent);
        }
      `,
    });

    // Album header with cover and metadata
    const headerEl = contentEl.createEl("div", { cls: "rating-album-header" });

    // Cover art
    if (this.release.coverArtUrl) {
      const img = headerEl.createEl("img", {
        cls: "rating-album-cover",
        attr: { src: this.release.coverArtUrl, alt: "" },
      });
      img.onerror = () => {
        img.remove();
        const placeholder = document.createElement("div");
        placeholder.className = "rating-album-cover-placeholder";
        placeholder.textContent = "♪";
        headerEl.insertBefore(placeholder, headerEl.firstChild);
      };
    } else {
      const placeholder = headerEl.createEl("div", { cls: "rating-album-cover-placeholder" });
      placeholder.textContent = "♪";
    }

    // Album info
    const infoEl = headerEl.createEl("div", { cls: "rating-album-info" });
    infoEl.createEl("div", { cls: "rating-album-title", text: this.release.title });
    infoEl.createEl("div", { cls: "rating-album-artist", text: this.release.artist });

    const metaParts: string[] = [];
    if (this.release.year) metaParts.push(String(this.release.year));
    if (this.release.label) metaParts.push(this.release.label);
    if (this.release.country) metaParts.push(this.release.country);
    if (metaParts.length > 0) {
      infoEl.createEl("div", { cls: "rating-album-meta", text: metaParts.join(" • ") });
    }

    const buttonsEl = contentEl.createEl("div", { cls: "rating-buttons" });

    for (const rating of RATINGS) {
      const buttonEl = buttonsEl.createEl("button", { cls: "rating-button" });

      buttonEl.createEl("div", {
        cls: "rating-value",
        text: rating.value,
      });

      buttonEl.createEl("div", {
        cls: "rating-desc",
        text: rating.desc,
      });

      buttonEl.addEventListener("click", () => {
        this.close();
        this.onSubmit(rating.value, this.notesTextarea.value.trim());
      });
    }

    // Notes section
    const notesSection = contentEl.createEl("div", { cls: "rating-notes-section" });
    notesSection.createEl("div", {
      cls: "rating-notes-label",
      text: "Notes (optional)",
    });
    this.notesTextarea = notesSection.createEl("textarea", {
      cls: "rating-notes-textarea",
      attr: {
        placeholder: "Add your thoughts about this album...",
      },
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
