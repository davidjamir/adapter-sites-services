const { genPostSlug } = require("../helper/genPostSlug");

async function uploadR2Storage(endpoint, payload) {
  const res = await fetch(
    `${endpoint}/${payload.origin}/${payload.domain}/${payload.slug}.json`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SECRET_STORAGE_GENERAL_R2}`,
      },
      body: JSON.stringify(payload),
    },
  );

  return res.json();
}

async function insert(endpoint, payload) {
  return uploadR2Storage(endpoint, payload);
}

const storage = { insert };

module.exports = storage;
