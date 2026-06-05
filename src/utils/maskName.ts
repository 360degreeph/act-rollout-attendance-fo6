export function maskName(name: string): string {
  if (!name) return '';
  return name.split(' ').map(word => {
    if (word.length <= 1) return word;
    if (word.length === 2) return word[0] + '*';
    if (word.length <= 4) return word.substring(0, 2) + '*'.repeat(word.length - 2);
    // For longer names, show first 2 and last 1, mask the rest
    return word.substring(0, 2) + '*'.repeat(word.length - 3) + word.substring(word.length - 1);
  }).join(' ');
}
