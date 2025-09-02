import { CommentParser } from "./CommentParser";
import { createSettingsDialog } from "./Dialog";
import { TabItem } from "./TabItem";
import { getValue } from "./utils";

/**
 * The main execution flow of the script.
 */
async function run() {
  // Initialize the tab item
  const tabItem = new TabItem();

  // Create a CommentParser instance with user-defined settings.
  const cp = new CommentParser(
    getValue("maxpages"),
    getValue("maxresults"),
    !!getValue("showstars"),
    getValue("watchlist")
  );

  // Fetch comments and then update the UI.
  const comments = await cp.fetchComments();
  createSettingsDialog(cp);
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
