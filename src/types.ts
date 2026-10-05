export type VisitEventProperties = Record<string, unknown>;

export type VisitRnSdkViewHandle = {
  /**
   * Sends a generic event into the Visit PWA. The PWA must implement
   * `window.sendEventToVisit(eventName, properties)`.
   */
  sendEvent: (eventName: string, properties?: VisitEventProperties) => void;
};

export type VisitRnSdkViewProps = {
  /**
   * Pre-generated Visit SSO URL used as the WebView source.
   */
  ssoLink?: string;
  /**
   * When true, the SDK logs diagnostic messages. Defaults to false.
   */
  isLoggingEnabled?: boolean;
  /**
   * Called for host-facing PWA messages (`sendEventToHost`).
   * Built-in methods stay internal.
   */
  onEvent?: (eventName: string, properties?: VisitEventProperties) => void;
};
