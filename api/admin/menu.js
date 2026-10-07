const API =
  process.env.MOCKAPI_URL ||
  'https://6ac401c0ae53bf25b80f317c.mockapi.io';

const crypto = require('crypto');

function secret() {
  return process.env.ADMIN_SECRET;
}

function session(req) {
  const raw = req.headers.cookie || '';
  const m = raw.match(/(?:^|;\s*)bamba_admin=([^;]+)/);

  if (!m) return null;

  try {
    const [body, sig] = decodeURIComponent(m[1]).split('.');

    const exp = crypto
      .createHmac('sha256', secret())
      .update(body)
      .digest('base64url');

    if (
      !sig ||
      sig.length !== exp.length ||
      !crypto.timingSafeEqual(
        Buffer.from(sig),
        Buffer.from(exp)
      )
    ) {
      return null;
    }

    const p = JSON.parse(
      Buffer.from(body, 'base64url').toString()
    );

    return p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  if (!process.env.ADMIN_SECRET) {
    return res.status(500).json({
      error: 'Admin environment is not configured'
    });
  }

  if (!session(req)) {
    return res.status(401).json({
      error: 'Unauthorized'
    });
  }

  const id = req.query?.id;

  const url = id
    ? `${API}/menu/${encodeURIComponent(id)}`
    : `${API}/menu`;

  try {
    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (
      req.method === 'POST' ||
      req.method === 'PUT' ||
      req.method === 'PATCH'
    ) {
      options.body = JSON.stringify(req.body || {});
    }

    const r = await fetch(url, options);
    const text = await r.text();

    if (!text.trim()) {
      return res.status(r.status).json([]);
    }

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: 'Invalid response from MockAPI'
      });
    }

    res.status(r.status).json(data);

  } catch (error) {
    console.error(error);

    res.status(502).json({
      error: 'API connection failed'
    });
  }
};
