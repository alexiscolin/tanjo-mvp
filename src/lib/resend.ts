import { Resend } from "resend";
import type { PaymentConfig } from "@/types";
import { formatJpy, formatCurrency, type Currency, type ExchangeRates, CURRENCY } from "./currency";
import { deobfuscatePhone } from "./utils";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL ?? "Liste de Naissance <noreply@resend.dev>";
const REPLY_TO_EMAIL =
  process.env.REPLY_TO_EMAIL ?? process.env.FROM_EMAIL ?? "Liste de Naissance <noreply@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "http://localhost:3000";

// Initialize Resend only if API key is configured
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Format amount for email display based on currency
 * Uses exchangeRates to convert from JPY to user's currency
 */
function formatAmountForEmail(data: BaseContributionData, exchangeRates: ExchangeRates): string {
  const currency = (data.currency ?? CURRENCY.JPY) as Currency;

  return formatCurrency(data.amountInJpy, currency, exchangeRates);
}

// ==================== DATA INTERFACES ====================

interface BaseContributionData {
  contributorName: string;
  contributorEmail: string;
  amountInJpy: number; // Amount in JPY (for database storage)
  currency?: string; // Currency code (JPY, EUR, USD)
  message?: string;
  cancelToken: string;
}

interface GiftContributionData extends BaseContributionData {
  giftId: string;
  giftTitle: string;
  giftImageUrl?: string;
  totalCollected: number;
  goal: number;
}

interface PoolContributionData extends BaseContributionData {
  giftId: "POOL";
}

type ContributionEmailData = GiftContributionData | PoolContributionData;

// ==================== EMAIL TEMPLATES ====================

/**
 * Generate payment instructions HTML for email
 * Only shows relevant payment methods based on currency (minimal version)
 */
function generatePaymentInstructionsHtml(
  data: BaseContributionData,
  paymentConfig: PaymentConfig,
  contributorName: string,
  exchangeRates: ExchangeRates
): string {
  const formattedAmount = formatAmountForEmail(data, exchangeRates);
  const currency = data.currency ?? "JPY";
  const sections: string[] = [];

  // Determine which payment methods to show based on currency
  const isJPY = currency === CURRENCY.JPY;
  const isEUR = currency === CURRENCY.EUR;
  const isUSD = currency === CURRENCY.USD;
  const isInternational = isEUR || isUSD;

  // PayPay (Japan only - JPY)
  if (paymentConfig.paypayId && isJPY) {
    sections.push(`
      <div style="background: #faf8f5; padding: 16px; border-radius: 10px; margin: 12px 0; border: 1px solid #e8e3dd;">
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">PayPay</p>
        <p style="margin: 0; font-size: 14px; color: #8e8e8e;">ID : ${paymentConfig.paypayId}</p>
      </div>
    `);
  }

  // Wero (Europe only - EUR)
  if (paymentConfig.weroPhone && isEUR) {
    const phone = deobfuscatePhone(paymentConfig.weroPhone);

    sections.push(`
      <div style="background: #faf8f5; padding: 16px; border-radius: 10px; margin: 12px 0; border: 1px solid #e8e3dd;">
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">Wero</p>
        <p style="margin: 0 0 4px 0; font-size: 14px; color: #8e8e8e;">Numéro : ${phone}</p>
        <p style="margin: 0; font-size: 13px; color: #8e8e8e;">Message : ${contributorName}</p>
      </div>
    `);
  }

  // PayPal (International - EUR/USD, or fallback if no other method)
  if (paymentConfig.paypalMeUsername && (isInternational || sections.length === 0)) {
    sections.push(`
      <div style="background: #faf8f5; padding: 16px; border-radius: 10px; margin: 12px 0; border: 1px solid #e8e3dd;">
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">PayPal</p>
        <p style="margin: 0; font-size: 14px; color: #8e8e8e;">paypal.me/${paymentConfig.paypalMeUsername}</p>
      </div>
    `);
  }

  if (sections.length === 0) {
    return "";
  }

  return `
    <div style="margin: 24px 0;">
      <p style="margin: 0 0 4px 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">Montant : ${formattedAmount}</p>
      <p style="margin: 0 0 12px 0; color: #8e8e8e; font-size: 14px;">Si votre paiement n'a pas encore été fait, n'oubliez pas de l'envoyer via :</p>
      ${sections.join("")}
    </div>
  `;
}

/**
 * Generate cancellation link section (minimal)
 */
function generateCancelSection(cancelToken: string): string {
  const cancelUrl = `${SITE_URL}/cancel/${cancelToken}`;

  return `
    <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e8e3dd;">
      <p style="margin: 0; font-size: 13px; color: #8e8e8e; text-align: center;">
        <a href="${cancelUrl}" style="color: #c41e3a; text-decoration: underline;">Annuler ma participation</a>
      </p>
    </div>
  `;
}

// ==================== CONFIRMATION EMAIL TO CONTRIBUTOR ====================

export async function sendContributionConfirmationEmail(
  data: ContributionEmailData,
  paymentConfig: PaymentConfig,
  exchangeRates: ExchangeRates
) {
  console.warn("📧 Attempting to send confirmation email to:", data.contributorEmail);

  if (!resend) {
    console.warn("📧 Email not sent: Resend not configured (no API key)");

    return;
  }

  console.warn("📧 Resend configured, sending email...");

  const isPool = data.giftId === "POOL";
  const giftTitle = isPool ? "Contribution libre 💝" : (data as GiftContributionData).giftTitle;
  const currency = (data.currency ?? CURRENCY.JPY) as Currency;

  let progressSection = "";

  if (!isPool) {
    const giftData = data as GiftContributionData;
    const percentage = Math.round((giftData.totalCollected / giftData.goal) * 100);

    // Convert totalCollected and goal to user's currency
    const totalCollectedInUserCurrency = formatCurrency(
      giftData.totalCollected,
      currency,
      exchangeRates
    );
    const goalInUserCurrency = formatCurrency(giftData.goal, currency, exchangeRates);

    progressSection = `
      <div style="background: #e8e3dd; border-radius: 10px; overflow: hidden; margin: 12px 0;">
        <div style="background: #c41e3a; height: 8px; width: ${Math.min(percentage, 100)}%;"></div>
      </div>
      <p style="margin: 0; font-size: 14px; color: #8e8e8e;">
        ${totalCollectedInUserCurrency} / ${goalInUserCurrency} (${percentage}%)
      </p>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">

      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #c41e3a; margin: 0 0 8px 0; font-weight: 600;">Merci ${data.contributorName}</h1>
        <p style="color: #8e8e8e; margin: 0;">Votre ${isPool ? "contribution" : "participation"} a bien été enregistrée.</p>
      </div>

      <!-- Gift Card -->
      <div style="background: #faf8f5; padding: 24px; border-radius: 10px; margin: 24px 0; border: 1px solid #e8e3dd;">
        <h2 style="margin: 0 0 8px 0; color: #1a1a1a; text-align: center; font-weight: 600; font-size: 20px;">${giftTitle}</h2>

        <div style="text-align: center; margin: 16px 0;">
          <span style="font-size: 24px; font-weight: 600; color: #c41e3a;">
            ${formatAmountForEmail(data, exchangeRates)}
          </span>
        </div>

        ${progressSection}

        ${
          data.message
            ? `
          <div style="background: white; padding: 16px; border-radius: 10px; margin-top: 16px; border: 1px solid #e8e3dd;">
            <p style="margin: 0; font-style: italic; color: #8e8e8e;">${data.message}</p>
          </div>
        `
            : ""
        }
      </div>

      <!-- Payment Instructions -->
      ${generatePaymentInstructionsHtml(data, paymentConfig, data.contributorName, exchangeRates)}

      <!-- Footer with cancel link -->
      ${generateCancelSection(data.cancelToken)}

      <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e8e3dd;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #8e8e8e;">
          Email automatique de la liste de naissance.
        </p>
        <p style="margin: 0; font-size: 12px; color: #8e8e8e;">
          Questions : <a href="https://camille.jaunebleu.co" style="color: #c41e3a; text-decoration: none;">camille.jaunebleu.co</a>
        </p>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.contributorEmail,
      replyTo: REPLY_TO_EMAIL,
      subject: `Confirmation de votre ${isPool ? "contribution" : "participation"} - ${giftTitle}`,
      html,
    });

    console.warn("✅ Confirmation email sent:", result);
  } catch (error) {
    console.error("❌ Failed to send confirmation email:", error);
    throw error; // Re-throw to be caught by the API route
  }
}

// ==================== NOTIFICATION EMAIL TO ADMIN ====================

export async function sendContributionNotificationToAdmin(data: ContributionEmailData) {
  console.warn("📧 Attempting to send admin notification to:", ADMIN_EMAIL);

  if (!resend || !ADMIN_EMAIL) {
    console.warn("📧 Admin email not sent: Resend or ADMIN_EMAIL not configured");

    return;
  }

  console.warn("📧 Resend configured, sending admin email...");

  const isPool = data.giftId === "POOL";
  const giftTitle = isPool ? "Contribution libre 💝" : (data as GiftContributionData).giftTitle;

  let progressSection = "";

  if (!isPool) {
    const giftData = data as GiftContributionData;
    const percentage = Math.round((giftData.totalCollected / giftData.goal) * 100);

    progressSection = `
      <div style="background: #faf8f5; padding: 12px; border-radius: 10px; margin: 12px 0; border: 1px solid #e8e3dd;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 14px; color: #1a1a1a;">Progression:</span>
          <span style="font-weight: bold; color: #c41e3a;">${percentage}%</span>
        </div>
        <div style="background: #e8e3dd; border-radius: 10px; overflow: hidden; margin-top: 8px;">
          <div style="background: #c41e3a; height: 6px; width: ${Math.min(percentage, 100)}%;"></div>
        </div>
        <p style="margin: 8px 0 0 0; font-size: 13px; text-align: right; color: #8e8e8e;">
          ${formatJpy(giftData.totalCollected)} / ${formatJpy(giftData.goal)}
        </p>
      </div>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">

      <div style="background: #faf8f5; padding: 24px; border-radius: 10px; margin-bottom: 24px; border: 1px solid #e8e3dd;">
        <h1 style="margin: 0 0 8px 0; color: #1a1a1a; font-weight: 600; font-size: 20px;">Nouvelle ${isPool ? "contribution" : "participation"}</h1>
        <p style="margin: 0; font-size: 20px; font-weight: 600; color: #c41e3a;">
          ${formatJpy(data.amountInJpy)}
        </p>
      </div>

      <!-- Contributor Info -->
      <div style="background: #faf8f5; padding: 20px; border-radius: 10px; margin-bottom: 24px; border: 1px solid #e8e3dd;">
        <h3 style="margin: 0 0 16px 0; color: #1a1a1a; font-weight: 600; font-size: 16px;">Contributeur</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #8e8e8e;">Nom</td>
            <td style="padding: 8px 0; font-weight: 600; color: #1a1a1a;">${data.contributorName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #8e8e8e;">Email</td>
            <td style="padding: 8px 0; color: #1a1a1a; word-break: break-all;">
              ${data.contributorEmail}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #8e8e8e;">Montant</td>
            <td style="padding: 8px 0; font-weight: 600; color: #c41e3a;">${formatJpy(data.amountInJpy)}</td>
          </tr>
          ${
            data.message
              ? `
          <tr>
            <td style="padding: 8px 0; color: #8e8e8e; vertical-align: top;">Message</td>
            <td style="padding: 8px 0; font-style: italic; color: #8e8e8e;">${data.message}</td>
          </tr>
          `
              : ""
          }
        </table>
      </div>

      <!-- Gift Info -->
      <div style="background: #faf8f5; padding: 20px; border-radius: 10px; border: 1px solid #e8e3dd;">
        <h3 style="margin: 0 0 16px 0; color: #1a1a1a; font-weight: 600; font-size: 16px;">Cadeau</h3>

        <div>
          <h4 style="margin: 0 0 4px 0; font-weight: 600; color: #1a1a1a;">${giftTitle}</h4>
          ${!isPool ? `<p style="margin: 0; color: #8e8e8e; font-size: 14px;">ID: ${data.giftId}</p>` : ""}
        </div>

        ${progressSection}
      </div>

      <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e8e3dd;">
        <p style="margin: 0; font-size: 13px; color: #8e8e8e;">
          Notification automatique
        </p>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      subject: `Nouvelle ${isPool ? "contribution" : "participation"} de ${data.contributorName} - ${formatJpy(data.amountInJpy)}`,
      html,
    });

    console.warn("✅ Admin notification sent:", result);
  } catch (error) {
    console.error("❌ Failed to send admin notification:", error);
    throw error;
  }
}

// ==================== CANCELLATION CONFIRMATION EMAIL ====================

export async function sendCancellationConfirmationEmail(
  email: string,
  name: string,
  giftTitle: string,
  amount: number,
  feedback?: string
) {
  if (!resend) {
    console.warn("📧 Email not sent: Resend not configured");

    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">

      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #8e8e8e; margin: 0 0 8px 0;">Annulation confirmée</h1>
        <p style="color: #8e8e8e; margin: 0;">${name}, Votre participation a bien été annulée.</p>
      </div>

      <div style="background: #faf8f5; padding: 24px; border-radius: 10px; margin: 24px 0; border: 1px solid #e8e3dd;">
        <h2 style="margin: 0 0 16px 0; color: #1a1a1a;">${giftTitle}</h2>
        <p style="margin: 0; color: #8e8e8e;">
          Montant annulé: <strong style="color: #1a1a1a;">${formatJpy(amount)}</strong>
        </p>
      </div>

      ${
        feedback
          ? `
        <div style="background: #faf8f5; padding: 20px; border-radius: 10px; margin: 24px 0; border: 1px solid #e8e3dd;">
          <h3 style="margin: 0 0 12px 0; color: #1a1a1a; font-size: 16px;">Votre message :</h3>
          <p style="margin: 0; color: #8e8e8e; font-style: italic;">${feedback}</p>
        </div>
      `
          : ""
      }

      <p style="color: #8e8e8e; text-align: center;">
        Nous espérons vous revoir bientôt ! 💕
      </p>

      <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e8e3dd;">
        <p style="margin: 0; font-size: 13px; color: #8e8e8e;">
          Cet email a été envoyé automatiquement par la liste de naissance.
        </p>
      </div>
    </body>
    </html>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    replyTo: REPLY_TO_EMAIL,
    subject: `Annulation confirmée - ${giftTitle}`,
    html,
  });
}

// ==================== CANCELLATION NOTIFICATION TO ADMIN ====================

export async function sendCancellationNotificationToAdmin(
  name: string,
  email: string,
  giftTitle: string,
  amount: number,
  feedback?: string
) {
  if (!resend || !ADMIN_EMAIL) {
    console.warn("📧 Admin email not sent: Resend or ADMIN_EMAIL not configured");

    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">

      <div style="background: #faf8f5; padding: 24px; border-radius: 10px; margin-bottom: 24px; border: 1px solid #e8e3dd;">
        <h1 style="margin: 0 0 8px 0; color: #1a1a1a;">❌ Annulation de contribution</h1>
        <p style="margin: 0; font-size: 20px; font-weight: bold; color: #c41e3a;">
          - ${formatJpy(amount)}
          </p>
        </div>

      <div style="background: #faf8f5; padding: 20px; border-radius: 10px; margin-bottom: 24px; border: 1px solid #e8e3dd;">
        <h3 style="margin: 0 0 16px 0; color: #1a1a1a;">📋 Détails</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #8e8e8e;">Personne:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #1a1a1a;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #8e8e8e;">Email:</td>
            <td style="padding: 8px 0; color: #1a1a1a; word-break: break-all;">
              ${email}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #8e8e8e;">Cadeau:</td>
            <td style="padding: 8px 0; color: #1a1a1a;">${giftTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #8e8e8e;">Montant:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #c41e3a;">${formatJpy(amount)}</td>
          </tr>
          ${
            feedback
              ? `
          <tr>
            <td style="padding: 8px 0; color: #8e8e8e; vertical-align: top;">Raison:</td>
            <td style="padding: 8px 0; font-style: italic; color: #8e8e8e;">"${feedback}"</td>
          </tr>
          `
              : ""
          }
        </table>
      </div>

      <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e8e3dd;">
        <p style="margin: 0; font-size: 13px; color: #8e8e8e;">
          Notification automatique de la liste de naissance
        </p>
      </div>
    </body>
    </html>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    replyTo: REPLY_TO_EMAIL,
    subject: `❌ Annulation: ${name} → ${giftTitle} (-${formatJpy(amount)})`,
    html,
  });
}
