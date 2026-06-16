import { requestUrl } from "obsidian";
import { LastFmScrobble, LastFmAlbumInfo, AlbumSuggestion } from "./types";
import { LASTFM_API_BASE, LASTFM_RATE_LIMIT_MS } from "./constants";

export class LastFmClient {
  private apiKey: string;
  private lastRequestTime = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async rateLimitedRequest<T>(url: string): Promise<T> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < LASTFM_RATE_LIMIT_MS) {
      await this.delay(LASTFM_RATE_LIMIT_MS - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();

    const response = await requestUrl({
      url,
      headers: {
        Accept: "application/json",
      },
    });

    return response.json as T;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildUrl(method: string, params: Record<string, string>): string {
    const searchParams = new URLSearchParams({
      method,
      api_key: this.apiKey,
      format: "json",
      ...params,
    });
    return `${LASTFM_API_BASE}?${searchParams.toString()}`;
  }

  async fetchRecentScrobbles(
    username: string,
    fromTimestamp: number
  ): Promise<LastFmScrobble[]> {
    const allScrobbles: LastFmScrobble[] = [];
    const maxPages = 10;

    for (let page = 1; page <= maxPages; page++) {
      const url = this.buildUrl("user.getRecentTracks", {
        user: username,
        from: String(Math.floor(fromTimestamp)),
        limit: "200",
        page: String(page),
      });

      const response = await this.rateLimitedRequest<LastFmRecentTracksResponse>(url);

      if (response.error) {
        throw new LastFmError(response.error, response.message || "Last.fm API error");
      }

      const tracks = response.recenttracks?.track || [];

      for (const track of tracks) {
        const albumName = track.album?.["#text"]?.trim();
        if (!albumName) continue;

        allScrobbles.push({
          artist: track.artist?.["#text"] || "Unknown Artist",
          album: albumName,
          track: track.name || "",
          timestamp: track.date?.uts ? parseInt(track.date.uts, 10) : Math.floor(Date.now() / 1000),
          albumMbid: track.album?.mbid || undefined,
        });
      }

      const totalPages = parseInt(response.recenttracks?.["@attr"]?.totalPages || "1", 10);
      if (page >= totalPages) break;
    }

    return allScrobbles;
  }

  async fetchAlbumInfo(artist: string, album: string): Promise<LastFmAlbumInfo | null> {
    const url = this.buildUrl("album.getInfo", {
      artist,
      album,
    });

    try {
      const response = await this.rateLimitedRequest<LastFmAlbumInfoResponse>(url);

      if (response.error || !response.album) {
        return null;
      }

      const albumData = response.album;
      const tracks = albumData.tracks?.track || [];
      const trackNames = Array.isArray(tracks)
        ? tracks.map((t) => t.name)
        : [tracks.name]; // Single-track albums return an object, not array

      const images = albumData.image || [];
      const imageUrl = images.find((i) => i.size === "extralarge")?.["#text"]
        || images.find((i) => i.size === "large")?.["#text"]
        || undefined;

      return {
        name: albumData.name,
        artist: albumData.artist,
        trackCount: trackNames.length,
        tracks: trackNames,
        imageUrl: imageUrl || undefined,
        mbid: albumData.mbid || undefined,
      };
    } catch {
      return null;
    }
  }

  async buildSuggestions(
    username: string,
    lookbackDays: number
  ): Promise<AlbumSuggestion[]> {
    const fromTimestamp = Date.now() / 1000 - lookbackDays * 86400;
    const scrobbles = await this.fetchRecentScrobbles(username, fromTimestamp);

    // Group scrobbles by artist+album
    const groups = new Map<string, {
      artist: string;
      album: string;
      tracks: Set<string>;
      totalScrobbles: number;
      lastPlayed: number;
      albumMbid?: string;
    }>();

    for (const scrobble of scrobbles) {
      const key = normalizeKey(scrobble.artist, scrobble.album);
      const group = groups.get(key);

      if (group) {
        group.tracks.add(scrobble.track.toLowerCase());
        group.totalScrobbles++;
        group.lastPlayed = Math.max(group.lastPlayed, scrobble.timestamp);
        if (!group.albumMbid && scrobble.albumMbid) {
          group.albumMbid = scrobble.albumMbid;
        }
      } else {
        groups.set(key, {
          artist: scrobble.artist,
          album: scrobble.album,
          tracks: new Set([scrobble.track.toLowerCase()]),
          totalScrobbles: 1,
          lastPlayed: scrobble.timestamp,
          albumMbid: scrobble.albumMbid,
        });
      }
    }

    // Filter out groups with < 3 unique tracks and sort by scrobble count
    const candidates = [...groups.values()]
      .filter((g) => g.tracks.size >= 3)
      .sort((a, b) => b.totalScrobbles - a.totalScrobbles)
      .slice(0, 30);

    // Fetch album info for each candidate to determine completeness
    const suggestions: AlbumSuggestion[] = [];

    for (const candidate of candidates) {
      const albumInfo = await this.fetchAlbumInfo(candidate.artist, candidate.album);

      if (!albumInfo || albumInfo.trackCount === 0) continue;

      const completeness = Math.min(candidate.tracks.size / albumInfo.trackCount, 1);

      suggestions.push({
        artist: candidate.artist,
        album: candidate.album,
        tracksPlayed: candidate.tracks.size,
        totalTracks: albumInfo.trackCount,
        completeness,
        totalScrobbles: candidate.totalScrobbles,
        lastPlayed: candidate.lastPlayed,
        imageUrl: albumInfo.imageUrl,
        albumMbid: candidate.albumMbid,
      });
    }

    // Sort by completeness desc, then scrobbles desc
    suggestions.sort((a, b) => {
      if (b.completeness !== a.completeness) return b.completeness - a.completeness;
      return b.totalScrobbles - a.totalScrobbles;
    });

    return suggestions;
  }
}

export function normalizeKey(artist: string, album: string): string {
  return `${normalizePart(artist)}:::${normalizePart(album)}`;
}

function normalizePart(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics (e.g. Monáe -> monae)
    .replace(/[^a-z0-9]+/g, " ") // collapse punctuation/whitespace (colon, dash, etc.)
    .trim();
}

class LastFmError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

// Last.fm API response types (internal)
interface LastFmRecentTracksResponse {
  error?: number;
  message?: string;
  recenttracks?: {
    track: Array<{
      artist?: { "#text": string; mbid?: string };
      name: string;
      album?: { "#text": string; mbid?: string };
      date?: { uts: string };
    }>;
    "@attr"?: { totalPages: string; page: string };
  };
}

interface LastFmAlbumInfoResponse {
  error?: number;
  message?: string;
  album?: {
    name: string;
    artist: string;
    mbid?: string;
    tracks?: {
      track: Array<{ name: string }> | { name: string };
    };
    image?: Array<{ "#text": string; size: string }>;
    listeners?: string;
    playcount?: string;
  };
}
