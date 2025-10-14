# Admin Panel Guide

## Access

Login at: `/admin/login.html`

**Default Credentials:**
- Username: `admin`
- Password: `admin123`

⚠️ **Change these in production via environment variables!**

## Features

### 1. Service Management

#### Add New Service
1. Click **"Add New Service"** button
2. Fill in the form:
   - **Service Title**: Name of the service
   - **Description**: Brief description (2-3 sentences)
   - **Icon Color**: Choose from 8 color options
   - **Icon SVG Path**: SVG path data (see below)
   - **Service Image**: URL or upload image

#### Edit Service
1. Click **"Edit"** on any service card
2. Modify fields as needed
3. Click **"Save Service"**

#### Delete Service
1. Click **"Delete"** on service card
2. Confirm deletion
3. Service and its ratings will be removed

### 2. Image Upload

**Two Options:**

**Option 1: Upload Image**
- Click "Choose File"
- Select image (max 500KB)
- Image will be converted to base64 automatically

**Option 2: Use URL**
- Paste image URL in "Service Image URL" field
- Use external hosting (Imgur, Cloudinary, etc.)

### 3. Icons

**Getting Icon SVG Paths:**

1. Visit [Heroicons.com](https://heroicons.com)
2. Search for an icon
3. Click on the icon
4. Copy the `d` attribute from the `<path>` tag

**Example:**
```html
<!-- From Heroicons -->
<path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999..." />

<!-- Copy only the d attribute value -->
M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999...
```

**Available Colors:**
- Blue (`text-blue-600`)
- Red (`text-red-600`)
- Green (`text-green-600`)
- Purple (`text-purple-600`)
- Yellow (`text-yellow-600`)
- Indigo (`text-indigo-600`)
- Pink (`text-pink-600`)
- Orange (`text-orange-600`)

## Tips

### Best Practices

1. **Service Titles**: Keep them concise (2-4 words)
2. **Descriptions**: 100-150 characters work best
3. **Images**: Use 16:9 or 4:3 aspect ratio
4. **Icons**: Choose colors that match your service theme

### Image Guidelines

- **Format**: JPG, PNG, WebP
- **Size**: Under 500KB (will be compressed)
- **Dimensions**: 800x600px recommended
- **Quality**: Use optimized images

### Service ID

- Automatically generated from title
- Used for tracking ratings
- Cannot be changed after creation
- Keep titles unique

## Workflow

### Adding a New IT Service

1. **Plan Your Service**
   - Define title and description
   - Choose appropriate icon
   - Prepare service image

2. **Create Service**
   - Click "Add New Service"
   - Enter title (e.g., "Cloud Solutions")
   - Write description
   - Select color (e.g., Blue)
   - Get icon from Heroicons
   - Upload or link image

3. **Preview**
   - View on dashboard
   - Check public site
   - Verify image displays correctly

4. **Monitor**
   - Watch ratings come in
   - Update description based on feedback

## Troubleshooting

### Login Issues
- Verify credentials match environment variables
- Clear browser cache/cookies
- Check that sessions are enabled

### Images Not Uploading
- Reduce image size (under 500KB)
- Use JPG instead of PNG
- Try using a URL instead

### Icon Not Displaying
- Verify SVG path is complete
- Check for syntax errors
- Try a different icon

### Changes Not Appearing
- Refresh the public site
- Clear browser cache
- Check Redis connection

## Security

### Important Notes

1. **Never share admin credentials**
2. **Use strong passwords** in production
3. **Log out** when done
4. **Monitor login attempts**
5. **Change password** regularly

### Session Management

- Sessions expire after browser close
- No "Remember Me" feature (security)
- Must login each time

## Support

Need help?
1. Check main [README.md](../README.md)
2. Review [DEPLOYMENT.md](../DEPLOYMENT.md)
3. Verify environment variables
4. Check Upstash Redis status

