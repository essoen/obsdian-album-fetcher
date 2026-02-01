import { App, Modal } from "obsidian";
import { AlbumStatus } from "./types";
import { STATUS_DISPLAY_NAMES } from "./constants";

const STATUS_DESCRIPTIONS: Record<AlbumStatus, string> = {
  'listening': 'Currently listening to this album',
  'done': 'Finished listening, ready to rate',
  'to-listen': 'Add to listening queue',
};

export class StatusModal extends Modal {
  private albumTitle: string;
  private onSelect: (status: AlbumStatus) => void;

  constructor(app: App, albumTitle: string, onSelect: (status: AlbumStatus) => void) {
    super(app);
    this.albumTitle = albumTitle;
    this.onSelect = onSelect;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "Select Status" });
    contentEl.createEl("p", {
      text: this.albumTitle,
      cls: "status-album-title",
    });

    contentEl.createEl("style", {
      text: `
        .status-album-title {
          font-style: italic;
          color: var(--text-muted);
          margin-bottom: 16px;
        }
        .status-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 8px 0;
        }
        .status-button {
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
        .status-button:hover {
          background: var(--background-modifier-hover);
          border-color: var(--interactive-accent);
        }
        .status-name {
          font-weight: bold;
          margin-bottom: 4px;
        }
        .status-desc {
          font-size: 0.85em;
          color: var(--text-muted);
        }
      `,
    });

    const buttonsEl = contentEl.createEl("div", { cls: "status-buttons" });

    const statuses: AlbumStatus[] = ['listening', 'done', 'to-listen'];

    for (const status of statuses) {
      const buttonEl = buttonsEl.createEl("button", { cls: "status-button" });

      buttonEl.createEl("div", {
        cls: "status-name",
        text: STATUS_DISPLAY_NAMES[status],
      });

      buttonEl.createEl("div", {
        cls: "status-desc",
        text: STATUS_DESCRIPTIONS[status],
      });

      buttonEl.addEventListener("click", () => {
        this.close();
        this.onSelect(status);
      });
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
