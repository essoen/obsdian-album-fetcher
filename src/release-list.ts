import { MusicBrainzRelease } from "./types";

// Shared styles for any list of MusicBrainz releases. Injected by each modal that
// renders release rows, so the search results and the picker stay identical.
export const RELEASE_LIST_STYLES = `
  .album-results-list {
    max-height: 400px;
    overflow-y: auto;
  }
  .album-result-item {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid var(--background-modifier-border);
    cursor: pointer;
  }
  .album-result-item:hover {
    background-color: var(--background-modifier-hover);
  }
  .album-cover-thumb {
    width: 50px;
    height: 50px;
    object-fit: cover;
    border-radius: 4px;
    background: var(--background-secondary);
    flex-shrink: 0;
  }
  .album-cover-placeholder {
    width: 50px;
    height: 50px;
    background: var(--background-secondary);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 20px;
    flex-shrink: 0;
  }
  .album-result-info {
    flex: 1;
    min-width: 0;
  }
  .album-result-title {
    font-weight: bold;
    margin-bottom: 4px;
  }
  .album-result-details {
    font-size: 0.9em;
    color: var(--text-muted);
  }
`;

export function renderReleaseRow(
  container: HTMLElement,
  release: MusicBrainzRelease,
  onClick: () => void
): HTMLElement {
  const itemEl = container.createEl("div", { cls: "album-result-item" });

  // Cover art thumbnail
  if (release.coverArtUrl) {
    const img = itemEl.createEl("img", {
      cls: "album-cover-thumb",
      attr: { src: release.coverArtUrl, alt: "" },
    });
    img.onerror = () => {
      // Replace with placeholder on 404
      img.remove();
      itemEl.insertBefore(createCoverPlaceholder(), itemEl.firstChild);
    };
  } else {
    itemEl.appendChild(createCoverPlaceholder());
  }

  // Info container
  const infoEl = itemEl.createEl("div", { cls: "album-result-info" });

  infoEl.createEl("div", {
    cls: "album-result-title",
    text: release.title,
  });

  const details: string[] = [release.artist];
  if (release.year) {
    details.push(String(release.year));
  }
  if (release.country) {
    details.push(release.country);
  }
  if (release.label) {
    details.push(release.label);
  }

  infoEl.createEl("div", {
    cls: "album-result-details",
    text: details.join(" \u2022 "),
  });

  itemEl.addEventListener("click", onClick);

  return itemEl;
}

export function createCoverPlaceholder(): HTMLElement {
  const placeholder = document.createElement("div");
  placeholder.className = "album-cover-placeholder";
  placeholder.textContent = "\u266A";
  return placeholder;
}
