# Deployment Setup Guide

This repository includes GitHub Actions workflows for automated deployment to both GitHub Pages and Firebase Hosting.

## GitHub Pages Deployment

### Setup Instructions

1. **Enable GitHub Pages in your repository:**
   - Go to your repository on GitHub
   - Click on **Settings** → **Pages**
   - Under **Source**, select **GitHub Actions**

2. **No secrets required** - GitHub Pages deployment uses built-in `GITHUB_TOKEN` automatically.

3. **Trigger deployment:**
   - Push to the `master` branch, or
   - Manually trigger via **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**

4. **Access your site:**
   - After deployment, your site will be available at: `https://<username>.github.io/<repository>/`
   - For this repository: `https://proloser.github.io/screenwriter/`

## Firebase Hosting Deployment

### Prerequisites

You need a Firebase project. If you don't have one:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** or select an existing project
3. Follow the setup wizard

### Required Secrets

You need to add two secrets to your GitHub repository:

#### 1. `FIREBASE_SERVICE_ACCOUNT`

This is a service account key that allows GitHub Actions to deploy to Firebase.

**How to get it:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon (⚙️) → **Project settings**
4. Go to the **Service accounts** tab
5. Click **Generate new private key**
6. Click **Generate key** - this will download a JSON file
7. Open the JSON file and copy its entire contents
8. In your GitHub repository:
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: Paste the entire JSON content
   - Click **Add secret**

#### 2. `FIREBASE_PROJECT_ID`

This is your Firebase project ID.

**How to get it:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon (⚙️) → **Project settings**
4. Under **General** tab, copy the **Project ID**
5. In your GitHub repository:
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `FIREBASE_PROJECT_ID`
   - Value: Paste your project ID (e.g., `my-project-12345`)
   - Click **Add secret**

### Trigger Deployment

Once secrets are configured:
- Push to the `master` branch, or
- Manually trigger via **Actions** tab → **Deploy to Firebase Hosting** → **Run workflow**

### Access Your Site

After deployment, your site will be available at:
- `https://<your-project-id>.web.app`
- `https://<your-project-id>.firebaseapp.com`

## Workflows Overview

### Deploy to GitHub Pages (`deploy-github-pages.yml`)
- Triggers on push to `master` branch
- Builds the project (compiles SCSS and JSX)
- Deploys to GitHub Pages

### Deploy to Firebase Hosting (`deploy-firebase.yml`)
- Triggers on push to `master` branch
- Builds the project (compiles SCSS and JSX)
- Deploys to Firebase Hosting

## Build Process

Both workflows perform the following build steps:
1. Install npm dependencies
2. Install Bower globally and install Bower dependencies
3. Run `gulp sass` to compile SCSS to CSS
4. Run `gulp react` to compile JSX to JS

## Manual Deployment (Local)

If you want to deploy manually from your local machine:

### Firebase
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase init hosting

# Deploy
firebase deploy --only hosting
```

## Troubleshooting

### GitHub Pages
- Ensure GitHub Pages is enabled and set to use GitHub Actions
- Check the Actions tab for build/deployment errors
- Verify the `master` branch has the latest code

### Firebase
- Verify secrets are correctly set in repository settings
- Check that your Firebase project has Hosting enabled
- Review the Actions tab for detailed error messages
- Ensure your Firebase service account has the necessary permissions

## Notes

- Both deployments run on every push to `master` branch
- You can disable either workflow by removing or renaming the respective YAML file
- To deploy to a different branch, modify the `branches` section in the workflow files
