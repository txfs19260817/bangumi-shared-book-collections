import { TabItem } from "./TabItem";
import { commentDataToTLList, fetchComments, getUID } from "./utils";

async function main() {
  const uid = getUID();
  const tabItem = new TabItem();
  fetchComments(uid)
    .then((r) => {
      tabItem.loaded();
      const tl = document.getElementById("timeline");
      // TODO: pagination?
      // FIXME: ugly access
      tabItem.a.onclick = function () {
        tabItem.a.classList.add("focus");
        tl.replaceChildren(commentDataToTLList(r.slice(0, 100)));
      };
    });
}


main().catch((e) => {
  console.log(e)
})
