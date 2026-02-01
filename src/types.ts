export interface PluginSettings {
  folderPath: string;
  useYearFolders: boolean;
  folderYearMode: 'release' | 'current';
  filenameTemplate: string;
  defaultGenre: string;
  maxGenres: number;
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
