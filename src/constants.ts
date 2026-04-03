import { AlbumStatus, PluginSettings } from "./types";

export const DEFAULT_SETTINGS: PluginSettings = {
  statuses: {
    'listening': { folderPath: 'Music/Listening', useYearFolders: false },
    'done': { folderPath: 'Music/Done', useYearFolders: true },
    'to-listen': { folderPath: 'Music/To Listen', useYearFolders: false },
  },
  folderYearMode: 'current',
  filenameTemplate: "{{artist}} - {{album}}",
  defaultGenre: "",
  maxGenres: 3,
  lastfmApiKey: "",
  lastfmUsername: "",
  lastfmCompletenessThreshold: 80,
};

export const STATUS_DISPLAY_NAMES: Record<AlbumStatus, string> = {
  'listening': 'Listening',
  'done': 'Done',
  'to-listen': 'To Listen',
};

export const MUSICBRAINZ_API_BASE = "https://musicbrainz.org/ws/2";
export const COVER_ART_ARCHIVE_BASE = "https://coverartarchive.org";

export const USER_AGENT = "ObsidianAlbumFetcher/1.0.0 (https://obsidian.md)";

export const RATE_LIMIT_MS = 1100; // Slightly over 1 second to be safe

export const LASTFM_API_BASE = "https://ws.audioscrobbler.com/2.0";
export const LASTFM_RATE_LIMIT_MS = 200;
export const DEFAULT_COMPLETENESS_THRESHOLD = 80;
export const SUGGESTION_LOOKBACK_DAYS = 14;
