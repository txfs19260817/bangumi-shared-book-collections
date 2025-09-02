import { t } from "./utils";

/**
 * Represents the state of the tab, including its display text and cursor style.
 */
type TabState = {
  text: string;
  cursor: string;
}

/**
 * Manages the "Shared Reading" tab in the timeline interface.
 * This class handles the creation, state management (loading, done),
 * and interactions of the tab.
 */
export class TabItem {

  /** Defines the possible states of the tab. */
  private states = {
    loading: { text: "⏳", cursor: "wait" },
    done: { text: t('shared_reading'), cursor: "pointer" },
  }
  /** The list item element for the tab. */
  li: HTMLLIElement = document.createElement("li");
  /** The anchor element within the tab. */
  a: HTMLAnchorElement = document.createElement("a");

  /**
   * Initializes a new instance of the TabItem class.
   */
  constructor() {
    // Initialize tab elements
    this.a.id = "tab_bsbc";
    this.applyState(this.states.loading);
    this.li.appendChild(this.a);

    // Add the tab to the timeline tabs list
    document.getElementById('timelineTabs')?.appendChild(this.li);
  }

  /**
   * Creates the settings gear anchor element and its parent list item.
   * @returns The list item element containing the settings anchor.
   */
  private createSettingsLink(): HTMLLIElement {
    const a = document.createElement("a");
    a.textContent = t('settings_gear');
    a.style.cursor = "pointer";
    a.onclick = () => {
      const dialog = document.getElementById("dialog") as HTMLDialogElement | null;
      dialog?.showModal();
    }
    const li = document.createElement("li");
    li.appendChild(a);
    return li;
  }

  /**
   * Applies a given state to the tab's anchor element.
   * @param state - The state to apply.
   */
  private applyState(state: TabState): void {
    this.a.textContent = state.text;
    this.a.style.cursor = state.cursor;
  }

  /**
   * Finalizes the tab's setup once content has loaded.
   * It sets the tab to the "done" state and attaches click handlers.
   * @param nodes - The DOM nodes to display when the tab is clicked.
   */
  public onLoaded(...nodes: (Node | string)[]): void {
    this.applyState(this.states.done);

    // Add onclick handler to switch tabs and display content
    this.a.onclick = () => {
      if (this.a.classList.contains("focus")) return;

      // De-select other tabs
      ["tab_all", "tab_say", "tab_subject", "tab_progress", "tab_blog"].forEach((id) => {
        document.getElementById(id)?.classList.remove("focus");
      });

      // Select this tab
      this.a.classList.add("focus");

      // Display the new content
      document.getElementById("timeline")?.replaceChildren(...nodes);
    };

    // Add settings button to the tab list
    document.getElementById('timelineTabs')?.appendChild(this.createSettingsLink());
  }
}