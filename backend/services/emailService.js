import nodemailer from "nodemailer";

/**
 * Creates and caches the Nodemailer transporter.
 * If SMTP credentials exist in process.env, uses real SMTP (Gmail, Brevo, SendGrid, etc.).
 * If no credentials exist, automatically initializes an Ethereal test account with preview URLs.
 */
let cachedTransporter = null;

async function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const isRealSmtpConfigured = Boolean(
    process.env.SMTP_USER && process.env.SMTP_PASS
  );

  if (isRealSmtpConfigured) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log(`📧 Mailer initialized with real SMTP (${process.env.SMTP_USER})`);
  } else {
    // Development fallback using Ethereal
    try {
      const testAccount = await nodemailer.createTestAccount();
      cachedTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log("ℹ️ Mailer running in preview mode via Ethereal (no SMTP_USER configured).");
    } catch (err) {
      console.warn("⚠️ Could not initialize Ethereal test mailer:", err.message);
      return null;
    }
  }

  return cachedTransporter;
}

/**
 * Helper to build styled executive email HTML
 */
function buildEmailTemplate({
  type, // "DEBIT" | "CREDIT"
  title,
  amount,
  details,
  balance,
}) {
  const isDebit = type === "DEBIT";
  const badgeColor = isDebit ? "#ef4444" : "#10b981";
  const badgeText = isDebit ? "DEBIT ADVICE" : "CREDIT ALERT";
  const accentColor = isDebit ? "#f43f5e" : "#06b6d4";

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #020617; padding: 40px 20px;">
      <tr>
        <td align="center">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
            
            <!-- Header Banner -->
            <tr>
              <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border-bottom: 1px solid #1e293b;">
                <div style="display: inline-block; padding: 6px 16px; border-radius: 9999px; background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.3); margin-bottom: 12px;">
                  <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: #22d3ee;">NovaPay Financial HQ</span>
                </div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff;">${title}</h1>
              </td>
            </tr>

            <!-- Amount Section -->
            <tr>
              <td style="padding: 32px 32px 20px; text-align: center;">
                <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: ${badgeColor}; background: ${isDebit ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)"}; border: 1px solid ${badgeColor}40;">
                  ${badgeText}
                </span>
                <div style="margin-top: 14px; font-size: 40px; font-weight: 900; color: #ffffff; letter-spacing: -0.02em;">
                  ${isDebit ? "-" : "+"}₹${Number(amount).toLocaleString("en-IN")}
                </div>
                <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">
                  Status: <strong style="color: #10b981;">Settled Successfully</strong>
                </p>
              </td>
            </tr>

            <!-- Details Table -->
            <tr>
              <td style="padding: 0 32px 24px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #020617; border: 1px solid #1e293b; border-radius: 16px; padding: 16px;">
                  ${details
                    .map(
                      (row) => `
                    <tr>
                      <td style="padding: 8px 12px; font-size: 12px; color: #64748b; font-weight: 500;">${row.label}</td>
                      <td align="right" style="padding: 8px 12px; font-size: 13px; color: #f1f5f9; font-weight: 600;">${row.value}</td>
                    </tr>
                  `
                    )
                    .join("")}
                  ${
                    balance !== undefined
                      ? `
                    <tr style="border-top: 1px solid #1e293b;">
                      <td style="padding: 12px 12px 6px; font-size: 12px; color: #94a3b8; font-weight: 600;">Available Balance</td>
                      <td align="right" style="padding: 12px 12px 6px; font-size: 14px; color: #38bdf8; font-weight: 800;">₹${Number(
                        balance
                      ).toLocaleString("en-IN")}</td>
                    </tr>
                  `
                      : ""
                  }
                </table>
              </td>
            </tr>

            <!-- Footer & Security -->
            <tr>
              <td style="padding: 24px 32px 32px; background-color: #020617; border-top: 1px solid #1e293b; text-align: center;">
                <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.6;">
                  🔒 256-Bit Encrypted Transaction Notification.<br>
                  If you did not authorize this activity, please freeze your card via your NovaPay Dashboard immediately.
                </p>
                <p style="margin: 16px 0 0; font-size: 10px; color: #475569;">
                  © ${new Date().getFullYear()} NovaPay Banking Inc. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

/**
 * Sends a Debit Alert email to the sender
 */
export async function sendDebitNotification({
  senderEmail,
  senderName,
  receiverEmail,
  amount,
  balance,
  transactionId,
}) {
  try {
    const transporter = await getTransporter();
    if (!transporter) return;

    const formattedDate = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"NovaPay Bank" <${process.env.SMTP_USER || "no-reply@novapay.bank"}>`,
      to: senderEmail,
      subject: `Debit Alert: ₹${Number(amount).toLocaleString("en-IN")} sent to ${receiverEmail}`,
      html: buildEmailTemplate({
        type: "DEBIT",
        title: "Money Sent Successfully",
        amount,
        balance,
        details: [
          { label: "Beneficiary", value: receiverEmail },
          { label: "Reference ID", value: `NP-${transactionId || Date.now().toString().slice(-8)}` },
          { label: "Timestamp", value: formattedDate },
          { label: "Payment Channel", value: "P2P Instant Transfer" },
        ],
      }),
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 [Ethereal Preview] Sender Debit Advice: ${previewUrl}`);
    } else {
      console.log(`✅ Real Debit Notification sent to ${senderEmail}`);
    }
  } catch (err) {
    console.warn("⚠️ Failed to send debit email notification:", err.message);
  }
}

/**
 * Sends a Credit Alert email to the recipient
 */
export async function sendCreditNotification({
  receiverEmail,
  receiverName,
  senderName,
  senderEmail,
  amount,
  balance,
  transactionId,
}) {
  try {
    const transporter = await getTransporter();
    if (!transporter) return;

    const formattedDate = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"NovaPay Bank" <${process.env.SMTP_USER || "no-reply@novapay.bank"}>`,
      to: receiverEmail,
      subject: `Credit Alert: ₹${Number(amount).toLocaleString("en-IN")} received from ${senderName || senderEmail}`,
      html: buildEmailTemplate({
        type: "CREDIT",
        title: "Funds Credited to Account",
        amount,
        balance,
        details: [
          { label: "Sender", value: `${senderName || "NovaPay User"} (${senderEmail})` },
          { label: "Reference ID", value: `NP-${transactionId || Date.now().toString().slice(-8)}` },
          { label: "Timestamp", value: formattedDate },
          { label: "Availability", value: "Instant / Zero Hold" },
        ],
      }),
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 [Ethereal Preview] Recipient Credit Alert: ${previewUrl}`);
    } else {
      console.log(`✅ Real Credit Notification sent to ${receiverEmail}`);
    }
  } catch (err) {
    console.warn("⚠️ Failed to send credit email notification:", err.message);
  }
}
