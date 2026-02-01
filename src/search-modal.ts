import { App, Modal, Setting } from "obsidian";

export class SearchModal extends Modal {
  private searchQuery = "";
  private onSubmit: (query: string) => void;

  constructor(app: App, onSubmit: (query: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "Search for Album" });

    new Setting(contentEl).setName("Search").addText((text) =>
      text
        .setPlaceholder("Artist, album, or both...")
        .onChange((value) => {
          this.searchQuery = value;
        })
        .inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            this.submitSearch();
          }
        })
    );

    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText("Search")
        .setCta()
        .onClick(() => {
          this.submitSearch();
        })
    );
  }

  private submitSearch() {
    if (!this.searchQuery.trim()) {
      return;
    }
    this.close();
    this.onSubmit(this.searchQuery);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
