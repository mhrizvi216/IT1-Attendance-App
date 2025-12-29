# Quick Deployment Guide - Hostinger

## Prerequisites Checklist

- [ ] Hostinger account with VPS or Node.js support
- [ ] Supabase project set up and configured
- [ ] Domain name (or temporary Hostinger domain)
- [ ] SSH access to your server (for VPS)

---

## Step-by-Step Deployment

### Step 1: Prepare Your Code

On your local machine:

```bash
# 1. Ensure all changes are committed
git add .
git commit -m "Production ready"
git push

# 2. Create production build to test
npm install
npm run build

# If build succeeds, proceed!
```

### Step 2: Connect to Hostinger VPS

```bash
# Connect via SSH (use credentials from Hostinger panel)
ssh root@your-server-ip
# Or: ssh username@your-server-ip
```

### Step 3: Install Required Software

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installation
node -v  # Should show v18.x.x
npm -v   # Should show 9.x.x

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx (web server)
apt install -y nginx
```

### Step 4: Upload Your Application

**Option A: Using Git (Recommended)**

```bash
# Navigate to web directory
cd /var/www

# Clone your repository
git clone https://github.com/your-username/your-repo.git attendance-app
cd attendance-app
```

**Option B: Using FTP/SFTP**

1. Use FileZilla or similar FTP client
2. Connect to your Hostinger server
3. Upload all project files to `/var/www/attendance-app`

### Step 5: Install Dependencies

```bash
cd /var/www/attendance-app

# Install production dependencies
npm install --production
```

### Step 6: Configure Environment Variables

```bash
# Create environment file
nano .env.production
```

Paste your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NODE_ENV=production
PORT=3000
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### Step 7: Build the Application

```bash
npm run build
```

Wait for build to complete. This may take a few minutes.

### Step 8: Start Application with PM2

```bash
# Start the app
pm2 start npm --name "attendance-app" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions it prints
```

### Step 9: Configure Nginx Reverse Proxy

```bash
# Create Nginx config
nano /etc/nginx/sites-available/attendance-app
```

Paste this configuration (replace `yourdomain.com` with your actual domain):

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

    # Increase timeout for long requests
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}
```

Enable the site:

```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/attendance-app /etc/nginx/sites-enabled/

# Remove default site (optional)
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### Step 10: Setup SSL Certificate (HTTPS)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts:
# - Enter your email
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (option 2)
```

### Step 11: Configure Supabase for Production

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Authentication → URL Configuration**
4. Update **Site URL** to: `https://yourdomain.com`
5. Add **Redirect URLs**:
   ```
   https://yourdomain.com/**
   https://www.yourdomain.com/**
   ```
6. Click **Save**

### Step 12: Test Your Deployment

1. Visit `https://yourdomain.com`
2. Try signing up a new user
3. Test sign in
4. Test all features (Start Work, Reports, etc.)

---

## Useful Commands

### View Application Logs

```bash
# View real-time logs
pm2 logs attendance-app

# View last 100 lines
pm2 logs attendance-app --lines 100
```

### Restart Application

```bash
pm2 restart attendance-app
```

### Stop Application

```bash
pm2 stop attendance-app
```

### View Application Status

```bash
pm2 status
```

### Monitor Resources

```bash
pm2 monit
```

### Update Application

```bash
cd /var/www/attendance-app

# If using Git:
git pull

# Rebuild
npm run build

# Restart
pm2 restart attendance-app
```

---

## Troubleshooting

### Application won't start

```bash
# Check logs
pm2 logs attendance-app

# Check if port is in use
netstat -tulpn | grep :3000

# Check environment variables
pm2 env 0
```

### 502 Bad Gateway

- Check if app is running: `pm2 status`
- Check Nginx error logs: `tail -f /var/log/nginx/error.log`
- Verify proxy_pass URL in Nginx config matches your app port

### Can't connect to Supabase

1. Verify environment variables: `pm2 env 0`
2. Check Supabase project is active
3. Verify Site URL in Supabase dashboard matches your domain
4. Check browser console for specific errors

### Build fails

```bash
# Clear cache
rm -rf .next node_modules

# Reinstall
npm install

# Rebuild
npm run build
```

---

## Temporary Domain Setup (Hostinger)

If using Hostinger's temporary domain:

1. **Get your temporary domain** from Hostinger control panel
   - Usually: `your-domain.hostingersite.com` or similar

2. **Update Nginx config** with temporary domain:
   ```nginx
   server_name your-domain.hostingersite.com;
   ```

3. **Update Supabase Site URL** to temporary domain:
   - Site URL: `https://your-domain.hostingersite.com`
   - Redirect URLs: `https://your-domain.hostingersite.com/**`

4. **Setup SSL** (optional but recommended):
   ```bash
   certbot --nginx -d your-domain.hostingersite.com
   ```

---

## Security Checklist

- [x] SSL certificate installed (HTTPS)
- [ ] Firewall configured (UFW recommended)
- [ ] Strong passwords for server access
- [ ] Environment variables secured
- [ ] Supabase RLS policies active
- [ ] Regular backups configured

---

## Next Steps

1. **Create Admin User**: Sign up normally, then update role in Supabase
2. **Monitor Performance**: Use `pm2 monit` to watch resources
3. **Setup Backups**: Configure automatic database backups in Supabase
4. **Custom Domain**: Update DNS when ready to use custom domain

---

## Need Help?

- Check `DEPLOYMENT_GUIDE.md` for detailed information
- Hostinger Support: Check your Hostinger control panel
- Supabase Docs: https://supabase.com/docs

Good luck! 🚀

