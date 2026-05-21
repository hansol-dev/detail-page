import type { Notice } from "./types";

export function appliesToCategory(notice: Notice, category: string) {
  return !notice.categories?.length || notice.categories.includes(category);
}

export function filterNoticesForCategory(notices: Notice[], category: string) {
  return notices.filter((notice) => appliesToCategory(notice, category));
}

export function categoryLabelForNotice(notice: Notice) {
  return notice.categories?.length ? notice.categories.join(", ") : "전체";
}
