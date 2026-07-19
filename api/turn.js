export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Check for Metered.ca TURN credentials
  const METERED_API_KEY = process.env.METERED_API_KEY;
  if (METERED_API_KEY) {
    try {
      const response = await fetch(`https://watch2gather.metered.live/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`);
      if (response.ok) {
        const iceServers = await response.json();
        return res.status(200).json({ iceServers });
      }
    } catch (err) {
      console.error("Failed to fetch Metered.ca TURN credentials:", err);
    }
  }

  // 2. Check for Twilio TURN credentials
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    try {
      const basicAuth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Tokens.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
        }
      });
      if (response.ok) {
        const data = await response.json();
        return res.status(200).json({ iceServers: data.ice_servers });
      }
    } catch (err) {
      console.error("Failed to fetch Twilio TURN credentials:", err);
    }
  }

  // 3. Fallback: Return optimized public STUN servers
  return res.status(200).json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ]
  });
}
