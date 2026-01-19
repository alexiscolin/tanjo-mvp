# 🎁 Tanjo - Baby Registry

A simple and elegant baby registry built with Next.js, Google Sheets, and Resend.

## ✨ Features

- **Simple Admin Interface** to manage gifts.
- **Multi-Currency Support** (JPY, EUR, USD) with real-time exchange rates.
- **Gift Reservations** and contributions with email notifications.
- **Second-Hand Items** with a special "Occasion" badge.
- **Collective Pots** for expensive gifts, with configurable thresholds.
- **Contributors List** to track pot progress.
- **Payment Instructions** (Wero, PayPal, PayPay) with copy buttons & QR codes.
- **Smart Image Picker** that scrapes images from product pages.
- **Email Notifications** via Resend for confirmations and cancellations.
- **Fully Configurable** via Google Sheets with no code changes needed.

## 📋 Prerequisites

- Node.js 18+
- A Google account (for Google Sheets)
- A Resend account (for emails) - optional

---

## 🚀 Quick Start

1.  **Install dependencies**

    ```bash
    pnpm install
    ```

2.  **Configure environment variables**

    ```bash
    cp .env.example .env.local
    ```

    Fill in your `.env.local` file with the required values (see setup guide below).

3.  **Run development server**
    ```bash
    pnpm dev
    ```
    Open [http://localhost:3000](http://localhost:3000) 🎉.

---

## ⚙️ Setup Guide

### 1. Google Sheets Configuration

#### A. Create the Spreadsheet

1.  Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet (e.g., "Baby Registry").
2.  Create **3 sheets** (tabs): `Cadeaux`, `Contributions`, `Config`.

**Sheet "Cadeaux"** (first row = headers):

```
ID | Nom | Description | Prix | Image | Catégorie | Lien | Cagnotte | Montant Collecté | Réservé | Réservé Par | Email | Date Réservation | Occasion | Ratio Image
```

> ⚠️ **IMPORTANT**: Add a special gift with ID `POOL` for free contributions:
>
> ```
> POOL | Contribution libre 💝 | Pour nous aider librement | 0 | (empty) | autre | (empty) | OUI | 0 | NON | (empty) | (empty) | (empty) | NON | (empty)
> ```
>
> This gift is **required** for the free contribution feature to work. It will not be displayed in the public gift list.

**Sheet "Contributions"**:

```
ID | ID Cadeau | Nom | Email | Montant | Message | Date | CancelToken
```

> 💡 **Note**: The `CancelToken` column is automatically generated. It contains a secure token allowing contributors to cancel their contribution via a unique link.

---

**Lines 1-11**: Basic configuration for your registry
**Lines 12-15**: Payment methods (optional, fill only what you need)

> ⚠️ **Note**: Pot mode is now **enabled by default** on all gifts, allowing multiple contributors per gift.

#### Configure Google API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use an existing one)
3. Enable **Google Sheets API**
4. Go to **API & Services > Credentials**
5. Click **Create Credentials > Service Account**
6. Name it (e.g., "tanjo-sheets")
7. Click on the created account, then **Keys > Add Key > Create new key > JSON**
8. Download the JSON file

---

#### Share the Sheet

1. Copy the service account email (in the JSON: `client_email`)
2. Open your Google Sheet
3. Click **Share** and add this email with **Editor** role

#### Environment Variables

In your `.env.local`:

```env
GOOGLE_SHEETS_SPREADSHEET_ID=xxx     # The ID in your Sheet URL
GOOGLE_SHEETS_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="your_private_key_here"  # Copy the full key from JSON with \n
ADMIN_PASSWORD=your_secure_password_here
```

> ⚠️ For the private key, copy the entire key value from the service account JSON file (including the BEGIN/END lines) and wrap it in quotes with literal `\n` characters preserved.

---

### 2. Resend Configuration (Optional - for emails)

1. Create an account on [Resend](https://resend.com) (free)
2. Go to **API Keys** and create a key
3. (Optional) Add your domain to customize the sender email

#### Environment Variables

```env
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL="Baby Registry <hello@yourdomain.com>"
REPLY_TO_EMAIL="contact@yourdomain.com"  # Optional: email for replies
ADMIN_EMAIL=your@email.com

# Site URL for email links (cancellation, etc.)
NEXT_PUBLIC_SITE_URL=https://your-site.netlify.app
SITE_URL=https://your-site.netlify.app
```

> In free mode, you can only send to your own email. Add a verified domain to send to everyone.

#### Email Features

The app sends beautiful, enriched emails:

**To Contributors:**

- 🎁 **Confirmation email** with gift photo, amount, and progress
- 💳 **Payment instructions** (PayPal, Wero, PayPay) directly in the email
- 🔗 **Cancellation link** to cancel their contribution if needed

**To Admins:**

- 📩 **Notification email** with contributor details (name, email, amount, message)
- ❌ **Cancellation alerts** when someone cancels, with their feedback

**Cancellation Page:**

- Contributors can cancel via a unique secure link (`/cancel/[token]`)
- Optional feedback form to understand why they cancelled
- Confirmation emails sent to both contributor and admin

---

## 📁 Project Structure

```
tanjo-mvp/
├── src/
│   ├── app/                # Pages and API routes
│   ├── components/         # React components
│   ├── lib/                # API clients (Google, Resend), helpers
│   └── types/              # TypeScript definitions
├── public/                 # Static files
├── .env.example            # Environment variables template
├── .env.local              # Your local variables (Git-ignored)
├── package.json
└── README.md
```

---

## 🎯 Advanced Features

### Collective Pots (Cagnottes)

For expensive gifts, enable **pot mode** to allow multiple people to contribute:

- **Automatic suggestions**: Gifts above a threshold automatically suggest pot mode
- **Progress tracking**: Real-time progress bar with percentage and remaining amount
- **Contributors list**: See who contributed and their messages
- **Smart notifications**: Emails sent to admin and contributor after each contribution

**Configuration**: All pot settings are in your Google Sheets `Config` tab (lines 9-11): pot threshold, minimum contribution, and suggested amounts.

### Payment Instructions

After a contribution, users automatically receive payment instructions based on their currency:

**💳 PayPal (Recommended - International):**

- Direct link to PayPal.me with pre-filled amount
- Works worldwide
- Note: Fees may apply if paying by card (free via PayPal balance or bank transfer)

**🇪🇺 For Europe (EUR):**

- **Wero** (P2P instant payment): Phone number protected with reveal button (anti-scraping)
- Step-by-step instructions guide users through the payment process

**🇯🇵 For Japan (JPY):**

- **PayPay**: Display PayPay ID and/or QR code for easy scanning
- QR code shown directly in the success dialog
- Japanese language instructions

**Configuration in Google Sheet `Config` tab (lines 12-15):**

```
B12: weroPhone        → Your Wero phone number (e.g., 06 12 34 56 78)
B13: paypayId         → Your PayPay ID
B14: paypayQrUrl      → URL to your PayPay QR code image
B15: paypalMeUsername → Your PayPal.me username (e.g., johnsmith)
```

> 💡 **Tip**: You only need to fill in the payment methods you want to accept. The app automatically shows the right options based on the selected currency. PayPal is shown first as the recommended option.

---

## 🌐 Deployment

### Netlify

1. Push your code to GitHub
2. Import on [Netlify](https://app.netlify.com)
3. Add all environment variables in **Site settings > Environment variables**
4. Deploy!

The `netlify.toml` file is already configured.

## ❓ FAQ

**Q: Emails are not being sent**
A: In Resend free mode, you can only send to your own email. Verify a domain to send to everyone.

**Q: "Not authorized" error on Google Sheets**
A: Make sure you shared the Sheet with the service account email.

**Q: Exchange rates not updating**
A: Rates are cached for 24 hours. Wait or clear the cache.

**Q: How to add images?**
A: Use the Image Picker in the admin. You can:

- Enter an image URL directly
- Paste a product page URL (Amazon, Rakuten) → choose from scraped images

**Q: How to enable pot mode for a gift?**
A: In the admin, check "Mode Cagnotte" when creating/editing a gift. For gifts above the threshold (default 18000¥), it's automatically suggested.

**Q: How to mark a gift as second-hand?**
A: In the admin, check "♻️ Article d'occasion" when creating/editing a gift. A green "Occasion" badge will be displayed on the gift card.

**Q: Can I see who contributed to a pot?**
A: Yes! Click "Voir les contributeurs" on any pot gift card. Emails are kept private.

**Q: How do payment instructions work?**
A: After someone contributes, they see payment instructions based on their currency:

- **EUR**: Wero phone with copy buttons
- **JPY**: PayPay ID + QR code
  Configure your payment details in the Google Sheet `Config` tab (lines 12-18). You only need to fill in the methods you accept.

**Q: Is payment processing automatic?**
A: No. This app doesn't process payments - it just displays your payment details to contributors. They manually send money via Wero, bank transfer, or PayPay. You validate contributions manually.

**Q: Can contributors cancel their contribution?**
A: Yes! Each contributor receives an email with a unique cancellation link. They can click it anytime to cancel and optionally provide feedback. You'll receive a notification email when someone cancels.

**Q: What happens when someone cancels?**
A: The contribution is removed from Google Sheets, the pot amount is updated, and both the contributor and admin receive confirmation emails.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **Database**: Google Sheets
- **Emails**: Resend
- **Currency**: Real-time exchange rates
- **Language**: TypeScript

---

## 📝 License

MIT

---

## 🙏 Credits

Built with ❤️ for expecting parents.
