# OSH Mock Test

A practice app for the DGMS Manager's Certificate of Competency exam (First or Second Class, Coal or Metal).
It has 2,306 questions from the OSH&WC Code 2020 and the OSH&WC (Central) Rules 2026.

## Features
- **15 fixed mock papers** (Mock 1 to Mock 15, no question repeated across papers) plus a random mixed mock. Each follows the real exam pattern: 150 questions, 3 hours, 1 mark each, 0.25 marks off for each wrong answer, pass mark 75.
  - Mark questions for review and jump to any question from the question grid.
  - "Save and exit" pauses the test so you can resume it later.
  - The test submits automatically when the time runs out.
- **Topic drills** of 15 questions, with the answer, an explanation and the Section or Rule number shown after each question.
- **Practise my mistakes** and **drill my weakest topic**.
- **Results**: the net score, pass or fail, and accuracy by topic.
  - A review screen lets you filter questions by wrong, skipped or right.
  - The history screen shows a chart of your mock scores.
- **Several learners on one device**. Each learner's progress is saved separately in the browser.
- **Installable and works offline** (PWA) on phones and laptops, with light and dark mode.

## Hosting on GitHub Pages
1. Create a new repository on GitHub, for example `dgms-mock-test`.
2. Upload every file in this folder to the root of the repository, including the `icons` folder and the `.nojekyll` file.
3. In the repository, go to **Settings → Pages**. Under **Source**, choose **Deploy from a branch**, then select the `main` branch and `/ (root)`, and click **Save**.
4. After about a minute the app is live at `https://<your-username>.github.io/dgms-mock-test/`.

To install the app on Android, open the link in Chrome and choose **Install app**. On iPhone, open it in Safari and choose **Share → Add to Home Screen**.

## Updating the questions
- Replace `questions.json` with an updated file.
- Then increase the `CACHE` version in `sw.js` (for example `dgms-mock-v2`). This makes installed copies download the new files.

## Files
| File | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The app itself (plain HTML, CSS and JavaScript, with no build step) |
| `questions.json` | The question bank, with 15 topic areas and the exam settings |
| `manifest.webmanifest`, `sw.js` | The PWA install settings and offline cache |
| `icons/` | The app icon (an SVG source plus PNG sizes) |

## Notes
- Progress is stored in the browser on each device. If you clear the browser data, the progress is deleted, and it does not move between devices.
- The questions are for practice. Check the answers against the official text of the Code and the Rules.
