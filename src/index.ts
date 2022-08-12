import { CommentParser } from "./CommentParser";
import { TabItem } from "./TabItem";

async function main() {
  const tabItem = new TabItem();
  const cp = new CommentParser();
  cp.fetchComments().then((data) => {
    tabItem.loaded();
    const tl = document.getElementById("timeline");
    // TODO: pagination?
    // FIXME: ugly access
    tabItem.a.onclick = function () {
      tabItem.a.classList.add("focus");
      tl.replaceChildren(cp.commentDataToTLList(data));
    };
  });
}

main().catch((e) => {
  console.log(e)
})
