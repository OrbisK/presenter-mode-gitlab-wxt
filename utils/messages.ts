/** Popup/options -> background messages. */
export type BackgroundMessage =
  /** Re-register the content script for every permitted instance and report the result. */
  { type: 'sync-registration' };

export interface RegistrationStatus {
  /** Set when the last registration attempt failed. */
  error?: string;
}
