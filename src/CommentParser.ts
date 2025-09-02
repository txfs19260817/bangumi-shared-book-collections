import { fetchHTMLDocument, parseTimestamp, t } from "./utils";

/**
 * Parses comments from Bangumi user's book collection pages.
 */
export class CommentParser {
  /** The user ID of the current user. */
  uid: string = CommentParser.getUID();
  /** Maximum number of pages to fetch from the user's collection. */
  MAX_PAGES: number;
  /** Maximum number of comments to display. */
  MAX_RESULTS: number;
  /** Whether to show star ratings in the comments. */
  SHOW_STARS: boolean;
  /** A list of subject IDs to always fetch comments for. */
  WATCHLIST: string[];

  /**
   * Initializes a new instance of the CommentParser class.
   * @param max_pages - The maximum number of pages to fetch.
   * @param max_results - The maximum number of results to display.
   * @param show_stars - Whether to show star ratings.
   * @param watchlist - A list of subject IDs to watch.
   */
  constructor(max_pages: number = 5, max_results: number = 100, show_stars: boolean = true, watchlist: string[] = []) {
    this.MAX_PAGES = max_pages;
    this.MAX_RESULTS = max_results;
    this.SHOW_STARS = show_stars;
    this.WATCHLIST = watchlist;
  }

  /**
   * Fetches, parses, and returns comments from the user's collection.
   * @returns A promise that resolves to a sorted and filtered array of comments.
   */
  async fetchComments(): Promise<BgmComment[]> {
    const readCollectionURL = `${location.origin}/book/list/${this.uid}/collect`;
    const firstPage = await fetchHTMLDocument(readCollectionURL);
    const maxPageNum = this.getMaxPageNumber(firstPage);

    const pageUrls = Array.from({ length: Math.max(0, maxPageNum - 1) }, (_, i) => `${readCollectionURL}?page=${i + 2}`);
    const otherPages = await Promise.all(pageUrls.map(url => fetchHTMLDocument(url)));

    const allPages = [firstPage, ...otherPages];
    const subjects = this.extractSubjects(allPages);
    const watchlistSubjects = await this.fetchWatchlistSubjects(subjects);

    const allSubjects = [...watchlistSubjects, ...subjects];
    const comments = await this.fetchCommentDetails(allSubjects);

    return this.sortAndFilterComments(comments);
  }

  /**
   * Extracts subject details from the provided collection pages.
   * @param pages - An array of HTML documents representing collection pages.
   * @returns An array of subject objects.
   */
  private extractSubjects(pages: Document[]): Subject[] {
    return pages.flatMap(page =>
      Array.from(page.getElementById("browserItemList")?.children ?? [])
        .map(child => {
          const link = child.querySelector<HTMLAnchorElement>('a');
          const titleElement = child.querySelector<HTMLHeadingElement>('h3 a');
          const coverElement = child.querySelector<HTMLImageElement>('img');
          if (!link || !titleElement || !coverElement) return null;
          return {
            url: `${link.href}/comments`,
            title: titleElement.textContent?.trim() ?? '',
            cover: coverElement.src,
          };
        })
        .filter((subject): subject is Subject => subject !== null)
    );
  }

  /**
   * Fetches subjects from the watchlist that are not already in the provided list.
   * @param subjects - An array of already fetched subjects.
   * @returns A promise that resolves to an array of watchlist subjects.
   */
  private async fetchWatchlistSubjects(subjects: Subject[]): Promise<Subject[]> {
    if (!this.WATCHLIST || this.WATCHLIST.length === 0) {
      return [];
    }
    const existingSubjectIds = new Set<string>(subjects.map(s => s.url.split("/").at(-2)!));
    const watchlistIdsToFetch = this.WATCHLIST.filter(id => !existingSubjectIds.has(id));
    return this.sidsToSubjects(watchlistIdsToFetch);
  }

  /**
   * Converts a list of subject IDs to subject objects.
   * @param sids - An array of subject IDs.
   * @returns A promise that resolves to an array of subject objects.
   */
  private async sidsToSubjects(sids: string[]): Promise<Subject[]> {
    const subjectDocs = await Promise.all(sids.map(sid => fetchHTMLDocument(`${location.origin}/subject/${sid}/comments`)));
    return subjectDocs.map((doc, index) => {
      const sid = sids[index];
      return {
        url: `${location.origin}/subject/${sid}/comments`,
        title: doc.querySelector<HTMLAnchorElement>("#headerSubject > h1 > a")?.textContent ?? '',
        cover: doc.querySelector<HTMLImageElement>("#subject_inner_info > a > img")?.src ?? '',
      };
    });
  }

  /**
   * Fetches comment details for a list of subjects.
   * @param subjects - An array of subjects to fetch comments for.
   * @returns A promise that resolves to an array of all comments.
   */
  private async fetchCommentDetails(subjects: Subject[]): Promise<BgmComment[]> {
    const commentPages = await Promise.all(subjects.map(subject => fetchHTMLDocument(subject.url)));
    return commentPages.flatMap((page, i) => this.extractCommentsFromPage(page, subjects[i]));
  }

  /**
   * Extracts all comments from a single subject's comment page.
   * @param page - The HTML document of the comment page.
   * @param subject - The subject the comments belong to.
   * @returns An array of comments from the page.
   */
  private extractCommentsFromPage(page: Document, subject: Subject): BgmComment[] {
    const commentDivs = Array.from(page.getElementsByClassName("item clearit") as HTMLCollectionOf<HTMLDivElement>);
    return commentDivs.map((div) => this.parseCommentDivToBgmComment(div, subject)).filter(Boolean) as BgmComment[];
  }

  /**
   * Parses a single comment div into a BgmComment object.
   * @param commentDiv - The HTMLDivElement for the comment.
   * @param subject - The subject the comment belongs to.
   * @returns A BgmComment object or null if parsing fails.
   */
  parseCommentDivToBgmComment(commentDiv: HTMLDivElement, subject: Subject): BgmComment | null {
    try {
      const avatarElement = commentDiv.querySelector('.avatar > span') as HTMLSpanElement;
      const userUrl = `${location.origin}${commentDiv.querySelector('a.avatar')?.getAttribute('href')}`;
      const username = commentDiv.querySelector('.text_container .l')?.textContent ?? '';
      const dateText = commentDiv.querySelector('.text_container small:last-of-type')?.textContent?.split('@')[1]?.trim() ?? '';
      const commentText = commentDiv.querySelector('.text_container p')?.textContent ?? '';
      const starElement = commentDiv.querySelector('.starlight');
      const stars = starElement ? parseInt(starElement.className.match(/stars(\d+)/)?.[1] ?? '0', 10) : 0;

      return {
        subjectCover: subject.cover,
        subjectTitle: subject.title,
        subjectUrl: subject.url,
        userAvatarElement: this.createAvatarElement(avatarElement.style.backgroundImage, userUrl),
        userUrl,
        username,
        date: parseTimestamp(dateText),
        comment: commentText,
        stars
      };
    } catch (error) {
      console.error("Failed to parse comment div:", error, commentDiv);
      return null;
    }
  }

  /**
   * Creates an HTML element for a user's avatar.
   * @param imageUrl - The URL of the avatar image.
   * @param userUrl - The URL to the user's profile.
   * @returns An HTMLSpanElement representing the avatar.
   */
  private createAvatarElement(imageUrl: string, userUrl: string): HTMLSpanElement {
    const outerSpan = document.createElement('span');
    outerSpan.classList.add('avatar');

    const anchor = document.createElement('a');
    anchor.href = userUrl;
    anchor.classList.add('avatar');

    const imgSpan = document.createElement('span');
    imgSpan.classList.add('avatarNeue', 'avatarReSize40', 'll');
    imgSpan.style.backgroundImage = imageUrl;
    anchor.appendChild(imgSpan);

    outerSpan.appendChild(anchor);
    return outerSpan;
  }

  /**
   * Converts a list of comments into an HTML list element.
   * @param comments - An array of comments.
   * @returns An HTMLUListElement containing the rendered comments.
   */
  commentDataToTLList(comments: BgmComment[]): HTMLElement {
    const ul = document.createElement("ul");
    comments.forEach(comment => {
      const li = this.createDetailedLI(comment);
      ul.appendChild(li);
    });
    return ul;
  }

  /**
   * Creates a detailed list item element for a single comment.
   * @param comment - The comment object.
   * @returns An HTMLLIElement representing the comment.
   */
  private createDetailedLI(comment: BgmComment): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'clearit tml_item';

    // User Avatar
    li.appendChild(comment.userAvatarElement);

    // Subject Cover
    const coverAnchor = document.createElement('a');
    coverAnchor.href = comment.subjectUrl;
    coverAnchor.className = 'l rr';
    const coverSpan = document.createElement('span');
    coverSpan.className = 'cover';
    const img = document.createElement('img');
    img.src = comment.subjectCover;
    img.alt = comment.subjectTitle;
    img.width = 60;
    coverSpan.appendChild(img);
    coverAnchor.appendChild(coverSpan);
    li.appendChild(coverAnchor);

    // Main Info Container
    const infoSpan = document.createElement('span');
    infoSpan.className = 'info clearit';

    // Username and Action Text
    const userAnchor = document.createElement('a');
    userAnchor.href = comment.userUrl;
    userAnchor.className = 'l';
    userAnchor.textContent = comment.username;
    infoSpan.appendChild(userAnchor);

    infoSpan.appendChild(document.createTextNode(t('read_past_tense')));

    // Subject Title
    const subjectAnchor = document.createElement('a');
    subjectAnchor.href = comment.subjectUrl;
    subjectAnchor.className = 'l';
    subjectAnchor.textContent = comment.subjectTitle;
    infoSpan.appendChild(subjectAnchor);

    // Comment and Stars
    const collectInfoDiv = document.createElement('div');
    collectInfoDiv.className = 'collectInfo';
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    commentDiv.textContent = comment.comment;

    if (this.SHOW_STARS && comment.stars > 0) {
      const starsSpan = document.createElement('span');
      starsSpan.className = 'starstop-s';
      const starlightSpan = document.createElement('span');
      starlightSpan.className = `starlight stars${comment.stars}`;
      starsSpan.appendChild(starlightSpan);
      commentDiv.appendChild(starsSpan);
    }
    collectInfoDiv.appendChild(commentDiv);
    infoSpan.appendChild(collectInfoDiv);

    // Post Date
    const dateDiv = document.createElement('div');
    dateDiv.className = 'post_actions date';
    dateDiv.textContent = comment.date.toLocaleString();
    infoSpan.appendChild(dateDiv);

    li.appendChild(infoSpan);

    return li;
  }

  /**
   * Gets the maximum page number from the pagination control.
   * @param firstPage - The HTML document of the first collection page.
   * @returns The maximum page number to fetch.
   */
  private getMaxPageNumber(firstPage: Document): number {
    const paginator = firstPage.querySelector('.page_inner');
    if (!paginator) return 1;

    const pageLinks = Array.from(paginator.querySelectorAll<HTMLAnchorElement>('a.p'))
      .map(node => parseInt(node.href.match(/page=(\d+)$/)?.[1] ?? '0', 10));
    const maxPage = Math.max(1, ...pageLinks);

    return Math.min(this.MAX_PAGES, maxPage);
  }

  /**
   * Sorts and filters the comments.
   * @param comments - The array of comments to process.
   * @returns A sorted and filtered array of comments.
   */
  private sortAndFilterComments(comments: BgmComment[]): BgmComment[] {
    return comments
      .filter(comment => comment && !comment.userUrl.includes(this.uid)) // Filter out own comments
      .sort((a, b) => b.date.getTime() - a.date.getTime()) // Sort by date descending
      .slice(0, this.MAX_RESULTS); // Limit results
  }

  /**
   * Gets the current user's ID from the page header.
   * @returns The user ID.
   */
  static getUID(): string {
    const link = document.querySelector<HTMLAnchorElement>("#headerNeue2 .idBadgerNeue a");
    return link?.href.split("user/")?.[1] ?? '';
  }
}
