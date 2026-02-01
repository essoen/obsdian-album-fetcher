import { Notice, Plugin } from "obsidian";
import { PluginSettings } from "./types";
import { DEFAULT_SETTINGS } from "./constants";
import { MusicBrainzClient } from "./musicbrainz-client";
import { SearchModal } from "./search-modal";
import { ResultsModal } from "./results-modal";
import { NoteGenerator } from "./note-generator";
import { AlbumFetcherSettingTab } from "./settings";

export default class AlbumFetcherPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  private musicBrainzClient: MusicBrainzClient = new MusicBrainzClient();
  private noteGenerator: NoteGenerator | null = null;

  async onload() {
    await this.loadSettings();

    this.noteGenerator = new NoteGenerator(this.app, this.settings);

    this.addCommand({
      id: "search-album",
      name: "Find album",
      callback: () => {
        this.openSearchModal();
      },
    });

    this.addSettingTab(new AlbumFetcherSettingTab(this.app, this));
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    if (this.noteGenerator) {
      this.noteGenerator.updateSettings(this.settings);
    }
  }

  private openSearchModal() {
    new SearchModal(this.app, async (query) => {
      await this.performSearch(query);
    }).open();
  }

  private async performSearch(query: string) {
    new Notice("Searching MusicBrainz...");

    try {
      const results = await this.musicBrainzClient.searchAlbums(query);

      if (results.length === 0) {
        new Notice("No albums found. Try a different search.");
        return;
      }

      new ResultsModal(this.app, results, async (release) => {
        await this.createNote(release);
      }).open();
    } catch (error) {
      console.error("Search error:", error);
      new Notice(
        error instanceof Error ? error.message : "Search failed. Please try again."
      );
    }
  }

  private async createNote(release: import("./types").MusicBrainzRelease) {
    if (!this.noteGenerator) {
      new Notice("Plugin not properly initialized.");
      return;
    }

    try {
      new Notice("Fetching album details...");

      // Fetch genres from release-group API
      if (release.releaseGroupId) {
        const genres = await this.musicBrainzClient.fetchGenres(
          release.releaseGroupId,
          this.settings.maxGenres
        );
        release.genres = genres;
      }

      new Notice("Creating album note...");
      const filePath = await this.noteGenerator.createAlbumNote(release);
      new Notice(`Created: ${filePath}`);

      // Open the created note
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (file) {
        await this.app.workspace.openLinkText(filePath, "", true);
      }
    } catch (error) {
      console.error("Note creation error:", error);
      new Notice(
        error instanceof Error
          ? error.message
          : "Failed to create note. Please try again."
      );
    }
  }
}
