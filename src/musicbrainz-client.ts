import { requestUrl } from "obsidian";
import {
  MusicBrainzRelease,
  MusicBrainzSearchResponse,
  MusicBrainzReleaseRaw,
} from "./types";
import {
  MUSICBRAINZ_API_BASE,
  COVER_ART_ARCHIVE_BASE,
  USER_AGENT,
  RATE_LIMIT_MS,
} from "./constants";

export class MusicBrainzClient {
  private lastRequestTime = 0;

  private async rateLimitedRequest<T>(url: string): Promise<T> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < RATE_LIMIT_MS) {
      await this.delay(RATE_LIMIT_MS - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();

    const response = await requestUrl({
      url,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    return response.json as T;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async searchAlbums(query: string): Promise<MusicBrainzRelease[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    // Use general query with fuzzy matching
    // Adding ~ enables fuzzy search in MusicBrainz Lucene
    const fuzzyQuery = trimmed
      .split(/\s+/)
      .map((term) => `${this.escapeQuery(term)}~`)
      .join(" ");

    const url = `${MUSICBRAINZ_API_BASE}/release?query=${encodeURIComponent(fuzzyQuery)}&fmt=json&limit=15`;

    try {
      const response =
        await this.rateLimitedRequest<MusicBrainzSearchResponse>(url);
      return this.parseReleases(response.releases || []);
    } catch (error) {
      console.error("MusicBrainz search error:", error);
      throw new Error("Failed to search MusicBrainz. Please try again.");
    }
  }

  private escapeQuery(str: string): string {
    // Escape special Lucene query characters
    return str.replace(/[+\-&|!(){}[\]^"~*?:\\]/g, "\\$&");
  }

  private parseReleases(releases: MusicBrainzReleaseRaw[]): MusicBrainzRelease[] {
    return releases.map((release) => {
      const artistCredit = release["artist-credit"];
      const artist = artistCredit?.[0]?.name || "Unknown Artist";

      const labelInfo = release["label-info"];
      const label = labelInfo?.[0]?.label?.name;

      const releaseGroup = release["release-group"];
      const year = this.extractYear(release.date);

      return {
        id: release.id,
        releaseGroupId: releaseGroup?.id,
        title: release.title,
        artist,
        date: release.date || "",
        year,
        country: release.country,
        label,
        genres: [], // Genres fetched separately via fetchGenres()
        coverArtUrl: this.getCoverArtUrl(release.id),
      };
    });
  }

  async fetchGenres(releaseGroupId: string, maxGenres: number): Promise<string[]> {
    if (!releaseGroupId) {
      return [];
    }

    const url = `${MUSICBRAINZ_API_BASE}/release-group/${releaseGroupId}?inc=genres&fmt=json`;

    try {
      const response = await this.rateLimitedRequest<{ genres?: Array<{ name: string; count: number }> }>(url);
      const genres = response.genres || [];
      return genres
        .sort((a, b) => b.count - a.count)
        .slice(0, maxGenres)
        .map((g) => g.name.toLowerCase());
    } catch (error) {
      console.error("Failed to fetch genres:", error);
      return [];
    }
  }

  private extractYear(date?: string): number | null {
    if (!date) return null;
    const match = date.match(/^(\d{4})/);
    return match ? parseInt(match[1], 10) : null;
  }

  private getCoverArtUrl(mbid: string): string {
    return `${COVER_ART_ARCHIVE_BASE}/release/${mbid}/front-250`;
  }

  async checkCoverArtExists(mbid: string): Promise<boolean> {
    try {
      const url = `${COVER_ART_ARCHIVE_BASE}/release/${mbid}`;
      await requestUrl({
        url,
        headers: {
          "User-Agent": USER_AGENT,
        },
      });
      return true;
    } catch {
      return false;
    }
  }
}
