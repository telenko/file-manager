export function removePrefixIfExists(prefix: string, str: string): string {
  if (str.startsWith(prefix)) {
    return str.slice(prefix.length); // Remove the prefix from the string
  }
  return str; // Prefix doesn't exist, return the original string
}
