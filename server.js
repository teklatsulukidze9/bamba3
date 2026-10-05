const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;
const API =
  process.env.MOCKAPI_URL ||
  "https://6ac401c0ae53bf25b80f317c.mockapi.io";

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "bamba-admin-2026";
const SECRET =
  process.env.ADMIN_SECRET || "local-bamba-secret";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

function token(user) {
  const body = Buffer.from(
    JSON.stringify({
      user,
      exp: Date.now() + 8 * 60 * 60 * 1000,
    })
  ).toString("base64url");

  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(body)
    .digest("base64url");

  return `${body}.${sig}`;
}

function session(req) {
  const match = (req.headers.cookie || "").match(
    /(?:^|;\s*)bamba_admin=([^;]+)/
  );

  if (!match) return null;

  try {
    const [body, sig] = decodeURIComponent(match[1]).split(".");

    if (!body || !sig) return null;

    const expected = crypto
      .createHmac("sha256", SECRET)
      .update(body)
      .digest("base64url");

    if (
      sig.length !== expected.length ||
      !crypto.timingSafeEqual(
        Buffer.from(sig),
        Buffer.from(expected)
      )
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString()
    );

    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

function cookie(res, value, maxAge) {
  res.setHeader(
    "Set-Cookie",
    `bamba_admin=${encodeURIComponent(
      value
    )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
  );
}

function guard(req, res, next) {
  if (!session(req)) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }

  next();
}
app.get("/api/auth", (req, res) => {
  const s = session(req);

  res.json({
    authenticated: !!s,
    user: s?.user || null,
  });
});

app.post("/api/auth", (req, res) => {
  if (req.body?.logout) {
    cookie(res, "", 0);
    return res.json({ ok: true });
  }

  if (
    req.body?.username !== ADMIN_USER ||
    req.body?.password !== ADMIN_PASSWORD
  ) {
    return res.status(401).json({
      error: "არასწორი მომხმარებელი ან პაროლი",
    });
  }

  cookie(res, token(ADMIN_USER), 8 * 60 * 60);

  res.json({
    ok: true,
    user: ADMIN_USER,
  });
});
app.get("/api/menu", async (req, res) => {
  try {
    const response = await fetch(`${API}/menu`);

    if (!response.ok) {
      throw new Error("MockAPI error");
    }

    const data = await response.json();

    res.json(data);
  } catch {
    res.status(500).json({
      error: "Menu API unavailable",
    });
  }
});

app.post("/api/admin/menu", guard, async (req, res) => {
  try {
    const response = await fetch(`${API}/menu`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    res.status(response.status).json(data);
  } catch {
    res.status(500).json({
      error: "Unable to create menu item",
    });
  }
});

app.put("/api/admin/menu/:id", guard, async (req, res) => {
  try {
    const response = await fetch(
      `${API}/menu/${req.params.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      }
    );

    const data = await response.json();

    res.status(response.status).json(data);
  } catch {
    res.status(500).json({
      error: "Unable to update menu item",
    });
  }
});

app.delete("/api/admin/menu/:id", guard, async (req, res) => {
  try {
    const response = await fetch(
      `${API}/menu/${req.params.id}`,
      {
        method: "DELETE",
      }
    );

    const data = await response.json();

    res.status(response.status).json(data);
  } catch {
    res.status(500).json({
      error: "Unable to delete menu item",
    });
  }
});

app.get("/api/messages", guard, async (req, res) => {
  try {
    const response = await fetch(`${API}/messages`);
    const data = await response.json();

    res.status(response.status).json(data);
  } catch {
    res.status(500).json({
      error: "Unable to load messages",
    });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    const response = await fetch(`${API}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();

    res.status(response.status).json(data);
  } catch {
    res.status(500).json({
      error: "Unable to send message",
    });
  }
});
app.get("/admin.html", (req, res) => {
  if (!session(req)) {
    return res.redirect("/admin-login.html");
  }
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.listen(PORT, () => {
  console.log(`Bamba server running on port ${PORT}`);
});