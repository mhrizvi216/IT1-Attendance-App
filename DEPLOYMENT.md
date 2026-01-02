# Deployment Guide

It looks like your application is failing in production because the **Supabase Environment Variables** are missing on Vercel.

The error `net::ERR_NAME_NOT_RESOLVED` for `placeholder.supabase...` happens because the app is falling back to dummy values when it can't find the real keys.

## 🚀 How to Fix

1.  **Go to Vercel Dashboard**:
    - Open your project in Vercel.
    - Click on **Settings** (top tab).
    - Click on **Environment Variables** (left sidebar).

2.  **Add the Missing Variables**:
    You need to add the exact same variables from your local `.env.local` file.

    | Key | Value |
    |-----|-------|
    | `NEXT_PUBLIC_SUPABASE_URL` | *Your Supabase Project URL* (e.g., `https://xyz.supabase.co`) |
    | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *Your Supabase Anon Key* (long string) |

3.  **Redeploy**:
    - After saving the variables, you must **Redeploy** for them to take effect.
    - Go to **Deployments** tab.
    - Click the three dots (`...`) on the latest deployment -> **Redeploy**.

## ✅ Verification
Once redeployed, the error `Missing Supabase environment variables!` will disappear from the console, and Login/Signup will work correctly.
