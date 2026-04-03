export type AlbumStatus = 'listening' | 'done' | 'to-listen';

export interface StatusConfig {
  folderPath: string;
  useYearFolders: boolean;
}

export interface PluginSettings {
  statuses: Record<AlbumStatus, StatusConfig>;
  folderYearMode: 'release' | 'current';
  filenameTemplate: string;
  defaultGenre: string;
  maxGenres: number;
  lastfmApiKey: string;
  lastfmUsername: string;
  lastfmCompletenessThreshold: number;
}

export interface MusicBrainzRelease {
  id: string;
  releaseGroupId?: string;
  title: string;
  artist: string;
  date: string;
  year: number | null;
  country?: string;
  label?: string;
  genres: string[];
  coverArtUrl?: string;
}

export interface MusicBrainzSearchResponse {
  created: string;
  count: number;
  offset: number;
  releases: MusicBrainzReleaseRaw[];
}

export interface MusicBrainzReleaseRaw {
  id: string;
  score: number;
  title: string;
  status?: string;
  date?: string;
  country?: string;
  "artist-credit"?: ArtistCredit[];
  "label-info"?: LabelInfo[];
  "release-group"?: ReleaseGroup;
}

export interface ArtistCredit {
  name: string;
  artist: {
    id: string;
    name: string;
  };
}

export interface LabelInfo {
  label?: {
    id: string;
    name: string;
  };
}

export interface ReleaseGroup {
  id: string;
  "primary-type"?: string;
  genres?: Genre[];
}

export interface Genre {
  id: string;
  name: string;
  count: number;
}

export interface AlbumNote {
  title: string;
  artist: string;
  year: number | null;
  genres: string[];
  coverArtUrl?: string;
  label?: string;
  country?: string;
}

export interface LastFmScrobble {
  artist: string;
  album: string;
  track: string;
  timestamp: number;
  albumMbid?: string;
}

export interface LastFmAlbumInfo {
  name: string;
  artist: string;
  trackCount: number;
  tracks: string[];
  imageUrl?: string;
  mbid?: string;
}

export interface AlbumSuggestion {
  artist: string;
  album: string;
  tracksPlayed: number;
  totalTracks: number;
  completeness: number;
  totalScrobbles: number;
  lastPlayed: number;
  imageUrl?: string;
  albumMbid?: string;
}

export interface SuggestionWithStatus {
  suggestion: AlbumSuggestion;
  alreadyAdded: boolean;
}
