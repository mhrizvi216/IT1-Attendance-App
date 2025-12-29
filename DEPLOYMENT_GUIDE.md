# Deployment Guide - Hostinger

This guide will walk you through deploying the Attendance Management System to Hostinger.

## Prerequisites

1. **Hostinger Account** - Sign up at [hostinger.com](https://www.hostinger.com)
2. **Supabase Account** - Your database is already set up on Supabase
3. **Node.js** - Version 18 or higher recommended
4. **Git** - For version control

---

## Part 1: Supabase Configuration

### 1.1 Verify Supabase Setup

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings → API**
4. Copy your:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key**

### 1.2 Configure Supabase for Production

1. Go to **Authentication → Settings**
2. **Site URL**: Add your production domain (e.g., `https://yourdomain.com`)
3. **Redirect URLs**: Add your production URL with wildcards:
   ```
   https://yourdomain.com/**
   https://www.yourdomain.com/**
   ```
4. **Email Confirmation**: 
   - For production: Keep it enabled for security
   - For testing: Can be disabled temporarily

---

## Part 2: Prepare Your Application

### 2.1 Build the Application Locally (Test)

```bash
# Install dependencies
npm install

# Create production build
npm run build

# Test production build locally
npm start
```

If the build succeeds and the app runs, you're ready to deploy!

### 2.2 Prepare Environment Variables

Create a `.env.production` file (for reference, don't commit this):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NODE_ENV=production
```

**⚠️ Important**: Never commit `.env.production` or `.env.local` to Git!

---

## Part 3: Hostinger Deployment Options

Hostinger offers different hosting plans. Here are the recommended approaches:

### Option A: Hostinger VPS (Recommended for Node.js Apps)

If you have a VPS plan, you can run Next.js directly:

#### Step 1: Connect to Your VPS

```bash
ssh root@your-server-ip
```

#### Step 2: Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### Step 3: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

#### Step 4: Clone Your Repository

```bash
# Navigate to your web directory
cd /var/www

# Clone your repository (or upload files via FTP/SFTP)
git clone https://github.com/your-username/attendance-app.git
cd attendance-app

# Or if using FTP, upload all files to /var/www/attendance-app
```

#### Step 5: Install Dependencies

```bash
npm install --production
```

#### Step 6: Set Environment Variables

```bash
# Create .env.production file
nano .env.production
```

Add your environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NODE_ENV=production
PORT=3000
```

Save and exit (Ctrl+X, then Y, then Enter)

#### Step 7: Build the Application

```bash
npm run build
```

#### Step 8: Start with PM2

```bash
# Start the application
pm2 start npm --name "attendance-app" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### Step 9: Configure Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt-get install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/attendance-app
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/attendance-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 10: Setup SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

### Option B: Hostinger Shared Hosting (via FTP/SFTP)

For shared hosting plans, you'll need to use a different approach:

#### Step 1: Build the Application Locally

```bash
# On your local machine
npm install
npm run build
```

#### Step 2: Upload Files via FTP/SFTP

Upload the following to your hosting:
- `.next/` folder (entire build output)
- `public/` folder (if you have one)
- `package.json`
- `next.config.js`
- `node_modules/` (or install on server)

#### Step 3: Configure Environment Variables

Create `.env.production` on the server with your Supabase credentials.

#### Step 4: Install Node.js on Hostinger

Contact Hostinger support to enable Node.js on your shared hosting plan.

**Note**: Shared hosting may have limitations. Consider VPS for better performance.

---

### Option C: Static Export (If Hostinger Supports Static Sites)

If you want to try static export (with limitations):

1. Update `next.config.js`:
```javascript
const nextConfig = {
  output: 'export',
  // ... other config
}
```

2. Build:
```bash
npm run build
```

3. Upload the `out/` folder to your hosting.

**⚠️ Limitations**: This won't work with server-side features like authentication. VPS option is recommended.

---

## Part 4: Domain Configuration

### 4.1 Point Domain to Hostinger

1. Go to Hostinger Control Panel
2. Navigate to **Domains → DNS Zone Editor**
3. Add/Update A record:
   - **Type**: A
   - **Name**: @ (or leave blank)
   - **Value**: Your server IP address
   - **TTL**: 3600

4. Add CNAME for www:
   - **Type**: CNAME
   - **Name**: www
   - **Value**: yourdomain.com
   - **TTL**: 3600

### 4.2 Update Supabase Redirect URLs

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your production URLs to redirect URLs

---

## Part 5: Post-Deployment Checklist

### 5.1 Verify Deployment

- [ ] Application loads at your domain
- [ ] Sign up page works
- [ ] Sign in page works
- [ ] Dashboard displays correctly
- [ ] Reports page works
- [ ] Admin dashboard works (if admin user exists)

### 5.2 Security Checks

- [ ] SSL certificate is active (HTTPS)
- [ ] Environment variables are not exposed in client-side code
- [ ] Supabase RLS policies are active
- [ ] Error messages don't expose sensitive information

### 5.3 Performance Checks

- [ ] Page load times are acceptable
- [ ] Images/assets load correctly
- [ ] API calls to Supabase work
- [ ] No console errors in browser

---

## Part 6: Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Application Won't Start

1. Check PM2 logs:
```bash
pm2 logs attendance-app
```

2. Check if port 3000 is in use:
```bash
netstat -tulpn | grep :3000
```

3. Check environment variables:
```bash
pm2 env 0
```

### 404 Errors on Routes

- Ensure you're using Next.js properly (not static export)
- Check Nginx configuration
- Verify `.next` folder was uploaded completely

### Supabase Connection Issues

1. Verify environment variables are set correctly
2. Check Supabase project is active
3. Verify Site URL in Supabase matches your domain
4. Check browser console for specific error messages

---

## Part 7: Maintenance

### Updating the Application

```bash
# SSH into server
ssh root@your-server-ip

# Navigate to app directory
cd /var/www/attendance-app

# Pull latest changes (if using Git)
git pull

# Or upload new files via FTP/SFTP

# Install any new dependencies
npm install --production

# Rebuild
npm run build

# Restart PM2
pm2 restart attendance-app
```

### Monitoring

```bash
# View PM2 status
pm2 status

# View logs
pm2 logs attendance-app

# View resource usage
pm2 monit
```

### Backups

1. **Database**: Supabase handles backups automatically
2. **Code**: Use Git for version control
3. **Environment Variables**: Keep `.env.production` backed up securely

---

## Part 8: Alternative: Deploy to Vercel (Easier Option)

If Hostinger proves difficult, consider deploying to Vercel (free tier available):

1. Push code to GitHub
2. Connect GitHub repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

Vercel is specifically designed for Next.js and handles everything automatically.

---

## Quick Reference: Environment Variables

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

Optional (auto-set in production):
- `NODE_ENV=production`
- `PORT=3000` (default)

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Hostinger documentation
3. Check Supabase logs in dashboard
4. Review application logs (PM2 logs)

---

## Security Notes

- ✅ Never commit `.env` files to Git
- ✅ Use HTTPS in production
- ✅ Keep dependencies updated
- ✅ Monitor Supabase usage
- ✅ Enable Supabase email confirmation in production
- ✅ Use strong passwords for admin accounts

Good luck with your deployment! 🚀

