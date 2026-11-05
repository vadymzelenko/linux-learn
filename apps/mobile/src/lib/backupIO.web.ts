/** Web (the computer): download the backup as a file / open one from disk. */
export async function saveBackupFile(name: string, json: string): Promise<'shared' | 'unavailable'> {
  if (typeof document === 'undefined') return 'unavailable';
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'shared';
}

export function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve(null);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/plain';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      f.text().then(resolve, () => resolve(null));
    };
    // cancel: no change event in some browsers; the promise just stays pending
    input.click();
  });
}
