const domains = [
  "www.hotzxgirl.online",
];
module.exports = async (req, res) => {
  try {
    const SECRET = process.env.SERVER_TOKEN_SECRET;
    for (const domain of domains) {
      const response = await fetch(`https://feedcdn.hotzxgirl.online/${domain}/latest.json`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ok: true, count: 0, items: [] }),
      });
      console.log(response)
    }

    return res.status(200).json({
      ok: true,
      count: domains.length,
    });
  } catch (err) {
    console.log("[api/test] error: ", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Internal Server Error" });
  }
};
