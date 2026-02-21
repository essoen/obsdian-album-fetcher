# obsidian-album-fetcher

Search for music albums via the [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API) and create formatted markdown notes in [Obsidian](https://obsidian.md). Generates frontmatter compatible with the 1001 Albums sync plugin.

## Features

- **Fuzzy search** — find albums by artist, title, or both with typo tolerance (`pink flyd wall` → The Wall)
- **Cover art previews** — search results display album art thumbnails from the [Cover Art Archive](https://coverartarchive.org/)
- **Genre tagging** — genres fetched from MusicBrainz release-group data, stored as lowercase YAML arrays
- **Status workflow** — tag albums as Listening, Done, or To Listen with configurable folders per status
- **Rating modal** — rate completed albums on a 5-point scale with optional personal notes
- **Year-based folders** — optionally organize completed albums into subfolders by release year or year added

## Usage

1. Open Command Palette (`Cmd/Ctrl + P`)
2. Run **Album Fetcher: Find album**
3. Enter artist and/or album name
4. Select a result → choose status → rate (if Done) → note is created and opened

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Status folders | Separate folder path per status (Listening, Done, To Listen) | `Music/Listening`, `Music/Done`, `Music/To Listen` |
| Year-based folders | Organize Done albums by year | On (by year added) |
| Filename template | `{{artist}}`, `{{album}}`, `{{year}}` | `{{artist}} - {{album}}` |
| Default genre | Fallback when MusicBrainz has no genre data | (empty) |
| Maximum genres | Limit genres fetched per album (1-10) | 3 |

## Development

### Setup

Requires Node.js.

```bash
git clone <repo-url> && cd obsidian-album-fetcher
npm install
npm run dev    # Watch mode
npm run build  # Production build
```

To install in Obsidian, copy `main.js` and `manifest.json` to your vault at `.obsidian/plugins/obsidian-album-fetcher/`, then enable in Settings → Community Plugins.

### Structure

```
src/
  main.ts               # Plugin entry point, command registration
  settings.ts           # Settings tab UI
  types.ts              # TypeScript interfaces
  constants.ts          # Default settings, API URLs, rate limit config
  musicbrainz-client.ts # MusicBrainz API client with 1.1s rate limiting
  search-modal.ts       # Fuzzy search modal with debounced live results
  status-modal.ts       # Listening / Done / To Listen picker
  rating-modal.ts       # 5-point rating selector with album info + notes
  note-generator.ts     # Markdown + YAML frontmatter file creation
```

### Architecture

```
Search Modal → MusicBrainz /release API (fuzzy search)
     ↓
Status Modal → select Listening / Done / To Listen
     ↓
Rating Modal → rate album + optional notes (Done only)
     ↓
Note Generator → fetch genres from /release-group API
     ↓
  .md file  → YAML frontmatter + album details + cover art
```

MusicBrainz requests are rate-limited to 1 req/sec via a shared `lastRequestTime` gate. Cover art URLs point to `coverartarchive.org/release/{mbid}/front-250`.
