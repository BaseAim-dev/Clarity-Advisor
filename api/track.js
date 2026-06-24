const crypto = require('crypto');

const PIXEL_ID = '1700395107938724';

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function normalizePhone(phone) {
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('0')) d = '61' + d.slice(1);
  else if (!d.startsWith('61')) d = '61' + d;
  return d;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const {
    event_name,
    event_id,
    email,
    phone,
    first_name,
    last_name,
    event_source_url,
    client_user_agent,
  } = req.body || {};

  const userData = {};
  if (email)                  userData.em = [sha256(email.trim().toLowerCase())];
  if (phone)                  userData.ph = [sha256(normalizePhone(phone))];
  if (first_name)             userData.fn = [sha256(first_name.trim().toLowerCase())];
  if (last_name?.trim())      userData.ln = [sha256(last_name.trim().toLowerCase())];
  if (client_user_agent)      userData.client_user_agent = client_user_agent;

  const ip = ((req.headers['x-forwarded-for'] || '').split(',')[0] || '').trim();
  if (ip) userData.client_ip_address = ip;

  const payload = {
    data: [{
      event_name:       event_name || 'Lead',
      event_time:       Math.floor(Date.now() / 1000),
      event_id:         event_id || '',
      action_source:    'website',
      event_source_url: event_source_url || 'https://book.clarityadvisor.au',
      user_data:        userData,
    }],
  };

  try {
    const r = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${process.env.META_CAPI_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const data = await r.json();
    return res.status(r.ok ? 200 : 400).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
