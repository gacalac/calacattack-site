# nPlot iPad edition (6.20i)

A fork of nPlot 6.20 by Geoff Nunes (https://noragulfa.com/nPlot/), adapted for iPads by Alan Calac, St. Ignatius College Prep, with the author's permission.

## Install

Upload this whole folder (index.html, nplot.js, nPlot.css, images/) to the web server, for example `calacattack.com/nplot/`. The site must be served over **https**, because Safari only allows clipboard access on secure pages.

**Font:** nPlot uses the Bahnschrift font, which Geoff serves from `noragulfa.com/fonts/`. That file is not included here. Without it, the page falls back to DIN Alternate on iPads and to the system sans-serif elsewhere, and the layout still fits. Bahnschrift is a Microsoft font, so check its license before you copy it to `fonts/bahnschrift.ttf` next to index.html.

## What changed

Every change in the code is marked with an `iPad edition` comment. `nplot-6.20i-changes.diff` (next to this folder) is a unified diff against the original 6.20, which makes it easy for Geoff to merge.

**iPad and touch**
- Pointer events on the graph. With a finger or Apple Pencil, you drag to position a note, fit, or arrow, then lift to drop it. The tangent finder follows your finger. While one of these is active, dragging on the graph does not scroll the page.
- Press-and-hold (or right-click) menus replace the ctrl/shift shortcuts:
  - Clear Data: clear sheet, clear all, or copy the sheet's data
  - Swap x & y: with or without the labels
  - Graph to Clipboard: copy, download PNG, open in a new tab, or show the image to save to Photos
  - Save Graph: save in the browser or save to a file
- Each saved graph has a × delete button, so the shift-click isn't needed.
- On iPads, Auto Zoom now uses a viewport meta tag, so Safari does the scaling, instead of a CSS transform on `<body>`. The transform shifted pop-ups and tap positions. Desktops keep the old behavior.
- Text inputs no longer get Safari's default styling. The label rows also stay on one line, which fixes the ")" that wrapped on iPads.
- The noragulfa.com logo on the front panel is replaced by a CalacAttack.com link. Geoff's credit and a link to the original are in the About box.
- Hover colors only apply on devices that can hover, so buttons don't stay grey after a tap.
- Graph to Clipboard creates the ClipboardItem inside the tap itself, which is the step Safari requires. If the clipboard still refuses, the graph appears in a pop-up where students can press and hold it to copy or save it.

**Features**
1. Error bars and fit uncertainties are hidden by default. There's a new "Show Error Bars" preference, and "Suppress Uncertainties" (now on by default) is remembered.
2. **Save to File / Open File** are in the Recall Graph panel. The file is `name.nplot.json` and holds the raw cell contents (including formulas and skip boxes), every sheet's model (including Advanced and Expert), labels, linearization, and annotation. On iPad, Save opens the share sheet (Files, Drive, AirDrop).
3. **Copy Slopes** (next to the tangent finder) copies the x value and slope at every data point as two tab-separated columns, in real units. Paste into a spreadsheet, or into an empty nPlot graph to get v vs. t from x vs. t. It works with the same curved models as the tangent finder. For a linear fit it explains that the slope is A.

**Bug fixes in the original 6.20 (for Geoff)**
- `cancelRecall()` referred to a non-existent element `recallConfirm`. It threw an error, and the Cancel button never closed the dialog.
- In `placeTitle()` a stray `s` sat before the closing brace of the linearization `switch`. It would throw if the default case were ever reached.
- The saved-graph format doesn't record the newer models (log, cosine, gaussian, ...) because they're missing from the `fitNumbers` table. Save to File stores model names, so it isn't affected.
- The tangent finder readout shows x and slope in axis-scaled units when the axis shows ×10ⁿ. Copy Slopes reports real units.

## Testing

A scripted self-test (39 checks) passed in desktop Chrome with simulated touch events. It covered:
- defaults
- error bars
- Copy Slopes values, including scaled axes
- touch tangent, note, and arrow placement
- the mouse path
- the export/import round trip
- long-press menus
- the recall dialog
- label layout
- clipboard feedback

It has **not** been run on a real iPad. Please check these on one:
1. Graph to Clipboard, then paste into Google Docs.
2. Drag a note and an arrow onto the graph with a finger.
3. Press and hold Clear Data.
4. Save to File, then Open File.
5. Copy Slopes, then paste into Sheet 2 of a new graph (press and hold a cell, then Paste).
6. Rotate the iPad and check that the page refits.
