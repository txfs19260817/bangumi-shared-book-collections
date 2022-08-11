import { commentDataToTLList, createTabAnchor, fetchComments, getUID } from "./utils";

async function main () {
  console.log('script start');
  const uid = getUID();
  fetchComments(uid)
      .then((r) => {
          const tabAnchor = createTabAnchor();
          const tl = document.getElementById("timeline");
          // TODO: pagination?
          tabAnchor.onclick = function() {
              tabAnchor.classList.add("focus");
              tl.replaceChildren(commentDataToTLList(r.slice(0, 100)));
          };
      });
}


main().catch((e) => {
  console.log(e)
})
