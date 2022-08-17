type TabState = {
  text: string;
  cursor: string;
}

export class TabItem {

  private states = {
    loading: { text: "⏳", cursor: "wait" },
    done: { text: "共读", cursor: "pointer" },
  }
  li: HTMLLIElement = document.createElement("li");
  a: HTMLAnchorElement = document.createElement("a");

  constructor() {
    // initialize
    this.a.id = "tab_bsbc";
    this.applyState(this.states.loading);
    this.li.appendChild(this.a);

    document.getElementById('timelineTabs').appendChild(this.li);
  }

  private settingAnchor() {
    const a = document.createElement("a");
    a.text = "⚙️设置";
    a.style.cursor = "pointer";
    a.onclick = function () {
      (document.getElementById("dialog") as HTMLDialogElement).showModal();
    }
    const li = document.createElement("li");
    li.appendChild(a);
    return li;
  }

  private applyState(state: TabState) {
    this.a.text = state.text;
    this.a.style.cursor = state.cursor;
  }

  loaded(...nodes: (Node | string)[]) {
    this.applyState(this.states.done);
    // add onclick handler
    const a = this.a;
    this.a.onclick = function () {
      if (a.classList.contains("focus")) return;
      ["tab_all", "tab_say", "tab_subject", "tab_progress", "tab_blog"].forEach((id) => {
        document.getElementById(id).classList.remove("focus");
      });
      a.classList.add("focus");
      document.getElementById("timeline").replaceChildren(...nodes);
    };
    // add settings button
    document.getElementById('timelineTabs').appendChild(this.settingAnchor());
  }
}