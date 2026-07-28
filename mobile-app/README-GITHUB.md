# GitHub Deployment Guide

## 1. Push the project to GitHub
- Create a repository on GitHub.
- Run:
  - git init
  - git add .
  - git commit -m "Initial mobile app setup"
  - git branch -M main
  - git remote add origin <your-repo-url>
  - git push -u origin main

## 2. Open in GitHub Codespaces or another environment
- Open the repo in GitHub Codespaces or VS Code.
- Install dependencies with:
  - cd mobile-app
  - npm install

## 3. Run locally
- cp .env.example .env
- npm start

## 4. Build for Android
- eas login
- eas build -p android --profile preview
