import { Notice, Plugin } from "obsidian";
import { AlbumStatus, PluginSettings, MusicBrainzRelease, AlbumSuggestion, SuggestionWithStatus } from "./types";
import { DEFAULT_SETTINGS } from "./constants";
import { MusicBrainzClient } from "./musicbrainz-client";
import { LastFmClient, normalizeKey } from "./lastfm-client";
import { SearchModal } from "./search-modal";
import { StatusModal } from "./status-modal";
import { RatingModal } from "./rating-modal";
import { SuggestionModal } from "./suggestion-modal";
import { NoteGenerator } from "./note-generator";
import { getExistingAlbums } from "./vault-scanner";
import { AlbumFetcherSettingTab } from "./settings";

export default class AlbumFetcherPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  private musicBrainzClient: MusicBrainzClient = new MusicBrainzClient();
  private lastFmClient: LastFmClient | null = null;
  private lastFmApiKeyUsed: string = '';
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

    this.addCommand({
      id: "suggest-albums",
      name: "Suggest albums from Last.fm",
      callback: () => {
        this.openSuggestions();
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
    const { lastfmApiKey, lastfmUsername } = this.settings;
    let suggestionsPromise: Promise<SuggestionWithStatus[]> | undefined;

    if (lastfmApiKey && lastfmUsername) {
      this.ensureLastFmClient();
      suggestionsPromise = this.fetchSuggestionsWithStatus();
    }

    new SearchModal(
      this.app,
      (artist, album) => this.musicBrainzClient.searchAlbums(artist, album),
      (release) => this.showStatusModal(release),
      suggestionsPromise,
      (suggestion) => this.bridgeToMusicBrainz(suggestion)
    ).open();
  }

  private showStatusModal(release: MusicBrainzRelease, source: string = 'manual') {
    new StatusModal(this.app, release.title, (status) => {
      if (status === 'done') {
        this.showRatingModal(release, status, source);
      } else {
        this.createNote(release, status, '', '', source);
      }
    }).open();
  }

  private showRatingModal(release: MusicBrainzRelease, status: AlbumStatus, source: string = 'manual') {
    new RatingModal(this.app, release, async (rating, note) => {
      await this.createNote(release, status, rating, note, source);
    }).open();
  }

  private ensureLastFmClient() {
    const { lastfmApiKey } = this.settings;
    if (!this.lastFmClient || this.lastFmApiKeyUsed !== lastfmApiKey) {
      this.lastFmClient = new LastFmClient(lastfmApiKey);
      this.lastFmApiKeyUsed = lastfmApiKey;
    }
  }

  private async fetchSuggestionsWithStatus(): Promise<SuggestionWithStatus[]> {
    if (!this.lastFmClient) return [];

    const allSuggestions = await this.lastFmClient.buildSuggestions(
      this.settings.lastfmUsername,
      this.settings.lastfmLookbackDays
    );

    const existingAlbums = getExistingAlbums(this.app, this.settings);
    const threshold = this.settings.lastfmCompletenessThreshold / 100;

    return allSuggestions
      .filter((s) => s.completeness >= threshold)
      .slice(0, this.settings.maxSuggestions)
      .map((suggestion) => ({
        suggestion,
        alreadyAdded: existingAlbums.has(normalizeKey(suggestion.artist, suggestion.album)),
      }));
  }

  private async openSuggestions() {
    const { lastfmApiKey, lastfmUsername } = this.settings;

    if (!lastfmApiKey || !lastfmUsername) {
      new Notice("Please configure Last.fm API key and username in settings.");
      return;
    }

    this.ensureLastFmClient();

    const modal = new SuggestionModal(
      this.app,
      this.settings.lastfmLookbackDays,
      (suggestion) => this.bridgeToMusicBrainz(suggestion)
    );
    modal.open();

    try {
      const suggestions = await this.fetchSuggestionsWithStatus();
      modal.setSuggestions(suggestions);
    } catch (error) {
      console.error("Last.fm suggestion error:", error);
      modal.close();
      new Notice(
        error instanceof Error
          ? error.message
          : "Failed to fetch Last.fm suggestions. Please try again."
      );
    }
  }

  private async bridgeToMusicBrainz(suggestion: AlbumSuggestion) {
    try {
      new Notice("Looking up album on MusicBrainz...");

      const results = await this.musicBrainzClient.searchAlbums(
        suggestion.artist,
        suggestion.album
      );

      let release: MusicBrainzRelease;

      if (results.length > 0) {
        // Find best match: prefer exact artist+title match
        const exactMatch = results.find(
          (r) =>
            r.artist.toLowerCase() === suggestion.artist.toLowerCase() &&
            r.title.toLowerCase() === suggestion.album.toLowerCase()
        );
        release = exactMatch || results[0];
      } else {
        // Fallback: create release from Last.fm data
        release = {
          id: suggestion.albumMbid || "",
          title: suggestion.album,
          artist: suggestion.artist,
          date: "",
          year: null,
          genres: [],
          coverArtUrl: suggestion.imageUrl,
        };
      }

      this.showStatusModal(release, 'lastfm');
    } catch (error) {
      console.error("MusicBrainz bridge error:", error);
      // Fallback to Last.fm data on MusicBrainz failure
      const release: MusicBrainzRelease = {
        id: suggestion.albumMbid || "",
        title: suggestion.album,
        artist: suggestion.artist,
        date: "",
        year: null,
        genres: [],
        coverArtUrl: suggestion.imageUrl,
      };
      this.showStatusModal(release, 'lastfm');
    }
  }

  private async createNote(release: MusicBrainzRelease, status: AlbumStatus, rating: string, userNote: string, source: string = 'manual') {
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
      const filePath = await this.noteGenerator.createAlbumNote(release, status, rating, userNote, source);
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
