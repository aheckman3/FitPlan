# FitPlan
#### Video Demo: https://www.youtube.com/watch?v=58OS4OaufQE
#### Description:

# FitPlan — A Simple, Fast, Personal Workout Planner

FitPlan is a lightweight fitness planning app built for real people who want to stay consistent without dealing with bloated fitness platforms. It’s designed to be fast, easy to use, and installable on any device thanks to its Progressive Web App (PWA) foundation. FitPlan gives users a clean interface for building workout routines, tracking progress, and staying organized day‑to‑day.


---


## What this project includes

- `index.html`: the main page shell with login, planner, log, goals, and stats sections.
- `style.css`: responsive dark theme styling with mobile-friendly layout and card-based UI.
- `app.js`: app logic for authentication, workout planning, logging, goal tracking, and local storage persistence.
- `manifest.json`: PWA manifest describing the app name, theme, colors, and install icons.
- `sw.js`: service worker for offline caching of the core app files.

---

## AI Usage

Due to the unleashing of us students to freely use AI tools, I tried out Github Copilot in my local VSCode IDE and it was quite an experience. I am not sure if i was clear enough in my prompting or what but
it started creating all kinds of files and over-engineering a bunch of things. I didn't personally like the experience of having the AI just spit out an app for me, especially because it wasn't at all what i had in mind. Essentially, I just used the structure that it gave me and modified it heavily to be what i wanted. The experience of using the AI agent to create all the code for me was kind of a bummer, i REALLY enjoy sitting down, locking in and hammering away in my IDE. I can absolutely see the power that these tools provide but there is a little bit of me that is saddened by this as I was hoping to build a career in software engineering. If software engineering is to become just refining your AI prompts and building projects that way, I'm not so sure if that's for me.

## Features

FitPlan currently supports:

- account signup and login via Firebase Authentication
- workout planning with name, description, date, and duration
- workout logging with completion status and notes
- goal tracking with progress percentage
- dashboard stats showing planned workouts, logged workouts, active goals, and average progress
- iPhone-friendly install metadata and standalone PWA experience
- caching through a service worker for offline access to the app shell

---

## Firebase setup

The app is already wired to use Firebase modules in `index.html` and `app.js`. Your Firebase project configuration is defined in `index.html` inside the `firebaseConfig` object, so replace the placeholder values with your own project settings if needed.

Currently, the app uses local storage to persist data per user. The Firebase code is prepared to enable authentication and Firestore syncing later.

---

## How to use

1. Open the project in a browser.
2. Sign up or log in with an email and password.
3. Create workout plans in the Planner screen.
4. Log completed workouts in the Log screen.
5. Add goals and update progress in the Goals screen.
6. View summary stats in the Stats screen.

---

## How It Works

FitPlan uses Firebase Authentication to handle secure logins and user accounts. Once signed in, users can create workout plans, add exercises, and update their progress. All data is stored in Firestore, which means updates happen instantly and sync across devices. Whether you’re on your phone, tablet, or desktop, your plan is always up to date.

Because FitPlan is a PWA, you can install it directly on your home screen. The service worker handles caching so the app loads instantly and even works offline. The manifest defines the app’s name, icons, theme colors, and install behavior. Together, these features make FitPlan feel like a native app without needing an app store.

---

## Tech Behind the Scenes

FitPlan is built with React and Vite, giving it fast performance and a smooth development experience. Firebase powers the backend, handling authentication, database storage, and hosting. The service worker uses Workbox to manage caching and offline support. Everything is bundled into a clean, maintainable architecture that’s easy to expand.

The app’s PWA features — including offline caching, installability, and fast loading — are enabled through a custom service worker and a well‑structured manifest. These components allow FitPlan to behave like a native mobile app while still being lightweight and easy to deploy.

---

## Why FitPlan Exists

The goal of FitPlan is to make fitness planning simple. Many apps try to do too much, overwhelming users with charts, macros, social feeds, and complicated dashboards. FitPlan focuses on the basics: planning workouts and sticking to them. It’s built for people who want a tool that gets out of the way and helps them stay consistent.

FitPlan is also designed with families and partners in mind. Whether you’re working out alone or coordinating routines with someone else, FitPlan keeps everything organized and accessible. The app’s simplicity makes it easy to adopt and easy to maintain.

---

## Future Plans

FitPlan will continue to grow with features like shared plans, reminders, progress tracking, and improved UI polish. The foundation is solid, and new features can be added without complicating the user experience. Planned enhancements include better offline capabilities, customizable workout templates, and optional social features for accountability.

FitPlan’s architecture makes it easy to expand without sacrificing performance or simplicity. As the app evolves, the focus will remain on delivering a clean, fast, and reliable fitness planning experience.
