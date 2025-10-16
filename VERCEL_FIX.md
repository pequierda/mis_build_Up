# 🔧 Fix PHP Not Working on Vercel

## The Problem
PHP files are not being executed on Vercel - they're being served as plain text. This is why you see raw PHP code in the test results.

## The Solution

### Step 1: Add vercel.json
✅ **Already done!** I've added `vercel.json` with PHP runtime configuration.

### Step 2: Redeploy to Vercel

You need to **redeploy** your site for the changes to take effect:

**Option A: Push to Git (Recommended)**
```bash
git add .
git commit -m "Add Vercel PHP runtime configuration"
git push
```

**Option B: Manual Deploy in Vercel Dashboard**
1. Go to your Vercel dashboard
2. Click on your project
3. Go to "Deployments" tab
4. Click "Redeploy" on the latest deployment

### Step 3: Wait for Deployment
- Wait 1-2 minutes for deployment to complete
- Vercel will install PHP runtime automatically

### Step 4: Test Again
Visit: `https://your-site.vercel.app/test.html`

You should now see:
- ✅ API Test Passed
- ✅ Auth Test Passed
- ✅ Services Test Passed

### Step 5: Set Admin Credentials (if not done)

In your **Upstash Console CLI**, run:
```bash
SET admin:username "admin"
SET admin:password "admin123"
```

Verify:
```bash
GET admin:username
GET admin:password
```

### Step 6: Try Admin Login
Visit: `https://your-site.vercel.app/admin/login.html`
- Username: `admin`
- Password: `admin123`

## What Changed?

**vercel.json** now includes:
```json
{
  "functions": {
    "api/**/*.php": {
      "runtime": "vercel-php@0.7.1"
    }
  }
}
```

This tells Vercel to:
- Use PHP runtime for all `.php` files in the `api/` folder
- Execute PHP instead of serving raw code

## Troubleshooting

### Still seeing raw PHP code?
1. Make sure you **redeployed** after adding vercel.json
2. Clear your browser cache (Ctrl+F5)
3. Check Vercel build logs for errors

### Environment variables not working?
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Make sure you added:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. Redeploy after adding variables

### Admin login still fails?
1. Run the Upstash CLI commands again
2. Make sure `GET admin:username` returns `"admin"` not `"admin:username"`
3. Check the test page to verify credentials are set

## Quick Checklist

- [ ] `vercel.json` exists in project root
- [ ] Pushed code to Git / Redeployed on Vercel
- [ ] Environment variables set in Vercel
- [ ] Admin credentials set in Upstash CLI
- [ ] Test page shows green checkmarks
- [ ] Admin login works

## Need More Help?

Check the build logs in Vercel:
1. Go to your project in Vercel
2. Click on the latest deployment
3. Click "View Build Logs"
4. Look for PHP-related errors


