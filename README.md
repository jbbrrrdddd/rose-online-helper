# Game Auto Helper v3.0 — Multi-Tab

This version runs independently per Chrome tab.

## Multi-character use
1. Open Character A in Chrome tab A.
2. Open the extension while tab A is active, configure it, and click **START THIS TAB**.
3. Open Character B in Chrome tab B.
4. Open the extension while tab B is active, configure it, and click **START THIS TAB**.
5. Both tabs now have their own in-page automation instance and their own saved configuration.

Stopping one tab does not stop the others. Settings are stored under that Chrome tab's tab ID.

## HUD selectors
- HP: `.progressbar.health.percent`
- SG: `.progressbar.summon`

## Install
Open `chrome://extensions`, enable Developer mode, click **Load unpacked**, and select this folder.
Reload already-open game tabs once after installing/updating the extension.

## Notes
The extension dispatches synthetic JavaScript keyboard events inside each individual browser tab; it does not generate OS-global keystrokes. Chrome may still throttle background JavaScript timing. Use only where permitted by the game's rules.

## v3.1 Map/Zone Safety Guard

When **START THIS TAB** is pressed, the extension records the current map from:

```css
.titlebar .label.zone
```

Example: `Kenji Beach`.

If that label changes to a different non-empty map name, that tab immediately stops its HP automation, SG automation, and timed-key automation. Other game tabs remain independent and continue running unless their own map changes.

To resume on the new map, manually open the extension on that tab and press **START THIS TAB** again. The new map then becomes that tab's starting map.
