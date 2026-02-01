import { App, PluginSettingTab, Setting } from "obsidian";
import AlbumFetcherPlugin from "./main";

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

    new Setting(containerEl)
      .setName("Album notes folder")
      .setDesc("Folder where album notes will be created")
      .addText((text) =>
        text
          .setPlaceholder("Music/Albums")
          .setValue(this.plugin.settings.folderPath)
          .onChange(async (value) => {
            this.plugin.settings.folderPath = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Use year-based folders")
      .setDesc("Organize albums into subfolders by year")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useYearFolders)
          .onChange(async (value) => {
            this.plugin.settings.useYearFolders = value;
            await this.plugin.saveSettings();
            this.display(); // Re-render to show/hide folder year mode
          })
      );

    if (this.plugin.settings.useYearFolders) {
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
  }
}
