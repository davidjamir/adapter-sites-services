import crypto from "crypto";

export function generateHash(length = 5) {
  const time = Date.now().toString(36);
  const random = crypto.randomBytes(length).toString("hex");
  return `${time}${random}`;
}
