const inProgress = new Set<string>();

export const ingestionProgress = {
  add(artistId: string): void {
    inProgress.add(artistId);
  },
  remove(artistId: string): void {
    inProgress.delete(artistId);
  },
  has(artistId: string): boolean {
    return inProgress.has(artistId);
  },
  getIds(): string[] {
    return Array.from(inProgress);
  },
  /** For tests: clears all in-progress state */
  _clearForTest(): void {
    inProgress.clear();
  },
};
