import { Notice, Plugin } from "obsidian";
import { AlbumStatus, PluginSettings, MusicBrainzRelease } from "./types";
import { DEFAULT_SETTINGS } from "./constants";
import { MusicBrainzClient } from "./musicbrainz-client";
import { SearchModal } from "./search-modal";
import { StatusModal } from "./status-modal";
import { RatingModal } from "./rating-modal";
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
    new SearchModal(
      this.app,
      (artist, album) => this.musicBrainzClient.searchAlbums(artist, album),
      (release) => this.showStatusModal(release)
    ).open();
  }

  private showStatusModal(release: MusicBrainzRelease) {
    new StatusModal(this.app, release.title, (status) => {
      if (status === 'done') {
        this.showRatingModal(release, status);
      } else {
        this.createNote(release, status, '');
      }
    }).open();
  }

  private showRatingModal(release: MusicBrainzRelease, status: AlbumStatus) {
    new RatingModal(this.app, release.title, async (rating) => {
      await this.createNote(release, status, rating);
    }).open();
  }

  private async createNote(release: MusicBrainzRelease, status: AlbumStatus, rating: string) {
    if (!this.noteGenerator) {
      new Notice("Plugin not properly initialized.");
      return;
    }

    try {
      new Notice("Fetching album details...");

      // Fetch genres from release-group API
      console.log("Release group ID:", release.releaseGroupId);
      if (release.releaseGroupId) {
        const genres = await this.musicBrainzClient.fetchGenres(
          release.releaseGroupId,
          this.settings.maxGenres
        );
        console.log("Fetched genres:", genres);
        release.genres = genres;
      } else {
        console.log("No release group ID, skipping genre fetch");
      }

      new Notice("Creating album note...");
      const filePath = await this.noteGenerator.createAlbumNote(release, status, rating);
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
