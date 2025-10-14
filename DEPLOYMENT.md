# Deployment Guide

## Quick Start on Vercel

### 1. Prepare Your Repository

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Import Project"
3. Select your GitHub repository
4. Vercel will auto-detect your project settings

### 3. Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

| Variable | Value | Example |
|----------|-------|---------|
| `UPSTASH_REDIS_REST_URL` | Your Upstash Redis REST URL | `https://us1-your-db.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Your Upstash Redis REST Token | `AYcGASQgN...` |
| `ADMIN_USERNAME` | Your admin username | `admin` |
| `ADMIN_PASSWORD` | Your admin password | `SecureP@ss123` |

### 4. Get Upstash Credentials

1. Go to [console.upstash.com](https://console.upstash.com)
2. Create a new Redis database (or use existing)
3. Click on your database
4. Scroll to "REST API" section
5. Copy:
   - **UPSTASH_REDIS_REST_URL**
   - **UPSTASH_REDIS_REST_TOKEN**

### 5. Deploy!

Click "Deploy" - Your site will be live in seconds!

## Accessing Your Site

- **Public Website**: `https://your-project.vercel.app/`
- **Admin Panel**: `https://your-project.vercel.app/admin/login.html`

## First Login

1. Navigate to `/admin/login.html`
2. Use credentials you set in environment variables
3. Default services will be automatically created on first load

## Updating Services

### Add New Service
1. Click "Add New Service" button
2. Fill in:
   - **Title**: Service name
   - **Description**: Brief description
   - **Icon Color**: Choose from dropdown
   - **Icon SVG Path**: Get from [heroicons.com](https://heroicons.com)
   - **Image URL or Upload**: Optional service image

### Edit Service
1. Click "Edit" on any service card
2. Modify fields
3. Click "Save Service"

### Delete Service
1. Click "Delete" on any service card
2. Confirm deletion

## Security Tips

⚠️ **Important Security Practices:**

1. **Change Default Password**: Never use `admin123` in production
2. **Use Strong Passwords**: Minimum 12 characters with mixed case, numbers, symbols
3. **Environment Variables**: Never commit `.env` files to Git
4. **HTTPS Only**: Vercel provides this automatically
5. **Regular Updates**: Change admin password periodically

## Troubleshooting

### Services Not Loading
- Check Upstash credentials in Vercel environment variables
- Verify Redis database is active
- Check browser console for errors

### Admin Login Not Working
- Verify `ADMIN_USERNAME` and `ADMIN_PASSWORD` in Vercel settings
- Clear browser cookies and try again
- Check that session is enabled in your PHP configuration

### Ratings Not Saving
- Verify Upstash Redis connection
- Check API endpoint responses in browser Network tab
- Ensure Redis has write permissions

### Images Not Displaying
- Check image URL is accessible
- Verify base64 encoding is valid
- Ensure image size is under 500KB for uploads

## Support

For issues or questions:
1. Check the [README.md](README.md) file
2. Review [Vercel Documentation](https://vercel.com/docs)
3. Visit [Upstash Documentation](https://docs.upstash.com/)

