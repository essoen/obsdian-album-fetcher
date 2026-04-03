import { App, TFolder, TFile } from "obsidian";
import { PluginSettings } from "./types";
import { normalizeKey } from "./lastfm-client";

export function getExistingAlbums(app: App, settings: PluginSettings): Set<string> {
  const existing = new Set<string>();
  const template = settings.filenameTemplate;

  // Collect all folder paths to scan
  const folderPaths = new Set<string>();
  for (const status of ['listening', 'done', 'to-listen'] as const) {
    folderPaths.add(settings.statuses[status].folderPath);
  }

  for (const folderPath of folderPaths) {
    const folder = app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) continue;

    const files = collectMarkdownFiles(folder);
    for (const file of files) {
      const parsed = parseFilename(file.basename, template);
      if (parsed) {
        existing.add(normalizeKey(parsed.artist, parsed.album));
      }
    }
  }

  return existing;
}

function collectMarkdownFiles(folder: TFolder): TFile[] {
  const files: TFile[] = [];

  for (const child of folder.children) {
    if (child instanceof TFile && child.extension === "md") {
      files.push(child);
    } else if (child instanceof TFolder) {
      files.push(...collectMarkdownFiles(child));
    }
  }

  return files;
}

function parseFilename(
  basename: string,
  template: string
): { artist: string; album: string } | null {
  // Build a regex from the template to extract artist and album
  // Escape regex special chars in template, then replace placeholders with capture groups
  let pattern = template
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace("\\{\\{artist\\}\\}", "(?<artist>.+)")
    .replace("\\{\\{album\\}\\}", "(?<album>.+)")
    .replace("\\{\\{year\\}\\}", "(?:\\d{4})?");

  try {
    const regex = new RegExp(`^${pattern}$`);
    const match = basename.match(regex);

    if (match?.groups?.artist && match?.groups?.album) {
      return {
        artist: match.groups.artist.trim(),
        album: match.groups.album.trim(),
      };
    }
  } catch {
    // If regex fails, fall back to simple split for default template
  }

  // Fallback: try splitting on " - " (default template pattern)
  const sepIndex = basename.indexOf(" - ");
  if (sepIndex > 0) {
    return {
      artist: basename.substring(0, sepIndex).trim(),
      album: basename.substring(sepIndex + 3).trim(),
    };
  }

  return null;
}
