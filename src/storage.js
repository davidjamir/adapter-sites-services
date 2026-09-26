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

async function saveImage(payload) {
  const res = await fetch(process.env.ENDPOINT_IMAGE_STORAGE_GENERATOR, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SECRET_IMAGE_STORAGE_GENERATOR}`,
    },
    body: JSON.stringify(payload),
  });

  return res.json();
}
const storage = { insert, saveImage };

module.exports = storage;
