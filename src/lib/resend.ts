import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'Liste de Naissance <noreply@resend.dev>'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || ''

// Initialize Resend only if API key is configured
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

interface ReservationEmailData {
  giftTitle: string
  giftPrice: number
  reserverName: string
  reserverEmail: string
  message?: string
}

interface ContributionEmailData {
  giftTitle: string
  contributorName: string
  contributorEmail: string
  amount: number
  message?: string
  totalCollected: number
  goal: number
}

// Email sent to admin when someone reserves a gift
export async function sendReservationNotification(data: ReservationEmailData) {
  if (!resend || !ADMIN_EMAIL) {
    console.log('📧 Email not sent: Resend not configured')
    return
  }

  const formatPrice = (cents: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  await resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: `🎁 Nouveau cadeau réservé : ${data.giftTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e11d48;">🎁 Nouveau cadeau réservé !</h1>
        <p><strong>${data.reserverName}</strong> a réservé un cadeau de votre liste :</p>
        
        <div style="background: #fef2f2; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <h2 style="margin: 0 0 8px 0; color: #1f2937;">${data.giftTitle}</h2>
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #e11d48;">
            ${formatPrice(data.giftPrice)}
          </p>
        </div>
        
        <p><strong>Email :</strong> ${data.reserverEmail}</p>
        ${data.message ? `<p><strong>Message :</strong> "${data.message}"</p>` : ''}
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="color: #6b7280; font-size: 14px;">
          Cet email a été envoyé automatiquement par votre liste de naissance.
        </p>
      </div>
    `,
  })
}

// Confirmation email sent to the person who reserves
export async function sendReservationConfirmation(data: ReservationEmailData) {
  if (!resend) {
    console.log('📧 Email not sent: Resend not configured')
    return
  }

  const formatPrice = (cents: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  await resend.emails.send({
    from: FROM_EMAIL,
    to: data.reserverEmail,
    subject: `Confirmation : vous avez réservé "${data.giftTitle}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e11d48;">Merci ${data.reserverName} ! 💕</h1>
        <p>Votre réservation a bien été enregistrée :</p>
        
        <div style="background: #fef2f2; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <h2 style="margin: 0 0 8px 0; color: #1f2937;">${data.giftTitle}</h2>
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #e11d48;">
            ${formatPrice(data.giftPrice)}
          </p>
        </div>
        
        <p>Les futurs parents seront ravis de recevoir ce cadeau. Merci pour votre générosité !</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="color: #6b7280; font-size: 14px;">
          Gardez cet email comme confirmation de votre réservation.
        </p>
      </div>
    `,
  })
}

// Email sent to admin when someone contributes to a pot
export async function sendContributionNotification(data: ContributionEmailData) {
  if (!resend || !ADMIN_EMAIL) {
    console.log('📧 Email not sent: Resend not configured')
    return
  }

  const formatPrice = (cents: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  const percentage = Math.round((data.totalCollected / data.goal) * 100)

  await resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: `💰 Nouvelle contribution : ${formatPrice(data.amount)} pour "${data.giftTitle}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f59e0b;">💰 Nouvelle contribution !</h1>
        <p><strong>${data.contributorName}</strong> a contribué à votre cagnotte :</p>
        
        <div style="background: #fffbeb; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <h2 style="margin: 0 0 8px 0; color: #1f2937;">${data.giftTitle}</h2>
          <p style="margin: 0 0 12px 0; font-size: 24px; font-weight: bold; color: #f59e0b;">
            + ${formatPrice(data.amount)}
          </p>
          <div style="background: #fef3c7; border-radius: 8px; overflow: hidden; height: 8px;">
            <div style="background: #f59e0b; height: 100%; width: ${percentage}%;"></div>
          </div>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #92400e;">
            ${formatPrice(data.totalCollected)} / ${formatPrice(data.goal)} (${percentage}%)
          </p>
        </div>
        
        <p><strong>Email :</strong> ${data.contributorEmail}</p>
        ${data.message ? `<p><strong>Message :</strong> "${data.message}"</p>` : ''}
      </div>
    `,
  })
}

// Confirmation email for a contribution
export async function sendContributionConfirmation(data: ContributionEmailData) {
  if (!resend) {
    console.log('📧 Email not sent: Resend not configured')
    return
  }

  const formatPrice = (cents: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  await resend.emails.send({
    from: FROM_EMAIL,
    to: data.contributorEmail,
    subject: `Merci pour votre contribution à "${data.giftTitle}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f59e0b;">Merci ${data.contributorName} ! 💕</h1>
        <p>Votre contribution a bien été enregistrée :</p>
        
        <div style="background: #fffbeb; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <h2 style="margin: 0 0 8px 0; color: #1f2937;">${data.giftTitle}</h2>
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #f59e0b;">
            ${formatPrice(data.amount)}
          </p>
        </div>
        
        <p>Grâce à vous, la cagnotte avance ! Les futurs parents vous remercient. 🙏</p>
      </div>
    `,
  })
}
