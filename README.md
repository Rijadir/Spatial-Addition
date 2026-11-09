# Spatial Addition Test

https://rijadir.github.io/Spatial-Addition/

Spatial Addition is a browser-based working memory test. Each item presents two 5 × 5 dot grids in sequence, then asks the user to recreate their spatial sum.

## Test rules

- The test contains 18 items.
- Each source grid is displayed for 5 seconds.
- The 2 source grids are never identical.
- Each source grid contains at least one and at most 12 gray dots.
- The total number of source dots is the item number plus one.
- Matching positions combine into a black dot.
- Answer cells cycle through empty, gray, and black states with each click.
- The test ends after two failures or after all 18 items are completed.
- The score is the number of the last item passed.

## User information

The onboarding screen collects:

- Required nickname
- Required age
- Optional IQ score between 40 and 160

At the end of the test, the nickname, age, IQ score, and final score are sent to Web3Forms in `script.js`.

## Project files

- `index.html` — Page structure, onboarding, test screens, and results screen.
- `style.css` — Responsive monochrome visual design and layout.
- `script.js` — Randomized item generation, timing, answer handling, scoring, and submission.
