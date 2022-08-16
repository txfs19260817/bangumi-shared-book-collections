import { CommentParser } from "./CommentParser";
import { createSettingsDialog } from "./Dialog";
import { TabItem } from "./TabItem";

async function main() {
  createSettingsDialog();
  const tabItem = new TabItem();
  const cp = new CommentParser(GM_getValue("maxpages"), GM_getValue("maxresults"), GM_getValue("showstars"), GM_getValue("watchlist"));
  cp.fetchComments().then((data) => {
    tabItem.loaded();
    // TODO: pagination?
    // FIXME: ugly access
    tabItem.a.onclick = function () {
      ["tab_all", "tab_say", "tab_subject", "tab_progress", "tab_blog", tabItem.a.id].forEach((id) => {
        document.getElementById(id).classList.remove("focus");
      });
      tabItem.a.classList.add("focus");
      document.getElementById("timeline").replaceChildren(cp.commentDataToTLList(data));
    };
  });
}

main().catch((e) => {
  console.error(e);
})
