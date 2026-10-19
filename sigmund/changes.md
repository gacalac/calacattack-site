# Changes from Sigmund 2.16 (original by Geoff Nunes) to 2.16.1 (modified, 2026)

## Devices and browsers
* Touch, pen and mouse input through pointer events. With a finger or pen the crosshair follows you and the
  point is placed when you lift; mouse clicks place a point at once. Pen hover shows the crosshair.
* The layout is a fixed 1366 x 620 stage scaled to fit the screen (width and height) with `transform`,
  replacing the non-standard CSS `zoom`. Click positions come from the canvas's on-screen size, so they stay
  right at any scale. Added a viewport tag and a "turn your device sideways" tip.
* Videos play straight from the file (object URL). The original copied the whole file into a base64 string
  and read it a second time for frame timing, which can crash Safari on large files.
* The frame-timing table is read from the MP4/MOV header only (not the whole file) and is finished before the
  video is set up (the original could race). Files whose header cannot be read get an estimated frame rate
  measured from playback.
* Video set-up no longer depends on `canplaythrough` (not always sent by iOS Safari); `playsinline` added;
  the file picker also offers the Photos library.
* Icons are inline SVG and fonts are system fonts: nothing is downloaded from a font server.
* The text size is fixed at 16 px instead of following the browser's own "font size" setting. With a larger
  setting (for example Chrome > Settings > Appearance > Font size > Large) every label outgrew its fixed-size box
  and the interface looked crowded. Key labels also no longer wrap.
* Hover effects and tooltips only for real mice (no sticky highlights on touch); inputs are 16 px (no iOS
  zoom-on-focus); larger invisible touch targets.

## Things that needed a shift key
* "Skip step" button in the guided set-up; "Include headings" checkbox; press-and-hold on Measure clears
  measurements; Download CSV for when copying is blocked. Shift-click still works.

## Bug fixes
* Stepping or Frame Advance past the last frame set the video time to NaN; now clamped. An empty or invalid
  Frame Advance box counts as 1.
* The 101st data point threw an error; collection now stops with a message.
* Calibration lengths with a decimal comma ("0,5") were read as 5; a missing or zero length is refused.
* Arrow keys stepped the video while typing in a text box.
* Clipboard failures were silent; there is now a fallback method and a message.
* Time labels used the moment each frame *ended*; they now use when it *starts*. Identical for constant
  frame rates, but fixes labels when the frame rate changes inside a video (variable-speed slow motion).
* A clicked point is ignored while the video is still moving to the new frame.
* Tooltips could swallow the first click on the video after pressing Calibrate.
* Instructions, About and New video stay clickable during the guided set-up.
* The missing loading image made `drawImage` throw; replaced with a "Loading video..." message. The set-up
  overlay no longer starts when a file is refused.
* Misc: file names and units are inserted as text, not HTML; a corrected typo that left the "Set x = 0"
  cancel colour wrong; dropping a file outside the drop area no longer navigates away; storage errors in
  private browsing are tolerated; the manual frame-rate list no longer adds duplicate listeners.

## Not changed
* The 300 MB size limit, the 100-row table, the data format, and the look of the interface.
* The noragulfa.com logo image is not included; a credit link to the original is shown instead.
