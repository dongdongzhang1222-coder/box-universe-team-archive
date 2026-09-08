const SITE_ORIGINS = new Set([
  "https://dongdongzhang1222-coder.github.io",
  "http://127.0.0.1:8767",
  "http://localhost:8767",
  "null",
]);

function cors(origin) {
  const allowed = SITE_ORIGINS.has(origin)
    ? origin
    : "https://dongdongzhang1222-coder.github.io";

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors(origin),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      if (!SITE_ORIGINS.has(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (url.pathname === "/api/state" && request.method === "GET") {
      const counter = await env.DB.prepare(
        "SELECT count FROM counters WHERE id = ?",
      )
        .bind("box-universe")
        .first();
      const rows = await env.DB.prepare(
        "SELECT id, body, created_at FROM comments ORDER BY id DESC LIMIT 30",
      ).all();

      return json(
        {
          count: Number(counter?.count || 0),
          comments: (rows.results || []).reverse(),
        },
        200,
        origin,
      );
    }

    if (!SITE_ORIGINS.has(origin)) {
      return json({ error: "Origin not allowed" }, 403, origin);
    }

    if (url.pathname === "/api/like" && request.method === "POST") {
      await env.DB.prepare(
        "INSERT INTO counters (id, count) VALUES (?, 1) ON CONFLICT(id) DO UPDATE SET count = count + 1",
      )
        .bind("box-universe")
        .run();
      const counter = await env.DB.prepare(
        "SELECT count FROM counters WHERE id = ?",
      )
        .bind("box-universe")
        .first();

      return json({ count: Number(counter?.count || 0) }, 200, origin);
    }

    if (url.pathname === "/api/comments" && request.method === "POST") {
      let payload;
      try {
        payload = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400, origin);
      }

      const body = String(payload?.body || "").replace(/\s+/g, " ").trim();
      if (!body || body.length > 60) {
        return json({ error: "评论需为 1–60 个字符" }, 400, origin);
      }

      const saved = await env.DB.prepare(
        "INSERT INTO comments (body) VALUES (?) RETURNING id, body, created_at",
      )
        .bind(body)
        .first();

      return json({ comment: saved }, 201, origin);
    }

    return json(
      { service: "BOX UNIVERSE interactions", status: "ok" },
      200,
      origin,
    );
  },
};
