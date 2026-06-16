import { App, PluginSettingTab, Setting } from "obsidian";
import AlbumFetcherPlugin from "./main";
import { AlbumStatus } from "./types";
import { STATUS_DISPLAY_NAMES } from "./constants";

export class AlbumFetcherSettingTab extends PluginSettingTab {
  plugin: AlbumFetcherPlugin;

  constructor(app: App, plugin: AlbumFetcherPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Album Fetcher Settings" });

    // Status folder settings
    containerEl.createEl("h3", { text: "Status Folders" });

    const statuses: AlbumStatus[] = ['listening', 'done', 'to-listen'];

    for (const status of statuses) {
      new Setting(containerEl)
        .setName(`${STATUS_DISPLAY_NAMES[status]} folder`)
        .setDesc(`Folder for albums with "${STATUS_DISPLAY_NAMES[status]}" status`)
        .addText((text) =>
          text
            .setPlaceholder(`Music/${STATUS_DISPLAY_NAMES[status]}`)
            .setValue(this.plugin.settings.statuses[status].folderPath)
            .onChange(async (value) => {
              this.plugin.settings.statuses[status].folderPath = value;
              await this.plugin.saveSettings();
            })
        );

      // Year folders toggle only for 'done' status
      if (status === 'done') {
        new Setting(containerEl)
          .setName("Use year-based folders for Done")
          .setDesc("Organize completed albums into subfolders by year")
          .addToggle((toggle) =>
            toggle
              .setValue(this.plugin.settings.statuses[status].useYearFolders)
              .onChange(async (value) => {
                this.plugin.settings.statuses[status].useYearFolders = value;
                await this.plugin.saveSettings();
                this.display(); // Re-render to show/hide folder year mode
              })
          );

        if (this.plugin.settings.statuses['done'].useYearFolders) {
          new Setting(containerEl)
            .setName("Folder year")
            .setDesc("Which year to use for folder organization")
            .addDropdown((dropdown) =>
              dropdown
                .addOption("release", "Album release year")
                .addOption("current", "Year added")
                .setValue(this.plugin.settings.folderYearMode)
                .onChange(async (value: 'release' | 'current') => {
                  this.plugin.settings.folderYearMode = value;
                  await this.plugin.saveSettings();
                })
            );
        }
      }
    }

    containerEl.createEl("h3", { text: "Other Settings" });

    new Setting(containerEl)
      .setName("Filename template")
      .setDesc(
        "Template for album note filenames. Available: {{artist}}, {{album}}, {{year}}"
      )
      .addText((text) =>
        text
          .setPlaceholder("{{artist}} - {{album}}")
          .setValue(this.plugin.settings.filenameTemplate)
          .onChange(async (value) => {
            this.plugin.settings.filenameTemplate = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Default genre")
      .setDesc(
        "Default genre to use when MusicBrainz has no genre info (leave empty for none)"
      )
      .addText((text) =>
        text
          .setPlaceholder("")
          .setValue(this.plugin.settings.defaultGenre)
          .onChange(async (value) => {
            this.plugin.settings.defaultGenre = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Maximum genres")
      .setDesc("Maximum number of genres to fetch from MusicBrainz (1-10)")
      .addSlider((slider) =>
        slider
          .setLimits(1, 10, 1)
          .setValue(this.plugin.settings.maxGenres)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.maxGenres = value;
            await this.plugin.saveSettings();
          })
      );

    // Last.fm Integration
    containerEl.createEl("h3", { text: "Last.fm Integration" });

    new Setting(containerEl)
      .setName("Last.fm API key")
      .setDesc("Get a free API key at https://www.last.fm/api/account/create")
      .addText((text) =>
        text
          .setPlaceholder("Enter your Last.fm API key")
          .setValue(this.plugin.settings.lastfmApiKey)
          .onChange(async (value) => {
            this.plugin.settings.lastfmApiKey = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Last.fm username")
      .setDesc("Your Last.fm username")
      .addText((text) =>
        text
          .setPlaceholder("Username")
          .setValue(this.plugin.settings.lastfmUsername)
          .onChange(async (value) => {
            this.plugin.settings.lastfmUsername = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Completeness threshold")
      .setDesc("Minimum % of tracks played to consider an album 'fully listened'")
      .addSlider((slider) =>
        slider
          .setLimits(50, 100, 5)
          .setValue(this.plugin.settings.lastfmCompletenessThreshold)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.lastfmCompletenessThreshold = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Maximum suggestions")
      .setDesc("Maximum number of albums to suggest from your listening history (3-20)")
      .addSlider((slider) =>
        slider
          .setLimits(3, 20, 1)
          .setValue(this.plugin.settings.maxSuggestions)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.maxSuggestions = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Listening history timeframe")
      .setDesc("How many days of Last.fm history to scan for suggestions (3-30)")
      .addSlider((slider) =>
        slider
          .setLimits(3, 30, 1)
          .setValue(this.plugin.settings.lastfmLookbackDays)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.lastfmLookbackDays = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
