import { CommentParser } from "./CommentParser";
import { createSettingsDialog } from "./Dialog";
import { TabItem } from "./TabItem";

/**
 * The main execution flow of the script.
 */
async function run() {
  // Initialize the tab item, checking for the 'disablesettings' configuration.
  const tabItem = new TabItem(!!GM_getValue("disablesettings"));

  // Create a CommentParser instance with user-defined settings.
  const cp = new CommentParser(
    GM_getValue("maxpages"),
    GM_getValue("maxresults"),
    !!GM_getValue("showstars"),
    GM_getValue("watchlist")
  );

  // Fetch comments and then update the UI.
  const comments = await cp.fetchComments();
  createSettingsDialog();
  tabItem.onLoaded(cp.commentDataToTLList(comments));
}

/**
 * Script entry point.
 * Wraps the main execution in a try-catch block to handle any unexpected errors.
 */
function main() {
  try {
    run();
  } catch (e) {
    console.error("An error occurred during script execution:", e);
  }
}

main();
