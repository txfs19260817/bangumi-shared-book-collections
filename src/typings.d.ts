declare module '*.less';

interface Comment {
  subjectUrl: string,
  subjectTitle: string,
  subjectCover: string,
  userUrl: string,
  username: string,
  userAvatarElement: HTMLAnchorElement | HTMLSpanElement,
  comment: string,
  date: Date,
}