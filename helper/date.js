export function formatPubDate(dateString) {
  return new Date(dateString).toUTCString().replace("GMT", "+0000");
}
