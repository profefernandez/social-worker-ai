const twilio = require('twilio');

function getClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

/**
 * Send an SMS notification.
 * @param {string} to - Recipient phone number.
 * @param {string} body - Message body.
 */
async function sendSms(to, body) {
  const client = getClient();
  const message = await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
  return message.sid;
}

/**
 * Initiate a voice call with a TwiML message.
 * @param {string} to - Recipient phone number.
 * @param {string} messageText - Text to speak via TTS.
 */
async function makeCall(to, messageText) {
  const client = getClient();
  const twiml = `<Response><Say voice="alice">${messageText}</Say></Response>`;
  const call = await client.calls.create({
    twiml,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
  return call.sid;
}

module.exports = { sendSms, makeCall };
