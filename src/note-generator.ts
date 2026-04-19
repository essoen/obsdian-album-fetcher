import { App, TFolder, normalizePath } from "obsidian";
import { AlbumStatus, MusicBrainzRelease, PluginSettings } from "./types";
import { STATUS_DISPLAY_NAMES } from "./constants";

export class NoteGenerator {
  private app: App;
  private settings: PluginSettings;

  constructor(app: App, settings: PluginSettings) {
    this.app = app;
    this.settings = settings;
  }

  updateSettings(settings: PluginSettings) {
    this.settings = settings;
  }

  async createAlbumNote(release: MusicBrainzRelease, status: AlbumStatus, rating: string, userNote: string = '', source: string = 'manual'): Promise<string> {
    const folderPath = this.getFolderPath(release, status);
    await this.ensureFolderExists(folderPath);

    const filename = this.generateFilename(release);
    const filePath = normalizePath(`${folderPath}/${filename}.md`);

    const content = this.generateNoteContent(release, status, rating, userNote, source);

    const existingFile = this.app.vault.getAbstractFileByPath(filePath);
    if (existingFile) {
      // File already exists, generate a unique name
      const uniquePath = await this.getUniquePath(folderPath, filename);
      await this.app.vault.create(uniquePath, content);
      return uniquePath;
    }

    await this.app.vault.create(filePath, content);
    return filePath;
  }

  private getFolderPath(release: MusicBrainzRelease, status: AlbumStatus): string {
    const statusConfig = this.settings.statuses[status];
    let folderPath = statusConfig.folderPath;

    if (statusConfig.useYearFolders) {
      const year = this.settings.folderYearMode === 'current'
        ? new Date().getFullYear()
        : release.year;
      if (year) {
        folderPath = `${folderPath}/${year}`;
      }
    }

    return normalizePath(folderPath);
  }

  private async ensureFolderExists(folderPath: string): Promise<void> {
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (folder instanceof TFolder) {
      return;
    }

    // Create folder recursively
    const parts = folderPath.split("/");
    let currentPath = "";

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const existing = this.app.vault.getAbstractFileByPath(currentPath);
      if (!existing) {
        await this.app.vault.createFolder(currentPath);
      }
    }
  }

  private generateFilename(release: MusicBrainzRelease): string {
    let filename = this.settings.filenameTemplate
      .replace(/\{\{artist\}\}/g, release.artist)
      .replace(/\{\{album\}\}/g, release.title)
      .replace(/\{\{year\}\}/g, release.year?.toString() || "");

    // Sanitize filename
    filename = filename.replace(/[\\/:*?"<>|]/g, "-");
    filename = filename.replace(/\s+/g, " ").trim();

    return filename;
  }

  private async getUniquePath(
    folderPath: string,
    baseFilename: string
  ): Promise<string> {
    let counter = 1;
    let filePath = normalizePath(`${folderPath}/${baseFilename}.md`);

    while (this.app.vault.getAbstractFileByPath(filePath)) {
      filePath = normalizePath(`${folderPath}/${baseFilename} (${counter}).md`);
      counter++;
    }

    return filePath;
  }

  private generateNoteContent(release: MusicBrainzRelease, status: AlbumStatus, rating: string, userNote: string, source: string = 'manual'): string {
    const now = new Date().toISOString();
    const genres = this.getGenres(release);

    const frontmatter = this.generateFrontmatter(release, now, genres, status, rating, source);
    const body = this.generateBody(release, userNote);

    return `${frontmatter}\n${body}`;
  }

  private getGenres(release: MusicBrainzRelease): string[] {
    if (release.genres && release.genres.length > 0) {
      return release.genres;
    }
    if (this.settings.defaultGenre) {
      return [this.settings.defaultGenre];
    }
    return [];
  }

  private generateFrontmatter(
    release: MusicBrainzRelease,
    timestamp: string,
    genres: string[],
    status: AlbumStatus,
    rating: string,
    source: string = 'manual'
  ): string {
    const lines: string[] = ["---"];

    lines.push(`Status: ${STATUS_DISPLAY_NAMES[status]}`);
    if (rating) {
      lines.push(`Rating: "${rating}"`);
    } else {
      lines.push("Rating: []");
    }

    if (genres.length > 0) {
      lines.push("Genre:");
      for (const genre of genres) {
        lines.push(`  - ${genre}`);
      }
    } else {
      lines.push("Genre: []");
    }

    lines.push(`Created time: ${timestamp}`);
    lines.push(`modified: ${timestamp}`);

    if (release.year) {
      lines.push(`Release Year: ${release.year}`);
    } else {
      lines.push("Release Year:");
    }

    lines.push("Source for recommendation:");
    lines.push(`  - ${source}`);

    lines.push("tags:");
    lines.push("  - media/music/album");

    lines.push("---");

    return lines.join("\n");
  }

  private generateBody(release: MusicBrainzRelease, userNote: string = ''): string {
    const lines: string[] = [];

    lines.push(`# ${release.title}`);
    lines.push("");
    lines.push(`**Artist:** ${release.artist}`);
    lines.push("");

    // Add cover art if available
    if (release.coverArtUrl) {
      lines.push(`![Album Cover](${release.coverArtUrl})`);
      lines.push("");
    }

    lines.push("## Album Details");
    lines.push("");

    if (release.year) {
      lines.push(`- **Year:** ${release.year}`);
    }
    if (release.label) {
      lines.push(`- **Label:** ${release.label}`);
    }
    if (release.country) {
      lines.push(`- **Country:** ${release.country}`);
    }
    if (release.genres && release.genres.length > 0) {
      lines.push(`- **Genres:** ${release.genres.join(", ")}`);
    }

    lines.push("");

    // Add user notes if provided
    if (userNote) {
      lines.push("## Notes");
      lines.push("");
      lines.push(userNote);
      lines.push("");
    }

    return lines.join("\n");
  }
}
