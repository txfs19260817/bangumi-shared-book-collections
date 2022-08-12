import { CommentParser } from "./CommentParser";
import { TabItem } from "./TabItem";

async function main() {
  const tabItem = new TabItem();
  const cp = new CommentParser();
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
  console.log(e)
})
