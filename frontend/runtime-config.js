// The hosted site intentionally leaves this unset and uses api.zenithw.space.
// Docker Compose replaces this file with the self-hosted same-origin API path.
window.ZENITHW_API = window.ZENITHW_API || "";

// The hosted site temporarily hands YouTube links to the device apps. This is
// intentionally a switch so the normal web flow can be restored later.
window.ZENITHW_YOUTUBE_WEB_ENABLED = false;
