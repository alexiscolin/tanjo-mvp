# 🎁 Tanjo MVP - Baby Registry

A simple and elegant baby registry built with Next.js, Google Sheets, and Resend.

## ✨ Features

- 📝 **Simple admin interface** to manage gifts
- 💰 **Multi-currency support** (JPY, EUR, USD) with real-time exchange rates
- 🎁 **Gift reservations** with email notifications
- ♻️ **Second-hand items** with special "Occasion" badge
- 💵 **Collective pots** for expensive gifts (configurable thresholds)
- 👥 **Contributors list** with transparency on pot progress
- 💳 **Payment instructions** (Wero, Paypal, PayPay) with copy buttons & QR codes
- 🖼️ **Smart image picker** - scrape images from product pages
- 📧 **Email notifications** via Resend
- 🎨 **Beautiful UI** with Tailwind CSS and Shadcn/ui
- ⚙️ **Fully configurable** via Google Sheets (no code changes needed)

## 📋 Prerequisites

- Node.js 18+
- A Google account (for Google Sheets)
- A Resend account (for emails) - optional

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in your `.env.local` with the required values (see setup below).

### 3. Run development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## ⚙️ Setup Guide

### 1. Google Sheets Configuration

#### Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Rename it "Baby Registry"
3. Create **4 sheets** (tabs):

**Sheet "Cadeaux"** (first row = headers):
```
ID | Nom | Description | Prix | Image | Catégorie | Lien | Cagnotte | Montant Collecté | Réservé | Réservé Par | Email | Date Réservation | Occasion
```

**Sheet "Reservations"**:
```
ID | ID Cadeau | Nom | Email | Message | Date
```

**Sheet "Contributions"**:
```
ID | ID Cadeau | Nom | Email | Montant | Message | Date
```

**Sheet "Config"**:
```
Clé                        | Valeur
---------------------------|---------------------------
Titre                      | Our Baby Registry
Sous-titre                 | Welcome!
Description                | Thank you for helping...
Prénom Bébé                | Lou
Date Prévue                | March 2025
Image Cover                | https://...
Activer contribution libre | oui
Titre contribution libre   | Contribution libre 💝
Seuil cagnotte (¥)         | 18000
Contribution min (¥)       | 500
Contributions suggérées    | 1000,2500,5000,10000
weroPhone                  | 06 12 34 56 78
paypayId                   | votre_id_paypay
paypayQrUrl                | https://url-vers-qr.png
paypalMeUsername           | votrepseudo
```

> 💡 **Note**: Column A contains the field names (Clé), Column B contains your values (Valeur).
> Leave a field empty if you don't want to use that payment method or feature.

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
FROM_EMAIL="Baby Registry <onboarding@resend.dev>"
ADMIN_EMAIL=your@email.com
```

> In free mode, you can only send to your own email. Add a verified domain to send to everyone.

---

## 📁 Project Structure

```
tanjo-mvp/
├── src/
│   ├── app/
│   │   ├── page.tsx                      # Public page (gift list)
│   │   ├── layout.tsx                    # Root layout
│   │   ├── globals.css                   # Global styles
│   │   ├── admin/
│   │   │   ├── page.tsx                  # Admin dashboard
│   │   │   └── contributions/
│   │   │       └── page.tsx              # View all contributions
│   │   └── api/
│   │       ├── gifts/                    # Gifts CRUD
│   │       │   ├── route.ts              # GET all / POST new
│   │       │   └── [id]/
│   │       │       ├── route.ts          # GET/PUT/DELETE gift
│   │       │       └── contributions/
│   │       │           └── route.ts      # GET contributions / POST contribute
│   │       ├── contributions/
│   │       │   ├── route.ts              # GET all contributions
│   │       │   └── [id]/
│   │       │       └── route.ts          # DELETE contribution (cancel)
│   │       ├── pool/
│   │       │   └── contributions/
│   │       │       └── route.ts          # Free contribution pool
│   │       ├── exchange-rate/
│   │       │   └── route.ts              # Get currency rates
│   │       ├── scrape-images/
│   │       │   └── route.ts              # Scrape images from URLs
│   │       └── config/
│   │           └── route.ts              # Get app config & payment methods
│   ├── components/
│   │   ├── ui/                           # Shadcn UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── gifts/
│   │   │   ├── gift-card.tsx             # Gift display with pot progress
│   │   │   └── gift-grid.tsx             # Grid layout for gifts
│   │   ├── gift-card.tsx                 # Main gift card component
│   │   ├── free-contribution-card.tsx    # Free contribution card
│   │   ├── contribution-dialog.tsx       # Unified dialog (reserve/contribute)
│   │   ├── contributors-list.tsx         # Show pot contributors
│   │   ├── payment-instructions.tsx      # Wero/PayPal/PayPay instructions
│   │   ├── currency-selector.tsx         # Currency switcher (JPY/EUR/USD)
│   │   └── image-picker.tsx              # Smart image picker with scraping
│   ├── lib/
│   │   ├── google-sheets.ts              # Google Sheets API client
│   │   ├── resend.ts                     # Email sending via Resend
│   │   ├── currency.ts                   # Currency conversion & detection
│   │   ├── constants.ts                  # App constants
│   │   └── utils.ts                      # Utility functions
│   └── types/
│       └── index.ts                      # TypeScript types
├── public/                               # Static assets
├── .env.example                          # Environment variables template
├── .env.local                            # Your local env (gitignored)
├── components.json                       # Shadcn UI config
├── tailwind.config.ts                    # Tailwind configuration
├── next.config.ts                        # Next.js configuration
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

### Smart Image Picker

The admin can add gift images in two ways:

1. **Direct image URL**: Paste an image URL → used immediately
2. **Product page URL**: Paste a product page URL (Amazon, Rakuten, etc.) → scrapes all images → choose the one you want

No need for Cloudinary or image hosting! 🎉

---

## 🌐 Deployment

### Netlify (Recommended)

1. Push your code to GitHub
2. Import on [Netlify](https://app.netlify.com)
3. Add all environment variables in **Site settings > Environment variables**
4. Deploy!

The `netlify.toml` file is already configured.

### Vercel

1. Push your code to GitHub
2. Import on [Vercel](https://vercel.com)
3. Add all environment variables
4. Deploy!

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
