import type { OsmTags } from "@osmix/shared/types";

const TAG_VALUE_MAX = 50;

export function shouldShowTag(key: string): boolean {
  if (key.includes("name:cs")) return true;
  if (key.includes("name:")) return false;
  return true;
}

export function shortenTagValue(value: string | number): string {
  const text = String(value);
  if (text.length <= TAG_VALUE_MAX) return text;
  return `${text.slice(0, TAG_VALUE_MAX - 1)}…`;
}

export function formatTags(tags: OsmTags | undefined): string {
  if (!tags) return "";
  return Object.entries(tags)
    .filter(([key]) => shouldShowTag(key))
    .map(([key, value]) => `${key}=${shortenTagValue(value)}`)
    .join("; ");
}
