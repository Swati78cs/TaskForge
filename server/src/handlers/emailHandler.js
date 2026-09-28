const { Resend } = require('resend');
const env = require('../config/env');

/**
 * send_email handler
 * Payload: { to: string, subject: string, body?: string, html?: string }
 */
const sendEmailHandler = async (payload) => {
  const { to, subject, body, html } = payload;

  if (!to || !subject) {
    throw new Error('Email handler payload missing required fields: "to" or "subject"');
  }

  const apiKey = env.RESEND_API_KEY;

  // Development / sandbox mock mode if key is placeholder or in test environment
  if (!apiKey || apiKey.startsWith('re_123456789') || process.env.NODE_ENV === 'test') {
    console.log(`[EmailHandler:Mock] Sending email to: ${to} | Subject: "${subject}"`);
    return {
      status: 'SENT_MOCK',
      recipient: to,
      subject,
      messageId: `mock_msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
    };
  }

  const resend = new Resend(apiKey);
  const response = await resend.emails.send({
    from: env.EMAIL_FROM || 'TaskForge <onboarding@resend.dev>',
    to: [to],
    subject,
    text: body || subject,
    html: html || `<p>${body || subject}</p>`,
  });

  if (response.error) {
    throw new Error(`Resend API Error: ${response.error.message}`);
  }

  return {
    status: 'SENT',
    recipient: to,
    messageId: response.data ? response.data.id : 'resend_ok',
    timestamp: new Date().toISOString(),
  };
};

module.exports = sendEmailHandler;
