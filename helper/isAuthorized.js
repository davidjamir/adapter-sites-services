function isAuthorized(req) {
  const REQUIRE_AUTH =
    String(process.env.REQUIRE_AUTH || "").toLowerCase() === "true";
  if (!REQUIRE_AUTH) return true;

  const SERVER_TOKEN_SECRET = process.env.SERVER_TOKEN_SECRET || "";
  if (!SERVER_TOKEN_SECRET) return false;

  const auth = req.headers["authorization"] || "";
  const token = auth.replace(/^Bearer\s+/i, "");

  return token && token === SERVER_TOKEN_SECRET;
}

module.exports = { isAuthorized };
