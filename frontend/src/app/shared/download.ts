/** Saves a blob through a temporary object URL, revoked once the download has started. */
export function downloadBlob(blob: Blob, filename: string, doc: Document): void {
  const url = URL.createObjectURL(blob);
  const link = doc.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url));
}
