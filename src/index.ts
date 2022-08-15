import { CommentParser } from "./CommentParser";
import { TabItem } from "./TabItem";
import { htmlToElement } from "./utils";

async function main() {
  const tabItem = new TabItem();
  const cp = new CommentParser(GM_getValue("maxpages"), GM_getValue("maxresults"));
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


  const dialog = htmlToElement<HTMLDialogElement>(`<dialog id="dialog"><form id="dialog-form" method="dialog"><p>提交后请刷新以生效设置</p><div><label for="maxpages">获取最近读过的前多少页条目的评论：</label> <input id="maxpages" name="maxpages" type="number" value="${GM_getValue("maxpages") || cp.MAX_PAGES}"/></div><div><label for="maxresults">最多显示评论的数目：</label> <input id="maxresults" name="maxresults" type="number" value="${GM_getValue("maxresults") || cp.MAX_RESULTS}"/></div><div class="buttons-wrapper"> <button type="submit">Submit</button> <button type="reset">Reset</button> </form></dialog>`);
  dialog.firstElementChild.addEventListener("submit", function (e) {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    [...data.entries()].forEach((kv) => {
      GM_setValue(kv[0], kv[1]);
    });
    dialog.close();
  });
  document.body.appendChild(dialog);
  GM_registerMenuCommand("设置", () => {
    dialog.showModal();
  });
}

main().catch((e) => {
  console.log(e)
})
