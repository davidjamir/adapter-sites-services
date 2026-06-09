const { isAuthorized } = require("../helper/isAuthorized");
const { formatPubDate } = require("../helper/date");
const storageIndex = require("../src/storage-index");
const site = require("../src/site");
const {
  DEFAULT_DOMAIN_DEVELOPER,
  DEFAULT_MAX_STORAGE_DB,
} = require("../constants");

const NUMBER_SHARD_DATABASE_INDEX = Number(
  process.env.NUMBER_SHARD_DATABASE_INDEX,
);

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 B";
  if (!bytes || bytes < 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(decimals)} ${sizes[i]}`;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);

    const results = [];
    for (let index = 1; index <= NUMBER_SHARD_DATABASE_INDEX; index++) {
      const stats = await storageIndex.stats({ indexDatabaseKey: index });

      const payload = {
        db: stats.statsDb.db,
        collections: stats.statsDb.collections,
        objects: stats.statsDb.objects,
        avgObjSize: formatBytes(stats.statsDb.avgObjSize),
        storageSize: formatBytes(stats.statsDb.storageSize),
        storageMax: formatBytes(DEFAULT_MAX_STORAGE_DB),
        freeStorageSize: formatBytes(
          DEFAULT_MAX_STORAGE_DB - stats.statsDb.storageSize,
        ),
      };

      results.push({
        id: index,
        ...payload,
      });
    }

    return res.status(200).json({
      results,
    });
  } catch (err) {
    console.log("[api/stats-db-post-index] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
