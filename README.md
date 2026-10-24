# Assignment Tracking System (Firebase edition)

Same features as before (classes, assignments, attendance, public holidays, parent weekly PDF/ZIP reports), now with:

- Email/password login (no sign-up page; accounts are created by the developer)
- Firebase Firestore instead of browser `localStorage`, so data follows the account across devices
- Per-account school name and logo, editable by an admin in **School settings**
- Redesigned UI (sidebar layout, large tap-friendly marking rows, mobile friendly, dark mode)

## Files

| File | Purpose |
|---|---|
| `firebase-config.js` | **Paste your Firebase web config here** |
| `app.js` | Shared module: Firebase init, auth guard, data store, sidebar/top bar, helpers |
| `style.css` | All styling (replaces `mystyle.css`) |
| `login.html` | Sign-in page |
| `index.html`, `classes.html`, `assignment.html`, `attendance.html`, `view.html`, `viewAttendance.html`, `report.html` | Same pages as before |
| `admin.html` | Admin-only: edit school name + logo per account |
| `firestore.rules` | Security rules (publish these) |
| `logo.png` | Keep your existing file. It is the default logo for accounts without a custom one |

## One-time Firebase setup

1. **Create a project** at https://console.firebase.google.com.
2. **Add a Web app** (`</>` icon) and copy the config into `firebase-config.js`.
3. **Authentication → Sign-in method →** enable **Email/Password**.
4. **Firestore Database → Create database** (production mode, pick a region close to you, e.g. `asia-southeast1`).
5. **Firestore → Rules →** paste `firestore.rules` and **Publish**.
6. **Authentication → Settings → Authorized domains →** add the domain you host on (e.g. `calvin2242.github.io`).

## Adding a school account (developer only)

Each account needs **two** things:

1. **Authentication → Users → Add user** (email + password). Copy the new user's **UID**.
2. **Firestore → Start collection `users`** (first time only), then add a document whose **Document ID is that UID**:

| Field | Type | Example |
|---|---|---|
| `schoolName` | string | `SK Taman Maju` |
| `email` | string | `teacher@school.edu.my` |
| `role` | string | `user` (or `admin`) |
| `logo` | string | leave empty; an admin sets it in the app |

Make at least one account `role: admin`. Admins see **School settings** in the sidebar and can change any account's school name and logo.

**Why step 2 matters:** the security rules only allow accounts that have a `users/{uid}` document. Even if someone found a way to register through Firebase's API (the web app has no sign-up page, but Firebase Auth itself allows sign-ups while Email/Password is enabled), they could not read or write anything. If your console offers *Authentication → Settings → User actions → "Enable create (sign-up)"*, switch it off for extra protection.

## Hosting

The pages use ES modules, so they must be served over `http(s)`, not opened as `file://`. GitHub Pages works: Settings → Pages → deploy from `main`. For local testing use `npx serve` or VS Code Live Server.

## Moving existing data

Teachers who used the old version on a browser will see an **Import now** banner on Home the first time they sign in on that browser. It copies the old classes, assignments, attendance and attendance-class setting into their account. Nothing is deleted from the browser.

## Data layout

```
users/{uid}                       profile: schoolName, email, role, logo (data URL), updatedAt
users/{uid}/classes/{id}          { name, students: [names] }
users/{uid}/assignments/{id}      { classId, className, title, subject, dateCreated, createdAt, students: [{name, submitted, remarks}] }
users/{uid}/attendance/{id}       { classId, className, date, isPublicHoliday, students: [{name, present, leftEarly, reason}] }
users/{uid}/settings/prefs        { headClassId }
```

Logos are resized to 256 px in the browser and stored as a small data URL on the profile document. This avoids needing Firebase Storage, which requires a paid plan on newer projects.

## Small behaviour changes

- Editing a class now applies when you press **Save changes** (before, removing a student saved immediately).
- Weekly report: public holidays are only counted if they fall inside that Mon–Fri week, and student names containing `/` (e.g. "a/l") no longer break PDF file names.
- Student names are escaped everywhere they're displayed.
- Native `alert`/`confirm` popups became in-page dialogs and toasts.
