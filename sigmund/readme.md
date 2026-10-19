# Sigmund (modified version)

A browser-based video analysis tool for physics labs: load a video, set the scale, and click on a moving
object frame by frame to get position-versus-time data.

This is a modified version of **Sigmund** by Geoff Nunes (<https://noragulfa.com/sigmund/>), changed in 2026
to work more reliably on iPads and Macs (Safari, Chrome, Firefox). It is free software under the
**GNU General Public License, version 3** (see `COPYING`). The original author is not responsible for the
changes. What was changed is listed in `CHANGES.md` and in the About box.

## Running it

It is a plain static website (no build step, no server code).

* **Locally:** in this folder run `python3 -m http.server 8000`, then open <http://localhost:8000>.
* **Online:** upload the folder to any static host (Netlify, GitHub Pages, a school web server).
  Use **https**: Safari only allows the clipboard on secure pages. If copying is ever blocked, the
  **Download CSV** button still works.

Opening `index.html` straight from disk (`file://`) is not recommended: Safari blocks the clipboard there.

## Slow-motion (240 fps) videos

* A file that really is 240 fps shows **240 fps** under the video. Use a larger **Frame Advance** (for example 4
  or 8 frames per click); the table holds 100 points.
* Phones often store slow motion in a file that *plays* at 30 fps. The display then says **30 fps**. Tick
  **Use manual frame rate** and choose **240** so the time column uses the real capture rate.
* If a file's header cannot be read, the frame rate is estimated from playback and shown as **(est.)**.
  Check it, and use the manual frame rate if it is wrong.

## Check it on a real iPad (about 2 minutes)

The three clips in `test-videos/` show a frame number, a **1.00 m** scale bar, and a ball moving at exactly
**0.50 m/s**. For each: calibrate the white bar as 1 m, set t = 0 on the first frame, track the ball for
8 to 10 points, copy *x vs t* into Numbers or Sheets, and check the slope.

| Clip | What to expect |
|---|---|
| `qa_30fps_h264.mp4` | Says **30 fps**. At every step the Sigmund frame counter equals the "frame N" burned into the picture. Slope about 0.50 m/s. |
| `qa_240fps_h264.mp4` | Says **240 fps**, 480 frames. Use Frame Advance 12. Slope about 0.50 m/s. |
| `qa_slowmo_240fps_in_30fps_file.mov` | Says **30 fps**. Tick manual frame rate, choose 240, use Frame Advance 24. Slope about 0.50 m/s (without the manual setting you would get 0.0625 m/s). |

Also try: touch the video, slide, then lift to place a point; drag the progress bar; type `0,5` as a length;
rotate the iPad.

## What was tested

Automated tests in headless Chromium (Linux): frame-exact stepping on every frame forward and backward at
30, 60 and 240 fps, a mixed-speed file, and a 2-minute 28,800-frame file; touch, pen-style and mouse
placement at several window sizes; calibration, clipboard fallbacks, CSV, keyboard, the 100-row limit.
The MP4/MOV header reader was checked against `ffprobe` on H.264 (with B-frames), HEVC `.mov`, VP9,
audio-first and faststart files.

**Not tested:** real Safari / iPadOS, Firefox, or playback of H.264/HEVC inside a browser (the test browser
has no such decoders). The code uses only features present in Safari 13 / iPadOS 13 and later, but please
run the checklist above on an actual iPad and MacBook.

## Files

* `index.html`, `css/sigmund.css`, `js/sigmund.js`: the app (the script is not minified)
* `test-videos/`: the QA clips above
* `COPYING`: the GNU GPL v3 licence text
