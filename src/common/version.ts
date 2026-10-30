function parseVersion(version: string): [number, number, number] | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());

  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : undefined;
}

export function isStableVersion(version: string): boolean {
  return parseVersion(version) !== undefined;
}

/** Returns a positive number when `a` is newer than `b`, `0` when either tag is not semver. */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);

  if (!left || !right) return 0;

  for (let index = 0; index < 3; index++) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }

  return 0;
}

export function isUpdateAvailable(current: string | undefined, latest: string | undefined): boolean {
  return Boolean(current && latest) && compareVersions(latest as string, current as string) > 0;
}
