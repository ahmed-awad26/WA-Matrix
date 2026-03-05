# WA-Matrix (Termux + WhatsApp Cloud API)

## المتطلبات
- WhatsApp Business Platform (Cloud API)
- PHONE_NUMBER_ID + Token + Webhook

## تشغيل على Termux
```bash
pkg update -y
pkg install -y nodejs
termux-setup-storage
cd WA-Matrix
npm install
cp .env.example .env
# عدّل .env وحط Token و Phone Number ID
npm start
```

## Dashboard
افتح:
http://127.0.0.1:3000/dashboard
(هيطلب Basic Auth: DASH_USER/DASH_PASS)

## Webhook
- GET /webhook للتحقق
- POST /webhook لاستقبال الرسائل

> لازم Public HTTPS URL عشان Meta توصل لك.
