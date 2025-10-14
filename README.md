# IT Solutions Services Website

A modern, professional IT solutions services webpage with anonymous rating functionality and admin panel, using Upstash Redis for data storage.

## Features

- 🎨 Beautiful, responsive design with Tailwind CSS & Flowbite
- ⭐ Anonymous service rating system (1-5 stars)
- 🔐 Admin panel to manage services
- 🖼️ Image upload support (base64 or URL)
- ☁️ Upstash Redis for scalable data storage
- 📱 Mobile-friendly interface
- 🚀 Ready for Vercel deployment
- 🔧 Separated HTML, CSS, and JS for easy maintenance

## Services Included

1. **Cloud Solutions** - Scalable cloud infrastructure
2. **Cybersecurity** - Advanced security solutions
3. **Web Development** - Custom web applications
4. **Data Analytics** - Data insights and visualization
5. **AI & Machine Learning** - AI-powered automation
6. **IT Consulting** - Strategic technology consulting

## Setup Instructions

### Deployment on Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [Vercel](https://vercel.com)
   - Import your repository
   - Add Environment Variables:
     - `UPSTASH_REDIS_REST_URL` - Your Upstash Redis REST URL
     - `UPSTASH_REDIS_REST_TOKEN` - Your Upstash Redis REST Token
     - `ADMIN_USERNAME` - Admin login username (default: admin)
     - `ADMIN_PASSWORD` - Admin login password (default: admin123)

3. **Get Upstash Credentials**
   - Go to [Upstash Console](https://console.upstash.com/)
   - Create or select your Redis database
   - Copy the **REST URL** and **REST Token**

4. **Deploy!**
   - Vercel will automatically deploy your site

### Local Development

1. **Configure Environment Variables**
   
   Edit `.htaccess` (for Apache/XAMPP):
   ```apache
   SetEnv UPSTASH_REDIS_REST_URL "https://your-endpoint.upstash.io"
   SetEnv UPSTASH_REDIS_REST_TOKEN "your_token_here"
   SetEnv ADMIN_USERNAME "admin"
   SetEnv ADMIN_PASSWORD "admin123"
   ```

2. **Start Local Server**
   - Place files in your web server directory (XAMPP: `htdocs`)
   - Navigate to: `http://localhost/MIS_buildUp/`

### Access

- **Main Website**: `https://yoursite.vercel.app/` or `http://localhost/MIS_buildUp/`
- **Admin Panel**: `https://yoursite.vercel.app/admin/login.html`

## File Structure

```
MIS_buildUp/
├── index.html                 # Main HTML page
├── assets/
│   ├── css/
│   │   └── styles.css         # Custom CSS styles
│   └── js/
│       └── main.js            # Main application logic
├── admin/
│   ├── login.html             # Admin login page
│   ├── dashboard.html         # Admin dashboard
│   ├── css/
│   │   └── admin.css          # Admin panel styles
│   └── js/
│       ├── login.js           # Login functionality
│       └── dashboard.js       # Dashboard functionality
├── config/
│   └── upstash.php            # Upstash Redis client
├── api/
│   ├── rate.php               # Submit rating endpoint
│   ├── get-ratings.php        # Fetch ratings endpoint
│   └── admin/
│       ├── auth.php           # Admin authentication
│       └── services.php       # Service CRUD operations
├── .htaccess                  # Apache config (local development)
├── .env.example               # Environment variables template
└── README.md                  # This file
```

## Admin Panel Features

### Login
- Secure authentication using environment variables
- Session-based authentication
- Access: `/admin/login.html`

### Dashboard
- **View all services** - See all IT services with images and icons
- **Add new service** - Create custom services with:
  - Title and description
  - Custom icon (SVG path from Heroicons)
  - Color scheme
  - Service image (URL or upload)
- **Edit services** - Update existing service details
- **Delete services** - Remove services from the platform
- **Image upload** - Upload images (max 500KB, converted to base64)

### Default Credentials
- Username: `admin` (configurable via `ADMIN_USERNAME`)
- Password: `admin123` (configurable via `ADMIN_PASSWORD`)

**⚠️ Important**: Change default credentials in production!

## API Endpoints

### Public Endpoints

#### GET `/api/admin/services.php`
Fetch all services
**Response:**
```json
[
  {
    "id": "cloud-solutions",
    "title": "Cloud Solutions",
    "description": "Scalable cloud infrastructure...",
    "color": "text-blue-600",
    "icon": "M3 15a4 4 0 004...",
    "image": "https://example.com/image.jpg"
  }
]
```

#### POST `/api/rate.php`
Submit a service rating
**Request:**
```json
{
  "service_id": "cloud-solutions",
  "rating": 5
}
```

#### GET `/api/get-ratings.php`
Fetch all service ratings
**Response:**
```json
{
  "cloud-solutions": {
    "average": 4.5,
    "count": 10
  }
}
```

### Admin Endpoints (Authentication Required)

#### POST `/api/admin/auth.php?action=login`
Admin login

#### POST `/api/admin/auth.php?action=logout`
Admin logout

#### POST `/api/admin/services.php`
Create a new service

#### PUT `/api/admin/services.php`
Update an existing service

#### DELETE `/api/admin/services.php`
Delete a service

## Technologies Used

- **Frontend:** HTML5, Tailwind CSS, Flowbite, JavaScript (ES6+)
- **Backend:** PHP 7.4+
- **Database:** Upstash Redis
- **Server:** Apache with mod_rewrite

## How It Works

### Frontend
1. Visitors view IT services on the homepage
2. Services are loaded dynamically from Upstash Redis
3. Each service displays icon, image (optional), title, and description
4. Visitors can anonymously rate services (1-5 stars)
5. Ratings are calculated and displayed in real-time

### Admin Panel
1. Admin logs in with credentials
2. View all services in a grid layout
3. Add/Edit/Delete services with full customization
4. Upload images or use external URLs
5. Changes reflect immediately on the public site

### Data Storage
- All services stored in Upstash Redis (`services_list` key)
- Ratings stored per service (`service:{id}:total` and `service:{id}:count`)
- Images stored as base64 strings or external URLs
- No local database required

## Notes

- Ratings are truly anonymous (no user tracking)
- Each visitor can rate services multiple times
- Ratings persist in Upstash Redis cloud database
- No local database required

## License

Free to use and modify for your IT solutions business.

