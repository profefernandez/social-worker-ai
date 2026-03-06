const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

/**
 * Send a crisis notification email.
 * @param {string} to - Recipient email address.
 * @param {string} sessionId - Session ID for reference.
 * @param {string} summary - Short summary of the conversation.
 */
async function sendCrisisEmail(to, sessionId, summary) {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@60watts.ai',
    subject: `[CRISIS ALERT] Session ${sessionId} — Immediate Attention Required`,
    text: `A crisis has been detected in session ${sessionId}.\n\nSummary:\n${summary}\n\nPlease log in to the dashboard immediately.`,
    html: `
      <h2 style="color:#d9534f">⚠️ Crisis Alert</h2>
      <p>A crisis has been detected in session <strong>${sessionId}</strong>.</p>
      <h3>Summary</h3>
      <p>${summary}</p>
      <p>Please log in to the dashboard immediately to intervene.</p>
    `,
  };

  const response = await sgMail.send(msg);
  return response;
}

module.exports = { sendCrisisEmail };
