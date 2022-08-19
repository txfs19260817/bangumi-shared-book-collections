import { CommentParser } from "./CommentParser";
import { createSettingsDialog } from "./Dialog";
import { TabItem } from "./TabItem";

async function main() {
  const tabItem = new TabItem(!!GM_getValue("disablesettings"));
  const cp = new CommentParser(GM_getValue("maxpages"), GM_getValue("maxresults"), !!GM_getValue("showstars"), GM_getValue("watchlist"));
  cp.fetchComments().then((data) => {
    createSettingsDialog();
    tabItem.loaded(cp.commentDataToTLList(data)); // TODO: pagination?
  });
}

main().catch((e) => {
  console.error(e);
})
