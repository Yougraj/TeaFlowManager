# TeaFlow Manager - Valley Moss Estates

Commercial-grade tea estate management platform for tracking plucking yields, managing workers, and syncing data to Google Sheets.

## Deployment on Netlify

This project is optimized for deployment on Netlify using Netlify Functions.

1. **Connect your repository** to Netlify.
2. **Environment Variables**: Set the following in Netlify (Site Settings > Build & Deploy > Environment):
   - `MONGODB_URI`: Your MongoDB connection string.
   - `VITE_FIREBASE_API_KEY`: Firebase API Key.
   - `VITE_FIREBASE_AUTH_DOMAIN`: Firebase Auth Domain.
   - `VITE_FIREBASE_PROJECT_ID`: Firebase Project ID.
   - `VITE_FIREBASE_STORAGE_BUCKET`: Firebase Storage Bucket.
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`: Firebase Sender ID.
   - `VITE_FIREBASE_APP_ID`: Firebase App ID.
3. **Build Settings**:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
   - Functions Directory: `functions`

## Features

- **Dashboard**: Real-time analytics of yields and sales.
- **Worker Management**: Track worker details and performance.
- **Harvest Logging**: Daily yield entry with worker-level granularity.
- **Sales Tracking**: Log sales and manage inventory.
- **Google Sheets Sync**: Real-time export of data for corporate reporting.

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express (running as Netlify Functions).
- **Database**: MongoDB (Atlas recommended).
- **Auth**: Firebase Authentication (Google Sign-In).
