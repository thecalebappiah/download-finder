# Real Download Button Finder

A Chrome extension (Manifest V3) that finds the real download button on a page and flags fake ad buttons that redirect you.

## Install (unpacked)
1. Go to `chrome://extensions` and enable Developer mode.
2. Click **Load unpacked** and select this folder.

## Use
Click the extension icon or press **Alt+D** on a download page.
- Green outline: most likely real download button
- Red dashed outline: likely fake or ad button

## How it scores
Points for a `download` attribute, direct file links, plain "Download" labels, and same-site links. Points against cross-site redirects, new-tab jumps, bait wording, and ad containers.

## License
MIT
