declare module '*.less';

interface Comment {
  subjectUrl: string,
  subjectTitle: string,
  subjectCover: string,
  userUrl: string,
  username: string,
  userAvatarElement: HTMLAnchorElement | HTMLSpanElement,
  comment: string,
  stars: number,
  date: Date,
}

interface Subject {
  url: string,
  title: string,
  cover: string,
}