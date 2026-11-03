import nodemailer from 'nodemailer';
import https from 'https';
import config from '@/config';
import { IFormEndpoint } from '@/models/form-endpoint';

// --- Email Helper ---
const transporter = nodemailer.createTransport({
  host: config.SMTP.HOST,
  port: config.SMTP.PORT,
  secure: config.SMTP.PORT === 465,
  auth: {
    user: config.SMTP.USER,
    pass: config.SMTP.PASS,
  },
});

export const sendEmailNotification = async (form: IFormEndpoint, submission: any) => {
  if (!form.notificationEmails || form.notificationEmails.length === 0) return;

  const name  = String(submission.data?.name  ?? 'N/A');
  const email = String(submission.data?.email ?? 'N/A');

  const subject = form.subjectTemplate
    .replace(/{{form_name}}/g, form.name)
    .replace(/{{name}}/g,  name)
    .replace(/{{email}}/g, email);

  const dataRows = Object.entries(submission.data as Record<string, unknown>)
    .map(([k, v]) => `<p><strong>${k}:</strong> ${v ?? 'N/A'}</p>`)
    .join('');

  const html = `
    <h2>New Submission on ${form.name}</h2>
    ${dataRows}
    <hr />
    <pre>${JSON.stringify(submission.data, null, 2)}</pre>
  `;

  try {
    await transporter.sendMail({
      from: `"${form.senderName}" <${config.SMTP.FROM}>`,
      to: form.notificationEmails.join(', '),
      replyTo: form.replyToHeader.replace(/{{email}}/g, submission.email),
      subject,
      html,
    });
  } catch (err) {
    console.error('Email notification failed:', err);
  }
};

// --- Webhook Helper ---
const callWebhook = (url: string, payload: any) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const parsedUrl = new URL(url);
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const req = https.request(options, (res) => {
      resolve(res.statusCode);
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(data);
    req.end();
  });
};

export const triggerIntegrations = async (form: IFormEndpoint, submission: any) => {
  const { integrations } = form;
  if (!integrations) return;

  const data = submission.data as Record<string, unknown>;

  const dataLines = Object.entries(data)
    .map(([k, v]) => `*${k}:* ${v ?? 'N/A'}`)
    .join('\n');

  const payload = {
    formName:     form.name,
    submissionId: String(submission._id),
    data,
    submittedAt:  submission.createdAt,
  };

  // Slack
  if (integrations.slack?.enabled && integrations.slack.webhookUrl) {
    try {
      await callWebhook(integrations.slack.webhookUrl, {
        text: `New Form Submission: ${form.name}\n${dataLines}`,
      });
    } catch (err) {
      console.error('Slack integration failed:', err);
    }
  }

  // Discord
  if (integrations.discord?.enabled && integrations.discord.webhookUrl) {
    try {
      const fields = Object.entries(data).map(([k, v]) => ({
        name:   k,
        value:  String(v ?? 'N/A'),
        inline: true,
      }));
      await callWebhook(integrations.discord.webhookUrl, {
        embeds: [{
          title:     `New Submission: ${form.name}`,
          color:     5814783,
          fields,
          timestamp: new Date().toISOString(),
        }],
      });
    } catch (err) {
      console.error('Discord integration failed:', err);
    }
  }

  // Webhooks
  if (integrations.webhooks?.enabled && integrations.webhooks.urls?.length > 0) {
    for (const url of integrations.webhooks.urls) {
      try {
        await callWebhook(url, payload);
      } catch (err) {
        console.error(`Webhook failed for ${url}:`, err);
      }
    }
  }

  // Telegram
  if (integrations.telegram?.enabled && integrations.telegram.botToken && integrations.telegram.chatId) {
    try {
      const tgUrl = `https://api.telegram.org/bot${integrations.telegram.botToken}/sendMessage`;
      await callWebhook(tgUrl, {
        chat_id:    integrations.telegram.chatId,
        text:       `New Form Submission: ${form.name}\n\n${dataLines}`,
        parse_mode: 'Markdown',
      });
    } catch (err) {
      console.error('Telegram integration failed:', err);
    }
  }

};
