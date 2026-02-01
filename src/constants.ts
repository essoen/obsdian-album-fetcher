import { PluginSettings } from "./types";

export const DEFAULT_SETTINGS: PluginSettings = {
  folderPath: "Music/Albums",
  useYearFolders: false,
  folderYearMode: 'release',
  filenameTemplate: "{{artist}} - {{album}}",
  defaultGenre: "",
  maxGenres: 3,
};

export const MUSICBRAINZ_API_BASE = "https://musicbrainz.org/ws/2";
export const COVER_ART_ARCHIVE_BASE = "https://coverartarchive.org";

export const USER_AGENT = "ObsidianAlbumFetcher/1.0.0 (https://obsidian.md)";

export const RATE_LIMIT_MS = 1100; // Slightly over 1 second to be safe
