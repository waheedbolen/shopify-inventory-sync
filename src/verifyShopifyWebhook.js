const crypto = require('crypto');
const config = require('./config');

function verifyShopifyWebhook(req, res, next) {
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');

  if (!hmacHeader) {
    console.warn('Webhook received without X-Shopify-Hmac-Sha256 header.');
    return res.status(401).send('Webhook HMAC validation failed: No HMAC header.');
  }

  // req.body is expected to be the raw Buffer here
  if (!req.body || typeof req.body.toString !== 'function') {
      console.error('Webhook verification error: req.body is not a Buffer or is missing.');
      return res.status(400).send('Webhook error: Invalid request body for HMAC calculation.');
  }

  const rawBody = req.body; // Assuming bodyParser.raw has populated this

  try {
    const generatedHash = crypto
      .createHmac('sha256', config.shopify.apiSecretKey)
      .update(rawBody, 'utf8') // Ensure rawBody is treated as utf8 string if it's a buffer from bodyParser.raw
      .digest('base64');

    if (crypto.timingSafeEqual(Buffer.from(generatedHash), Buffer.from(hmacHeader))) {
      // HMAC is valid
      // Try to parse the JSON body now that HMAC is verified
      // The rawBody is a Buffer from bodyParser.raw({ type: 'application/json' })
      try {
        req.body = JSON.parse(rawBody.toString('utf8'));
      } catch (e) {
        console.error('Webhook verification: Failed to parse JSON body after HMAC validation.', e);
        return res.status(400).send('Webhook error: Invalid JSON payload.');
      }
      next();
    } else {
      console.warn('Webhook HMAC validation failed: Hashes do not match.');
      console.log('Generated Hash:', generatedHash);
      console.log('Received HMAC Header:', hmacHeader);
      return res.status(401).send('Webhook HMAC validation failed: Hashes do not match.');
    }
  } catch (error) {
    console.error('Error during webhook HMAC validation:', error);
    return res.status(500).send('Internal server error during HMAC validation.');
  }
}

module.exports = verifyShopifyWebhook;
