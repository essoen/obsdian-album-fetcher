# Obsidian Album Fetcher Plugin

**Status: ✅ Implemented**

## Recent Changes

### v1.2 - Album Cover Previews
- **Cover art thumbnails**: Search results now display 50x50px album cover images
- **Graceful fallback**: Shows ♪ placeholder when cover art unavailable (404)
- **Flexbox layout**: Results use image + text layout with proper alignment

### v1.1 - Single Search + Improved Genres
- **Single search field**: Replaced separate artist/album inputs with one unified search field
- **Fuzzy matching**: Typos now work (e.g., "pink flyd wall" → The Wall)
- **Remote genre fetching**: Genres fetched from MusicBrainz release-group API when creating note
- **Lowercase genres**: All genres now lowercase (e.g., "rock" not "Rock")
- **Configurable max genres**: New setting to limit number of genres (1-10, default 3)

---

## To Verify

1. **Album cover previews** - Search results show album art thumbnails on the left
2. **Cover art fallback** - Obscure albums without art show ♪ placeholder
3. **Single search field** - Only one input field with placeholder "Artist, album, or both..."
4. **Fuzzy search works** - Try "beatles abbey" → Abbey Road, "pink flyd wall" → The Wall
5. **Genre fetching** - "Fetching album details..." notice appears before note creation
6. **Lowercase genres** - Genres in created notes are lowercase
7. **Max genres setting** - Slider appears in settings (1-10), limits genres in created notes
8. **Default genre fallback** - Works when MusicBrainz has no genre data

---

## Next Steps

- [ ] Add album tracklist to note body (fetch from MusicBrainz recordings)
- [ ] Add Spotify link integration
- [ ] Duplicate detection (warn if album note already exists)
- [ ] Batch import from file/clipboard

---

## Overview
An Obsidian plugin that searches for music albums via MusicBrainz API and creates markdown notes matching the format from the existing 1001 Albums sync plugin.

## Installation

1. Run `npm install` to install dependencies
2. Run `npm run build` to build the plugin
3. Copy `main.js` and `manifest.json` to your vault at `.obsidian/plugins/obsidian-album-fetcher/`
4. Enable the plugin in Obsidian Settings → Community Plugins

## Usage

1. Open Command Palette (Cmd/Ctrl + P)
2. Run "Album Fetcher: Find album"
3. Enter search query (artist, album, or both - fuzzy matching supported)
4. Select from search results
5. Note is created and opened automatically

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Album notes folder | Where album notes are saved | `Music/Albums` |
| Use year-based folders | Organize by release year | Off |
| Filename template | Note filename format | `{{artist}} - {{album}}` |
| Default genre | Fallback when no genre found | (empty) |
| Maximum genres | Limit genres fetched from MusicBrainz | 3 |

**Template variables:** `{{artist}}`, `{{album}}`, `{{year}}`

---

## File Structure

```
obsidian-album-fetcher/
├── manifest.json           # Plugin metadata
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript config
├── esbuild.config.mjs      # Build config
├── main.js                 # Built plugin output
└── src/
    ├── main.ts             # Plugin entry point, command registration
    ├── settings.ts         # Settings tab UI
    ├── types.ts            # TypeScript interfaces
    ├── constants.ts        # Default settings, API constants
    ├── musicbrainz-client.ts # MusicBrainz API client with rate limiting
    ├── search-modal.ts     # Search input modal
    ├── results-modal.ts    # Search results selection modal
    └── note-generator.ts   # Markdown file creation
```

---

## Frontmatter Format

Generated notes use this frontmatter (matching 1001 Albums format):

```yaml
---
Status: Done
Rating: []
Genre:
  - rock
  - progressive rock
Created time: 2025-02-01T12:00:00.000Z
modified: 2025-02-01T12:00:00.000Z
Release Year: 1979
Source for recommendation:
  - manual
tags:
  - media/music/album
---
```

**Key differences from 1001 Albums**:
- `Source for recommendation`: "manual" instead of "1001albumsgenerator"
- `Rating`: Empty array (user fills in later)
- `Created time`: Set to current timestamp

---

## Note Body Format

```markdown
# Album Title

**Artist:** Artist Name

![Album Cover](https://coverartarchive.org/release/{mbid}/front-250)

## Album Details

- **Year:** 1979
- **Label:** Columbia
- **Country:** US
- **Genres:** rock, progressive rock

## My Rating


## My Review

```

---

## Technical Details

### MusicBrainz API

**Search Releases** (fuzzy matching):
```
GET https://musicbrainz.org/ws/2/release?query=pink~ floyd~ wall~&fmt=json&limit=15
```
Each search term gets `~` suffix for Lucene fuzzy matching.

**Fetch Genres** (on album selection):
```
GET https://musicbrainz.org/ws/2/release-group/{id}?inc=genres&fmt=json
```

**Response fields used**:
- `releases[].id` - MBID for cover art lookup
- `releases[].release-group.id` - Used to fetch genres
- `releases[].title` - Album name
- `releases[].artist-credit[0].name` - Artist name
- `releases[].date` - Release date (YYYY or YYYY-MM-DD)
- `releases[].country` - Country code
- `releases[].label-info[0].label.name` - Record label
- `release-group.genres` - Genre tags (fetched separately)

### Cover Art Archive

```
GET https://coverartarchive.org/release/{mbid}/front-250
```

Returns 250px album artwork or 404 if unavailable.

### Rate Limiting

- User-Agent header: `ObsidianAlbumFetcher/1.0.0`
- 1.1 second delay between requests (MusicBrainz requires max 1 req/sec)

---

## External Ratings (Not Implemented)

**Pitchfork/AOTY: Skipped** - Both require scraping or Python-only libraries. No stable Node.js/TypeScript solutions exist.
- Pitchfork: Only scrapers or static datasets available
- AOTY: Python-only package, Cloudflare protection blocks scraping

MusicBrainz community ratings are included in genre data when available.

---

## Development

```bash
# Install dependencies
npm install

# Development mode (watches for changes)
npm run dev

# Production build
npm run build
```
