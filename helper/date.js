export function formatPubDate(dateString) {
  return new Date(dateString).toUTCString().replace("GMT", "+0000");
}

export function formatNewYorkDate(dateString) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));

  return `${formatted} • New York`;
}
