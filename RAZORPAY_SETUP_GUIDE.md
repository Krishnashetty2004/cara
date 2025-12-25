# Razorpay Subscription Setup Guide

## Overview
Setting up Razorpay subscriptions for Cara app (₹99/week subscription).

---

## Step 1: Get Razorpay API Keys

### 1.1 Go to Razorpay Dashboard
- URL: https://dashboard.razorpay.com
- Sign in to your account

### 1.2 Get API Keys
1. Go to **Settings** → **API Keys**
2. Generate keys if you haven't already
3. Copy:
   - **Key ID** (starts with `rzp_test_` or `rzp_live_`)
   - **Key Secret** (keep this secure!)

**Note:** Use **Test Mode** keys for development, **Live Mode** for production.

---

## Step 2: Create Subscription Plan

### 2.1 Navigate to Subscriptions
1. In Razorpay Dashboard, go to **Subscriptions** → **Plans**
2. Click **Create New Plan**

### 2.2 Plan Configuration
Fill in the details:

```
Plan Name: Cara Weekly Premium
Description: Unlimited calls with AI companions
Billing Amount: ₹99.00
Billing Period: Weekly (7 days)
Plan Type: Standard
```

### 2.3 Advanced Settings (Optional)
- **Trial Period:** 0 days (or 3 days if offering trial)
- **Total Billing Cycles:** Leave empty for infinite
- **Setup Fee:** ₹0.00

### 2.4 Save Plan
1. Click **Create Plan**
2. Copy the **Plan ID** (starts with `plan_`)

---

## Step 3: Update Environment Variables

### 3.1 Update .env File
Open `/Users/karthikreddy/Desktop/baddie/.env` and update:

```bash
# Replace with your actual keys from Step 1 & 2
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXX
EXPO_PUBLIC_RAZORPAY_PLAN_ID=plan_XXXXXXXXXXXXXX
```

### 3.2 Restart Expo
```bash
npx expo start --clear
```

---

## Step 4: Deploy Webhook to Supabase

### 4.1 Check Supabase Project Status
1. Go to https://supabase.com/dashboard
2. Make sure your project is **active** (not paused)
3. Note your project reference (e.g., `xdlidbjjjtyhktqpbkve`)

### 4.2 Link Supabase Project
```bash
cd /Users/karthikreddy/Desktop/baddie
npx supabase link --project-ref xdlidbjjjtyhktqpbkve
```

### 4.3 Deploy Webhook Function
```bash
npx supabase functions deploy razorpay-webhook
```

This will deploy to:
```
https://xdlidbjjjtyhktqpbkve.supabase.co/functions/v1/razorpay-webhook
```

---

## Step 5: Set Supabase Secrets

The webhook needs these environment variables in Supabase:

```bash
# Set Razorpay webhook secret
npx supabase secrets set RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Set Razorpay key secret (from Step 1)
npx supabase secrets set RAZORPAY_KEY_SECRET=your_key_secret_here
```

**Where to get webhook secret?**
- Generate a random secure string: `openssl rand -hex 32`
- Or use any random string (save it for Step 6)

---

## Step 6: Configure Webhook in Razorpay

### 6.1 Go to Webhooks Settings
1. Razorpay Dashboard → **Settings** → **Webhooks**
2. Click **Add New Webhook**

### 6.2 Webhook Configuration
```
Webhook URL: https://xdlidbjjjtyhktqpbkve.supabase.co/functions/v1/razorpay-webhook
Secret: [paste the secret you used in Step 5]
Active: ✅ Yes
```

### 6.3 Select Events
Check these events:
- ✅ `subscription.authenticated`
- ✅ `subscription.activated`
- ✅ `subscription.charged`
- ✅ `subscription.completed`
- ✅ `subscription.updated`
- ✅ `subscription.paused`
- ✅ `subscription.resumed`
- ✅ `subscription.cancelled`
- ✅ `payment.captured`
- ✅ `payment.failed`

### 6.4 Save Webhook
Click **Create Webhook**

---

## Step 7: Test the Integration

### 7.1 Test Subscription Creation
1. Open your app
2. Go to Premium/Settings screen
3. Click "Subscribe" or "Upgrade to Premium"
4. Complete test payment with Razorpay test cards

### 7.2 Test Cards (Test Mode Only)
```
Success: 4111 1111 1111 1111
CVV: Any 3 digits
Expiry: Any future date
```

### 7.3 Check Logs
**Supabase Logs:**
```bash
npx supabase functions logs razorpay-webhook
```

**Razorpay Logs:**
- Dashboard → Webhooks → Click your webhook → View logs

---

## Step 8: Database Verification

Check if subscription was created:

```sql
-- In Supabase SQL Editor
SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 10;
SELECT * FROM payment_history ORDER BY created_at DESC LIMIT 10;
```

---

## Troubleshooting

### Issue: Webhook returns 401/403
- Check if `RAZORPAY_WEBHOOK_SECRET` matches in both Razorpay and Supabase
- Verify webhook signature verification is working

### Issue: Subscription not updating database
- Check Supabase function logs: `npx supabase functions logs razorpay-webhook`
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check RLS policies on `subscriptions` and `payment_history` tables

### Issue: Payment succeeds but webhook not triggered
- Verify webhook URL is correct
- Check webhook is **Active** in Razorpay dashboard
- Check event subscriptions are enabled

---

## Production Checklist

Before going live:

- [ ] Switch to **Live Mode** API keys in Razorpay
- [ ] Update `.env` with live keys
- [ ] Update `RAZORPAY_WEBHOOK_SECRET` in Supabase
- [ ] Update webhook URL in Razorpay to use live mode
- [ ] Test with real (small amount) transaction
- [ ] Verify webhook logs in production
- [ ] Monitor first few real subscriptions
- [ ] Set up alerts for failed webhooks

---

## Support

- Razorpay Docs: https://razorpay.com/docs/subscriptions/
- Supabase Functions: https://supabase.com/docs/guides/functions
- Cara Support: Your support channel

---

**Next Steps:**
Start with Step 1 and work through each step carefully. Take your time with Steps 5 and 6 as they involve secure secrets.

