# Game Auto Helper

A lightweight Chrome extension for browser games that monitors the game's HP and SG values directly from the page DOM and triggers configurable F-key events inside the **locked game tab**.

It was built for a game HUD with these selectors:

- HP: `.progressbar.health.percent`
- SG: `.progressbar.summon`

## Features

- HP automation: press a configurable F1–F12 key when HP falls below a percentage threshold.
- SG automation: press a configurable F1–F12 key when SG falls below a percentage threshold.
- Independent HP and SG cooldowns.
- Timed key: optionally press a configurable F-key every N seconds.
- Saves settings with `chrome.storage.local`.
- Locks automation to one Chrome game tab.
- Uses DOM `MutationObserver` monitoring for HP/SG changes.
- Does **not** send OS/global keyboard input, so it is designed not to press F-keys in another application you are actively using.
- Test F1/F2/F3 buttons.

## How it works

The extension reads these game elements:

```html
<div class="progressbar health percent absolute">
  <div class="bar" style="width: 98.0698%;"></div>
  <div class="text">
    <div class="label absolute">17529 / 17874</div>
    <div class="label percent">98%</div>
  </div>
</div>
```

and:

```html
<div class="progressbar summon absolute">
  <div class="bar" style="width: 71.4286%;"></div>
  <div class="text">
    <div class="label absolute">50 / 70</div>
  </div>
</div>
```

HP is read from `.label.percent` (with bar width as a fallback). SG is calculated from the `current / maximum` text (with bar width as a fallback).

When a configured condition is met, the extension dispatches a JavaScript `KeyboardEvent` in the selected browser game's document. It does not use Windows/macOS-level keyboard simulation.

## Installation

1. Download or clone this repository.
2. If downloaded as a ZIP, extract it.
3. Open Chrome and go to `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the folder containing `manifest.json`.
7. Open/reload the browser game.

## Usage

1. Open the browser game's tab.
2. Click the **Game Auto Helper** extension.
3. Configure HP, SG, keys, cooldowns, and/or the timed key.
4. Click **LOCK THIS TAB & START** while the game tab is active.
5. Confirm the status shows `GAME TAB LOCKED` and `RUNNING`.
6. Use **STOP** before changing game tabs or configuration significantly.

Example configuration:

| Automation | Condition | Key | Cooldown |
|---|---|---|---|
| HP | Below 80% | F1 | 1000 ms |
| SG | Below 30% | F2 | 1000 ms |
| Timed key | Every 5 sec | F3 | — |

## Running while another application is focused

The automation is intentionally implemented inside the game tab. It does not generate a real/global F1/F2/F3 keyboard press. This means another foreground application (for example, another game) should not receive the extension's synthetic F-key events.

Chrome may throttle some background JavaScript activity. HP/SG detection uses `MutationObserver` to reduce dependence on rapid polling, but exact background timing is ultimately controlled by Chrome.

## Important limitations

- This is game-specific unless the target game uses the same DOM selectors.
- The target game must accept synthetic JavaScript keyboard events. Some browser games reject events where `event.isTrusted` is false.
- If the game changes its HTML/CSS structure, the selectors may need to be updated.
- Reloading/replacing the game tab can require locking/starting the extension again.
- A browser or game update can change behavior.
- The timed-key interval may be delayed when Chrome heavily throttles a background tab.
- This extension does not bypass anti-cheat or browser security controls.

## Customizing the selectors

The selectors are defined in `content.js`:

```js
document.querySelector('.progressbar.health.percent')
document.querySelector('.progressbar.summon')
```

To adapt the extension to another game, update `readHP()` and `readSG()` to match that game's DOM.

## Project structure

```text
game-auto-helper/
├── manifest.json
├── content.js
├── popup.html
├── popup.css
├── popup.js
├── README.md
├── LICENSE
└── .gitignore
```

## Permissions

The extension currently requests:

- `storage` — saves configuration.
- `tabs` — identifies and communicates with the selected game tab.
- `scripting` — injects the detector into the selected tab.
- `<all_urls>` host permission — allows manual use on browser-game pages regardless of domain.

For a private/forked deployment, you can reduce `<all_urls>` to the specific game domain.

## Privacy

The extension does not contain analytics, telemetry, advertising, or external network requests. Settings are stored locally in Chrome.

## Disclaimer

Use this project only where permitted by the game's rules/Terms of Service. Automation may be restricted or prohibited by some games and can carry account consequences.

## License

MIT. See [LICENSE](LICENSE).
