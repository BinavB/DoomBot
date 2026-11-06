export const approvalsChangedEvent = "doombot:approvals-changed";

export function announceApprovalsChanged(): void {
  window.dispatchEvent(new Event(approvalsChangedEvent));
}
