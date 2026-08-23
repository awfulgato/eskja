# Eskja Segl + Poki v0

Firefox WebExtension pilot for the Segl / poki interaction described in `ESKJA.md`.

The current path is:

`web page -> Segl -> poki -> choose eskja -> keep -> acquisition -> Supabase -> chosen eskja`

## Interaction model

- The Eskja toolbar button opens one compact popup. There is no persistent Firefox sidebar.
- Segl is global rather than tab-specific. Turn it on once and it remains active while moving through ordinary tabs until turned off.
- While Segl is on, hover a normal webpage image or select actual webpage text. The deliberately crude red `S` appears.
- Clicking `S` gathers the chosen thing silently into poki. Browsing layout does not move and poki does not auto-open.
- The toolbar badge shows the number of things currently carried in poki.
- Click the Eskja toolbar button whenever you want to inspect poki, remove something, clear it, choose a destination, toggle Segl, or press `keep`.

## Poki behavior

- Poki persists in `browser.storage.local`, so gathered things survive tab changes.
- Text is stored directly as text plus source-page information.
- Images are stored only as lightweight gathering records: candidate URLs already exposed by the selected image, dimensions, page information, and fallback geometry. Poki does not download or render the full image file while gathering.
- The `keep to` chooser reads the real lids in `storeskja-husbond` and uses each lid's `target_board` as the receiving eskja. The last chosen destination is remembered locally.
- Pressing `keep` resolves each image only then: it tries the best declared candidate first and falls through other candidates if needed. Image-specific visual capture remains a last fallback when the original source tab is still available in the required state.
- Kept images are uploaded to the existing `board-images` Supabase bucket and inserted into `board_items` for the chosen eskja.
- Kept text is inserted into `board_items` as a movable note/text thing in the chosen eskja.
- Successfully kept poki items are removed. Failed items remain in poki and are visibly marked for retry/removal.

Segl still never scans, crawls, enumerates, or prefetches the rest of the page.

## Firefox development install / reload

1. Open `about:debugging#/runtime/this-firefox`.
2. Remove the old temporary Eskja extension.
3. Choose **Load Temporary Add-on…**.
4. Select the current `harvest-extension/manifest.json` from the `media-update` download.
5. Click the Eskja toolbar button. In the popup, turn **segl on**.
6. Close the popup and browse normally across tabs.
7. Hover an image or select text and click the red `S`. The toolbar badge count should rise without opening any sidebar.
8. Click the Eskja toolbar button to inspect poki.
9. Choose the receiving eskja under **keep to**.
10. Press **keep** and refresh that eskja to confirm the things arrived.

## Next functional extension work

- Gather browser-recognized video and audio things into Poki without downloading them until keep.
- Improve source/retry reporting for things that genuinely cannot be gathered.
- Package the same interaction for Chrome once the Firefox pilot behavior is settled.
- Replace the crude pilot styling with the Eskja visual language without making Poki into a miniature workspace.
