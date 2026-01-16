/**
 * AzuraCast Service
 * Main entry point - exports all functionality with backward compatibility
 */

// Re-export types (this is the single source of truth for types)
export * from './types';

// Re-export API client
export { apiClient, AzuraCastApiClient } from './api-client';

// Re-export module functions (but NOT their local type definitions)
export {
  getNowPlaying,
  getStationInfo,
  getAllStations,
  getSongHistory,
  getStationStatus,
  getListeners,
  disconnectListener,
} from './modules/now-playing';

export {
  getPlaylists,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  getPlaylistMedia,
  getRequestableSongs,
  submitSongRequest,
  requestSongFromPlaylist,
} from './modules/playlists';

export {
  getFiles,
  getAllMedia,
  getMediaCount,
  getMediaFile,
  searchMedia,
  updateMedia,
  deleteMedia,
  addToPlaylist,
  removeFromPlaylist,
  uploadMediaFromUrl,
} from './modules/media';

export {
  getQueue,
  removeFromQueue,
  clearQueue,
  requestSong,
} from './modules/queue';

export {
  getStreamers,
  createStreamer,
  updateStreamer,
  deleteStreamer,
} from './modules/streamers';

export {
  restartStation,
  startBackend,
  stopBackend,
  restartBackend,
  skipTrack,
  startFrontend,
  stopFrontend,
  restartFrontend,
  getStationConfig,
  updateStationConfig,
  getSchedule,
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
} from './modules/station-control';

export {
  getMounts,
  createMount,
  updateMount,
  deleteMount,
  getHlsStreams,
  getRemoteRelays,
  createRemoteRelay,
  deleteRemoteRelay,
} from './modules/mounts';

export type { 
  AzuraCastMount as AzuraCastMountDetail,
  CreateMountData,
  CreateRemoteRelayData,
} from './modules/mounts';

export {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
} from './modules/webhooks';

export {
  getListenerReport,
  getPerformanceReport,
  getSongRequestReport,
} from './modules/reports';

export {
  getSftpUsers,
  createSftpUser,
  deleteSftpUser,
} from './modules/sftp';

export {
  getPodcasts,
  createPodcast,
  deletePodcast,
  getPodcastEpisodes,
} from './modules/podcasts';

// Import for backward-compatible class
import { apiClient } from './api-client';
import * as nowPlaying from './modules/now-playing';
import * as playlists from './modules/playlists';
import * as media from './modules/media';
import * as queue from './modules/queue';
import * as streamers from './modules/streamers';
import * as stationControl from './modules/station-control';
import * as mounts from './modules/mounts';
import * as webhooks from './modules/webhooks';
import * as reports from './modules/reports';
import * as sftp from './modules/sftp';
import * as podcasts from './modules/podcasts';

/**
 * Backward-compatible service class that wraps the modular functions
 * @deprecated Use the individual module functions directly for better tree-shaking
 */
export class AzuraCastService {
  // Stream URLs
  getStreamUrl = () => apiClient.directStreamUrl;
  getPublicStreamUrl = () => apiClient.directStreamUrl;
  getStreamUrls = () => apiClient.getStreamUrls();
  extractStationIdFromUrl = (url: string) => apiClient.extractStationIdFromUrl(url);

  // Now Playing
  getNowPlaying = nowPlaying.getNowPlaying;
  getStationInfo = nowPlaying.getStationInfo;
  getAllStations = nowPlaying.getAllStations;
  getSongHistory = nowPlaying.getSongHistory;
  getStationStatus = nowPlaying.getStationStatus;
  getListeners = nowPlaying.getListeners;
  disconnectListener = nowPlaying.disconnectListener;

  // Playlists
  getPlaylists = playlists.getPlaylists;
  createPlaylist = playlists.createPlaylist;
  updatePlaylist = playlists.updatePlaylist;
  deletePlaylist = playlists.deletePlaylist;
  getPlaylistMedia = playlists.getPlaylistMedia;
  getRequestableSongs = playlists.getRequestableSongs;
  submitSongRequest = playlists.submitSongRequest;
  requestSongFromPlaylist = playlists.requestSongFromPlaylist;

  // Media
  getFiles = media.getFiles;
  getAllMedia = media.getAllMedia;
  getMediaCount = media.getMediaCount;
  getMediaFile = media.getMediaFile;
  searchMedia = media.searchMedia;
  updateMedia = media.updateMedia;
  deleteMedia = media.deleteMedia;
  addToPlaylist = media.addToPlaylist;
  removeFromPlaylist = media.removeFromPlaylist;
  uploadMediaFromUrl = media.uploadMediaFromUrl;

  // Queue
  getQueue = queue.getQueue;
  removeFromQueue = queue.removeFromQueue;
  clearQueue = queue.clearQueue;
  requestSong = queue.requestSong;

  // Streamers
  getStreamers = streamers.getStreamers;
  createStreamer = streamers.createStreamer;
  updateStreamer = streamers.updateStreamer;
  deleteStreamer = streamers.deleteStreamer;

  // Station Control
  restartStation = stationControl.restartStation;
  startBackend = stationControl.startBackend;
  stopBackend = stationControl.stopBackend;
  restartBackend = stationControl.restartBackend;
  skipTrack = stationControl.skipTrack;
  startFrontend = stationControl.startFrontend;
  stopFrontend = stationControl.stopFrontend;
  restartFrontend = stationControl.restartFrontend;
  getStationConfig = stationControl.getStationConfig;
  updateStationConfig = stationControl.updateStationConfig;
  getSchedule = stationControl.getSchedule;
  createScheduleEntry = stationControl.createScheduleEntry;
  updateScheduleEntry = stationControl.updateScheduleEntry;
  deleteScheduleEntry = stationControl.deleteScheduleEntry;

  // Mounts
  getMounts = mounts.getMounts;
  createMount = mounts.createMount;
  updateMount = mounts.updateMount;
  deleteMount = mounts.deleteMount;
  getHlsStreams = mounts.getHlsStreams;
  getRemoteRelays = mounts.getRemoteRelays;
  createRemoteRelay = mounts.createRemoteRelay;
  deleteRemoteRelay = mounts.deleteRemoteRelay;

  // Webhooks
  getWebhooks = webhooks.getWebhooks;
  createWebhook = webhooks.createWebhook;
  updateWebhook = webhooks.updateWebhook;
  deleteWebhook = webhooks.deleteWebhook;
  testWebhook = webhooks.testWebhook;

  // Reports
  getListenerReport = reports.getListenerReport;
  getPerformanceReport = reports.getPerformanceReport;
  getSongRequestReport = reports.getSongRequestReport;

  // SFTP
  getSftpUsers = sftp.getSftpUsers;
  createSftpUser = sftp.createSftpUser;
  deleteSftpUser = sftp.deleteSftpUser;

  // Podcasts
  getPodcasts = podcasts.getPodcasts;
  createPodcast = podcasts.createPodcast;
  deletePodcast = podcasts.deletePodcast;
  getPodcastEpisodes = podcasts.getPodcastEpisodes;

  // Legacy method stubs
  setAdminApiKey(_key: string) { /* No-op - API key handled by edge function */ }
  uploadFile(_file: File, _metadata?: unknown) { throw new Error('Use uploadMediaFromUrl instead'); }
  deleteFile = media.deleteMedia;
}

// Default singleton for backward compatibility
export const azuraCastService = new AzuraCastService();
