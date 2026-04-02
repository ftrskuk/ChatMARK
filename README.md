# ChatMARK

Lightweight bookmark tabs for ChatGPT web conversations.

ChatMARK lets you save important lines from a conversation and jump back to them later from a right-side bookmark rail.

## What it does

- Create bookmarks by selecting text in a conversation and pressing `MARK`
- Show saved bookmarks as color-coded tabs on a right-side rail
- Jump back to a bookmarked position with one click
- Reorder bookmarks with drag and drop
- Pin or expand bookmarks for easier scanning
- Search bookmarks on the current page
- Undo and redo bookmark actions

## Current support

- Works on:
  - `https://chatgpt.com/*`
  - `https://chat.openai.com/*`
- Manifest V3 Chrome extension
- Data is stored locally with the `storage` permission only

## Install

### Option 1: Load unpacked during development

```bash
npm install
npm run build:all
```

Then open Chrome and:

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` folder

### Option 2: Rebuild after changes

```bash
npm run build:all
```

If you are using the unpacked extension, refresh it in `chrome://extensions` after rebuilding.

## How to use ChatMARK

### 1. Create your first bookmark

1. Open a ChatGPT conversation
2. Select any sentence or paragraph in the chat
3. Click the `MARK` button that appears near the selection
4. Confirm or edit the label if needed

Your bookmark will appear in the right-side rail.

### 2. Jump back to saved content

- Click a bookmark tab in the rail to scroll back to that saved position
- ChatMARK will highlight the matched content to help you re-orient quickly

### 3. Organize bookmarks

- **Drag and drop** tabs to reorder them
- **Pin** a bookmark to keep it expanded or easier to inspect
- **Expand** a bookmark to view more of the saved text
- **Edit** a bookmark label when the auto-generated title is not enough
- **Delete** a bookmark when you no longer need it
- **Change colors** to visually group related bookmarks

### 4. Use the rail controls

At the top of the rail, ChatMARK provides controls for the current page:

- **Undo / Redo** bookmark actions
- **Search** within saved bookmarks
- **Collapse / expand** bookmark views
- **Adjust rail opacity**
- **Temporarily disable or re-enable** the rail UI

### 5. Search bookmarks on the current page

Use the rail search box to filter bookmarks by their:

- label
- snippet
- selected text

If no results match, ChatMARK will show that bookmarks still exist and the search is simply filtering them out.

### 6. Edit, recolor, and inspect saved text

- Use the bookmark actions to rename or remove a bookmark
- Open the saved-text popup when you want more context than the tab label shows
- Resize expanded saved-text notes when you want to compare larger sections
- Use bookmark colors to separate themes, tasks, or answer types in the same conversation

### 7. Use undo / redo

ChatMARK includes undo and redo controls for bookmark actions on the current page, which is useful when reorganizing or cleaning up a long conversation.

## Example workflow

ChatMARK works best when you use it as a lightweight reading and recall tool:

1. Save a few key answers while reading a long ChatGPT thread
2. Rename the important ones with meaningful labels
3. Drag the tabs into the order you want
4. Search the rail later to jump directly to a saved explanation, code block, or decision

## Privacy

- All bookmark data is stored locally on your device
- No data collection
- No external servers
- No analytics or tracking
- Only the `storage` permission is requested

## Development

### Build

```bash
npm run build:all
```

### Validation

```bash
npm run check
```

This runs formatting, linting, type checking, tests, and the production build.

## License

[MIT](LICENSE)
