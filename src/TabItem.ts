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
    this.applyState(this.states.loading);
    this.li.appendChild(this.a);

    document.getElementById('timelineTabs').appendChild(this.li);
  }

  private applyState(state: TabState) {
    this.a.text = state.text;
    this.a.style.cursor = state.cursor;
  }

  loaded() {
    this.applyState(this.states.done);
  }
}