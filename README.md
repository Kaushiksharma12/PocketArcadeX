# PocketArcadeX 🎮

A modern, unified platform for classic board and arcade games. Built with Next.js and Capacitor, this project is fully responsive and can be deployed as a web application, Progressive Web App (PWA), or native mobile app for Android and iOS.

## 🕹️ Included Games

The platform currently includes the following games:
- ♟️ **Chess**
- 🔴 **Connect 4**
- 🎲 **Ludo**
- 🐍 **Snake**
- 🪜 **Snake & Ladders**
- ❌⭕ **Tic Tac Toe**

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **UI & Styling**: React, Tailwind CSS
- **Mobile**: [Capacitor](https://capacitorjs.com/) for Android & iOS packaging
- **PWA**: Fully functional as a Progressive Web App

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js (version 20 or later recommended) and npm installed.

### Installation

1. Install all dependencies:
   ```bash
   npm install
   ```

### Running Locally (Web)

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to launch the arcade platform.

### Building for Mobile (Capacitor)

This project uses Capacitor to bridge the web build into native mobile code.

1. Build the web assets and sync them with iOS/Android:
   ```bash
   npm run build:mobile
   ```
2. Open the respective native IDE (Android Studio or Xcode) to build and deploy to a device or emulator:
   ```bash
   npx cap open android
   # or
   npx cap open ios
   ```

## 📝 License
This project is open-source and free to use.
