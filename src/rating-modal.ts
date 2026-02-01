import { App, Modal } from "obsidian";

export const RATINGS = [
  { value: "Didn't like it", desc: "Ikke noe for meg." },
  { value: "It was ok", desc: "Helt greit, men ikke noe jeg noterer meg for gjenhør. Har kanskje gode spor. Kan godt hende albumet kan spilles i sosiale settinger" },
  { value: "Liked it", desc: "Bra, lytter gjerne gjennom flere ganger" },
  { value: "Really liked it", desc: "Skikkelig bra, ville nok kjøpt konsertbillett" },
  { value: "Loved it", desc: "YESS, life changing" },
];

export class RatingModal extends Modal {
  private albumTitle: string;
  private onSubmit: (rating: string) => void;

  constructor(app: App, albumTitle: string, onSubmit: (rating: string) => void) {
    super(app);
    this.albumTitle = albumTitle;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "Rate Album" });
    contentEl.createEl("p", {
      text: this.albumTitle,
      cls: "rating-album-title",
    });

    contentEl.createEl("style", {
      text: `
        .rating-album-title {
          font-style: italic;
          color: var(--text-muted);
          margin-bottom: 16px;
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
        }
      `,
    });

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
        this.onSubmit(rating.value);
      });
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
