// Explicit compatibility surface for the existing HTML callbacks and scripts.
import {state} from './state.mjs';
import {API, BLOB_SAVE_LIMIT, MAX_TOOL_FILE_BYTES, MEDIA_JOB_TIMEOUT_MS, NATIVE_HANDOFF_START_TIMEOUT_MS, NATIVE_TRANSFER_TIMEOUT_MS, PREPARED_TRANSFER_IDLE_MS, PREPARED_TRANSFER_TIMEOUT_MS, YOUTUBE_WEB_ENABLED, bindSocketConnection, bindSocketDisconnection, bindSocketProgress, cancelBackendJob, createSocketClient, downloadThumbnail, ensureSocket, fetchMediaJob, handoffPreparedDownload, scheduleSocketDisconnect, triggerNativeDownload, waitForNativeTransfer} from './api.mjs';
import {bindClickRipple, bindModalKeyboard, bindModalState, closeOverlay, copyText, escapeHtml, handleOverlay, lockPageScroll, openDonate, openHistory, openOverlay, safeThumbHtml, scrollToTop, syncModalBackground, toast, toggleAccordion, unlockPageScrollIfIdle} from './ui.mjs';
import {TX, applyLang, bindLanguageChanges, detectLang, setLang, t} from './language.mjs';
import {DEFAULT_SETTINGS, DOWNLOAD_PROFILES, FILENAME_STYLES, PROFILE_FIELDS, S, activeDownloadProfile, applyAccessibilityPrefs, applyDownloadProfile, applyStUI, buildFilename, cleanSettings, clearZenithLocalData, exportSettings, getPlatformName, importSettings, insertFnfTag, loadSt, openSettings, profileNameKey, renderDownloadProfileUI, resetSettings, saveSt, setAccent, setChoice, setFilenameStyle, setFnfTemplate, setSettingValue, setTheme, showMobileSettingsHome, stChip, stTab, stToggle, syncBrowserThemeColor, updateFnfPreview} from './settings.mjs';
import {_looksLikeVideoLink, bindClipboardFocus, bindClipboardVisibility, bindMobileUrlEditing, bindMoreMenuDismissal, checkClipboardForLink, clearUrl, dismissClipboardHint, fireRadar, handleYoutubeAppRequired, hideQR, isValidUrl, isYT, onInput, pasteAndFetch, setMode, shouldRouteYoutubeToApps, showQR, showYoutubeAppRequired, showYtErr, toggleBulkMode, toggleMoreMenu, toggleServices, useClipboardHint} from './input.mjs';
import {cancelBulkDownloads, fetchBulkVideos} from './bulk.mjs';
import {PUBLIC_ERROR_TX, clearToolError, publicErrorMessage, renderToolError, showErr, showPublicError} from './errors.mjs';
import {fetchVideo} from './metadata.mjs';
import {QUEUE_STATE_KEY, bindDownloadControls, cancelPlaylistQueue, checkQueueResume, clearQueueState, closePlaylistQueue, discardQueue, hideQueueResumeHint, loadQueueState, openPlaylistDlModal, openPlaylistQueueModal, renderPlaylist, resumeQueue, runPlaylistQueue, saveQueueState, togglePlaylistItem, toggleSelectAllPlaylist, updatePlaylistSelCount} from './queue.mjs';
import {formatProgressBytes, openDlModal, progressMediaMeta, renderDownloadPlan, resetProgress, setProgress} from './progress.mjs';
import {cancelDownload, startDownload} from './download.mjs';
import {CONFETTI_COLORS, canCopySaveFile, canShareSaveFile, configureSaveModal, fireConfetti, openPreparedSaveModal, openSaveModal, releasePendingBlob, releaseUsedSaveLater, saveAction, saveFile, showSaveIssue} from './save.mjs';
import {OVERLAY_FOCUSABLE, _updateConvBtn, formatLocalFileSize, handleConvDrop, handleConvFile, handleRemuxDrop, handleRemuxFile, openConvert, openRemux, overlayReturnFocus, renderConvPreflight, renderRemuxSignal, resetRemuxDrop, selectConvFile, setConvFmt, showSelectedToolFile, startConvert, startRemux, updateConvBtn, validateToolFile} from './media-tools.mjs';
import {HISTORY_KEY, HISTORY_LIMIT, addToLocalHistory, clearHistory, getLocalHistory, loadHistory, reDownload, renderHomeActivity, saveLocalHistory} from './history.mjs';
import {DESKTOP_PROMO_DISMISS_KEY, DESKTOP_PROMO_SESSION_KEY, bindDesktopReminder, closeDesktopPromo, initDesktopPromo, initializeApplication} from './bootstrap.mjs';

const legacyApi = {
  API, YOUTUBE_WEB_ENABLED, downloadThumbnail, createSocketClient, ensureSocket, scheduleSocketDisconnect, cancelBackendJob, NATIVE_HANDOFF_START_TIMEOUT_MS, NATIVE_TRANSFER_TIMEOUT_MS, waitForNativeTransfer, triggerNativeDownload, BLOB_SAVE_LIMIT, MAX_TOOL_FILE_BYTES, MEDIA_JOB_TIMEOUT_MS, PREPARED_TRANSFER_TIMEOUT_MS, PREPARED_TRANSFER_IDLE_MS, fetchMediaJob, handoffPreparedDownload,
  escapeHtml, safeThumbHtml, syncModalBackground, lockPageScroll, unlockPageScrollIfIdle, openOverlay, handleOverlay, closeOverlay, openDonate, openHistory, toast, copyText, scrollToTop, toggleAccordion,
  TX, t, detectLang, applyLang, setLang,
  DEFAULT_SETTINGS, S, DOWNLOAD_PROFILES, PROFILE_FIELDS, profileNameKey, activeDownloadProfile, renderDownloadProfileUI, applyDownloadProfile, saveSt, cleanSettings, loadSt, applyAccessibilityPrefs, applyStUI, setTheme, setAccent, syncBrowserThemeColor, buildFilename, getPlatformName, updateFnfPreview, insertFnfTag, setFnfTemplate, FILENAME_STYLES, setFilenameStyle, openSettings, stTab, showMobileSettingsHome, stChip, stToggle, setSettingValue, setChoice, exportSettings, importSettings, resetSettings, clearZenithLocalData,
  setMode, toggleBulkMode, toggleServices, toggleMoreMenu, fireRadar, isYT, shouldRouteYoutubeToApps, showYoutubeAppRequired, handleYoutubeAppRequired, isValidUrl, onInput, clearUrl, pasteAndFetch, _looksLikeVideoLink, checkClipboardForLink, useClipboardHint, dismissClipboardHint, showYtErr, showQR, hideQR,
  fetchBulkVideos, cancelBulkDownloads,
  showErr, PUBLIC_ERROR_TX, publicErrorMessage, renderToolError, clearToolError, showPublicError,
  fetchVideo,
  renderPlaylist, togglePlaylistItem, toggleSelectAllPlaylist, updatePlaylistSelCount, openPlaylistDlModal, QUEUE_STATE_KEY, saveQueueState, clearQueueState, loadQueueState, hideQueueResumeHint, checkQueueResume, discardQueue, resumeQueue, openPlaylistQueueModal, runPlaylistQueue, cancelPlaylistQueue, closePlaylistQueue,
  openDlModal, progressMediaMeta, renderDownloadPlan, formatProgressBytes, setProgress, resetProgress,
  startDownload, cancelDownload,
  CONFETTI_COLORS, fireConfetti, releasePendingBlob, saveFile, canShareSaveFile, canCopySaveFile, configureSaveModal, showSaveIssue, openSaveModal, openPreparedSaveModal, releaseUsedSaveLater, saveAction,
  openRemux, formatLocalFileSize, validateToolFile, showSelectedToolFile, resetRemuxDrop, renderRemuxSignal, handleRemuxFile, startRemux, handleRemuxDrop, openConvert, renderConvPreflight, setConvFmt, selectConvFile, handleConvFile, handleConvDrop, _updateConvBtn, updateConvBtn, startConvert, overlayReturnFocus, OVERLAY_FOCUSABLE,
  HISTORY_KEY, HISTORY_LIMIT, getLocalHistory, saveLocalHistory, addToLocalHistory, renderHomeActivity, loadHistory, clearHistory, reDownload,
  DESKTOP_PROMO_SESSION_KEY, DESKTOP_PROMO_DISMISS_KEY, closeDesktopPromo, initDesktopPromo,
};
for (const [name,value] of Object.entries(legacyApi)) Object.defineProperty(window,name,{value,writable:true,configurable:true});
for (const key of Object.keys(state)) Object.defineProperty(window,key,{get:()=>state[key],set:value=>{state[key]=value;},configurable:true});
state.DOWNLOAD_POLICY_READY = import('/download-safety.js');
state.socket = createSocketClient();

bindMobileUrlEditing();
bindSocketConnection();
bindSocketDisconnection();
bindSocketProgress();
bindMoreMenuDismissal();
bindClipboardVisibility();
bindClipboardFocus();
bindDownloadControls();
bindModalKeyboard();
bindModalState();
bindClickRipple();
initializeApplication();
bindDesktopReminder();
bindLanguageChanges();
