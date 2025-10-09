/* Probe GET /api/stocks error by running equivalent SQL directly */
const { Client } = require('pg');

async function main() {
  const base = 'https://finora-backend-qwg4.vercel.app/api';
  const email = `probe${Date.now()}@finora.test`;
  const password = 'Test1234!';

  const fetchJson = async (url, opts) => {
    const r = await fetch(url, opts);
    let j = null;
    try { j = await r.json(); } catch (e) {}
    return { status: r.status, ok: r.ok, j };
  };

  // Register and add one stock
  const reg = await fetchJson(base + '/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName: 'Probe', lastName: 'User' })
  });
  const token = reg.j?.data?.tokens?.accessToken;
  const payload = token ? JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8')) : null;
  const userId = payload?.id || payload?.userId || payload?.sub;
  if (!userId) { console.error('No user id'); process.exit(1); }

  await fetchJson(base + '/stocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ symbol: 'AAPL', cutoffPrice: 100, targetPrice: 100 })
  });

  const connStr = process.env.DATABASE_URL;
  if (!connStr) { console.error('No DATABASE_URL'); process.exit(1); }

  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const sql = `
  SELECT us.*, s.symbol, s.name, s.exchange, s.sector, s.industry,
         sp.price AS current_price,
         sp.change AS price_change,
         sp.change_percent AS price_change_percent,
         ra.percent_above_52w_low,
         ra.percent_above_24w_low,
         ra.percent_above_12w_low,
         ra.volatility,
         ra.trend_direction
    FROM user_stocks us
    LEFT JOIN stocks s ON us.stock_id = s.id
    LEFT JOIN stock_prices sp ON sp.stock_id = us.stock_id AND sp.is_latest = true
    LEFT JOIN rolling_analysis ra ON ra.stock_id = us.stock_id
   WHERE us.user_id = $1 AND us.is_active = true
   ORDER BY us.added_at DESC;
  `;

  try {
    const r = await client.query(sql, [userId]);
    console.log('SQL rows:', r.rowCount);
  } catch (e) {
    console.error('SQL error:', e.message);
  } finally {
    await client.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });

