const AUTHORS = [
  "John Smith",
  "Emma Johnson",
  "Michael Brown",
  "Sophia Davis",
  "Daniel Wilson",
  "Olivia Moore",
  "James Taylor",
  "Isabella Anderson",
  "William Thomas",
  "Mia Martinez",
];

export function genAuthor() {
  const index = Math.floor(Math.random() * AUTHORS.length);

  return AUTHORS[index];
}
