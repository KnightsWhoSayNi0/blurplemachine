const VoiceEngine = require('./discord_voice.node');
const ChildProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const yargs = require('yargs');

const isElectronRenderer =
  typeof window !== 'undefined' && window != null && window.DiscordNative && window.DiscordNative.isRenderer;

const appSettings = isElectronRenderer ? window.DiscordNative.settings : global.appSettings;
const features = isElectronRenderer ? window.DiscordNative.features : global.features;
const mainArgv = isElectronRenderer ? window.DiscordNative.processUtils.getMainArgvSync() : [];
let dataDirectory;

try {
  dataDirectory =
    isElectronRenderer && window.DiscordNative.fileManager.getModuleDataPathSync
      ? path.join(window.DiscordNative.fileManager.getModuleDataPathSync(), 'discord_voice')
      : null;
} catch (e) {
  console.error('Failed to get data directory: ', e);
}

const releaseChannel = isElectronRenderer ? window.DiscordNative.app.getReleaseChannel() : '';
const useLegacyAudioDevice = appSettings ? appSettings.getSync('useLegacyAudioDevice') : false;
const audioSubsystemSelected = appSettings ? appSettings.getSync('audioSubsystem') : 'standard';
const audioSubsystem = useLegacyAudioDevice || audioSubsystemSelected;
const debugLogging = appSettings ? appSettings.getSync('debugLogging') : false;

const argv = yargs(mainArgv.slice(1))
  .describe('log-level', 'Logging level.')
  .default('log-level', -1)
  .help('h')
  .alias('h', 'help')
  .exitProcess(false).argv;
const logLevel = argv['log-level'] == -1 ? (debugLogging ? 2 : -1) : argv['log-level'];

if (dataDirectory != null) {
  try {
    fs.mkdirSync(dataDirectory, {recursive: true});
  } catch (e) {
    console.warn("Couldn't create voice data directory ", dataDirectory, ':', e);
  }
}

if (debugLogging && console.discordVoiceHooked == null) {
  console.discordVoiceHooked = true;

  for (const logFn of ['trace', 'debug', 'info', 'warn', 'error', 'log']) {
    const originalLogFn = console[logFn];

    if (originalLogFn != null) {
      console[logFn] = function () {
        originalLogFn.apply(this, arguments);

        try {
          VoiceEngine.consoleLog(
            logFn,
            JSON.stringify(Array.from(arguments).map((v) => (v != null ? v.toString() : v)))
          );
        } catch (e) {
          // Drop errors from toString()/stringify.
        }
      };
    }
  }
}

features.declareSupported('voice_panning');
features.declareSupported('voice_multiple_connections');
features.declareSupported('media_devices');
features.declareSupported('media_video');
features.declareSupported('debug_logging');
features.declareSupported('set_audio_device_by_id');
features.declareSupported('set_video_device_by_id');
features.declareSupported('loopback');
features.declareSupported('experiment_config');
features.declareSupported('remote_locus_network_control');
features.declareSupported('connection_replay');
features.declareSupported('simulcast');
features.declareSupported('simulcast_bugfix');
features.declareSupported('direct_video');
features.declareSupported('electron_video');

if (process.platform === 'win32' || process.platform === 'darwin') {
  features.declareSupported('soundshare');
}

if (process.platform === 'win32') {
  features.declareSupported('voice_legacy_subsystem');
  features.declareSupported('wumpus_video');
  features.declareSupported('hybrid_video');
  features.declareSupported('elevated_hook');
  features.declareSupported('soundshare_loopback');
  features.declareSupported('screen_previews');
  features.declareSupported('window_previews');
  features.declareSupported('audio_debug_state');
  features.declareSupported('video_effects');
  features.declareSupported('voice_experimental_subsystem');
  // NOTE(jvass): currently there's no experimental encoders! Add this back if you
  // add one and want to re-enable the UI for them.
  // features.declareSupported('experimental_encoders');
}

function bindConnectionInstance(instance) {
  return {
    destroy: () => instance.destroy(),

    setTransportOptions: (options) => instance.setTransportOptions(options),
    setSelfMute: (mute) => instance.setSelfMute(mute),
    setSelfDeafen: (deaf) => instance.setSelfDeafen(deaf),

    mergeUsers: (users) => instance.mergeUsers(users),
    destroyUser: (userId) => instance.destroyUser(userId),

    setLocalVolume: (userId, volume) => instance.setLocalVolume(userId, volume),
    setLocalMute: (userId, mute) => instance.setLocalMute(userId, mute),
    setLocalPan: (userId, left, right) => instance.setLocalPan(userId, left, right),
    setDisableLocalVideo: (userId, disabled) => instance.setDisableLocalVideo(userId, disabled),

    setMinimumOutputDelay: (delay) => instance.setMinimumOutputDelay(delay),
    getEncryptionModes: (callback) => instance.getEncryptionModes(callback),
    configureConnectionRetries: (baseDelay, maxDelay, maxAttempts) =>
      instance.configureConnectionRetries(baseDelay, maxDelay, maxAttempts),
    setOnSpeakingCallback: (callback) => instance.setOnSpeakingCallback(callback),
    setOnSpeakingWhileMutedCallback: (callback) => instance.setOnSpeakingWhileMutedCallback(callback),
    setPingInterval: (interval) => instance.setPingInterval(interval),
    setPingCallback: (callback) => instance.setPingCallback(callback),
    setPingTimeoutCallback: (callback) => instance.setPingTimeoutCallback(callback),
    setRemoteUserSpeakingStatus: (userId, speaking) => instance.setRemoteUserSpeakingStatus(userId, speaking),
    setRemoteUserCanHavePriority: (userId, canHavePriority) =>
      instance.setRemoteUserCanHavePriority(userId, canHavePriority),

    setOnVideoCallback: (callback) => instance.setOnVideoCallback(callback),
    setVideoBroadcast: (broadcasting) => instance.setVideoBroadcast(broadcasting),
    setDesktopSource: (id, videoHook, type) => instance.setDesktopSource(id, videoHook, type),
    setDesktopSourceWithOptions: (options) => instance.setDesktopSourceWithOptions(options),
    clearDesktopSource: () => instance.clearDesktopSource(),
    setDesktopSourceStatusCallback: (callback) => instance.setDesktopSourceStatusCallback(callback),
    setOnDesktopSourceEnded: (callback) => instance.setOnDesktopSourceEnded(callback),
    setOnSoundshare: (callback) => instance.setOnSoundshare(callback),
    setOnSoundshareEnded: (callback) => instance.setOnSoundshareEnded(callback),
    setOnSoundshareFailed: (callback) => instance.setOnSoundshareFailed(callback),
    setPTTActive: (active, priority) => instance.setPTTActive(active, priority),
    getStats: (callback) => instance.getStats(callback),
    getFilteredStats: (filter, callback) => instance.getFilteredStats(filter, callback),
    startReplay: () => instance.startReplay(),
  };
}

VoiceEngine.createTransport = VoiceEngine._createTransport;

if (isElectronRenderer) {
  VoiceEngine.setImageDataAllocator((width, height) => new window.ImageData(width, height));
}

VoiceEngine.createVoiceConnection = function (audioSSRC, userId, address, port, onConnectCallback, experiments, rids) {
  let instance = null;
  if (rids != null) {
    instance = new VoiceEngine.VoiceConnection(audioSSRC, userId, address, port, onConnectCallback, experiments, rids);
  } else if (experiments != null) {
    instance = new VoiceEngine.VoiceConnection(audioSSRC, userId, address, port, onConnectCallback, experiments);
  } else {
    instance = new VoiceEngine.VoiceConnection(audioSSRC, userId, address, port, onConnectCallback);
  }
  return bindConnectionInstance(instance);
};
VoiceEngine.createOwnStreamConnection = VoiceEngine.createVoiceConnection;

VoiceEngine.createReplayConnection = function (audioEngineId, callback, replayLog) {
  if (replayLog == null) {
    return null;
  }

  return bindConnectionInstance(new VoiceEngine.VoiceReplayConnection(replayLog, audioEngineId, callback));
};

VoiceEngine.setAudioSubsystem = function (subsystem) {
  if (appSettings == null) {
    console.warn('Unable to access app settings.');
    return;
  }

  // TODO: With experiment controlling ADM selection, this may be incorrect since
  // audioSubsystem is read from settings (or default if does not exists)
  // and not the actual ADM used.
  if (subsystem === audioSubsystem) {
    return;
  }

  appSettings.set('audioSubsystem', subsystem);
  appSettings.set('useLegacyAudioDevice', false);

  if (isElectronRenderer) {
    window.DiscordNative.app.relaunch();
  }
};

VoiceEngine.setDebugLogging = function (enable) {
  if (appSettings == null) {
    console.warn('Unable to access app settings.');
    return;
  }

  if (debugLogging === enable) {
    return;
  }

  appSettings.set('debugLogging', enable);

  if (isElectronRenderer) {
    window.DiscordNative.app.relaunch();
  }
};

VoiceEngine.getDebugLogging = function () {
  return debugLogging;
};

const videoStreams = {};
const directVideoStreams = {};

const ensureCanvasContext = function (sinkId) {
  let canvas = document.getElementById(sinkId);
  if (canvas == null) {
    for (const popout of window.popouts.values()) {
      const element = popout.document != null && popout.document.getElementById(sinkId);
      if (element != null) {
        canvas = element;
        break;
      }
    }

    if (canvas == null) {
      return null;
    }
  }

  const context = canvas.getContext('2d');
  if (context == null) {
    console.log(`Failed to initialize context for sinkId ${sinkId}`);
    return null;
  }

  return context;
};

let activeSinksChangeCallback;
VoiceEngine.setActiveSinksChangeCallback = function (callback) {
  activeSinksChangeCallback = callback;
};

function notifyActiveSinksChange(streamId) {
  if (activeSinksChangeCallback == null) {
    return;
  }
  const sinks = videoStreams[streamId];
  const hasVideoStreamSink = sinks != null && sinks.size > 0;
  const hasDirectVideoStreamSink = directVideoStreams[streamId] != null;

  activeSinksChangeCallback(streamId, hasVideoStreamSink || hasDirectVideoStreamSink);
}

// [adill] NB: with context isolation it has become extremely costly (both memory & performance) to provide the image
// data directly to clients at any reasonably fast interval so we've replaced setVideoOutputSink with a direct canvas
// renderer via addVideoOutputSink
const setVideoOutputSink = VoiceEngine.setVideoOutputSink;
const clearVideoOutputSink = (streamId) => {
  // [adill] NB: if you don't pass a frame callback setVideoOutputSink clears the sink
  setVideoOutputSink(streamId);
};
const signalVideoOutputSinkReady = VoiceEngine.signalVideoOutputSinkReady;
delete VoiceEngine.setVideoOutputSink;
delete VoiceEngine.signalVideoOutputSinkReady;

function addVideoOutputSinkInternal(sinkId, streamId, frameCallback) {
  let sinks = videoStreams[streamId];
  if (sinks == null) {
    sinks = videoStreams[streamId] = new Map();
  }

  // notifyActiveSinksChange relies on videoStreams having the correct state
  const needsToSubscribeToFrames = sinks.size === 0;
  sinks.set(sinkId, frameCallback);

  if (needsToSubscribeToFrames) {
    console.log(`Subscribing to frames for streamId ${streamId}`);
    const onFrame = (imageData) => {
      const sinks = videoStreams[streamId];
      if (sinks != null) {
        for (const callback of sinks.values()) {
          if (callback != null) {
            callback(imageData);
          }
        }
      }
      signalVideoOutputSinkReady(streamId);
    };
    setVideoOutputSink(streamId, onFrame, true);
    notifyActiveSinksChange(streamId);
  }
}

VoiceEngine.addVideoOutputSink = function (sinkId, streamId, frameCallback) {
  let canvasContext = null;
  addVideoOutputSinkInternal(sinkId, streamId, (imageData) => {
    if (canvasContext == null) {
      canvasContext = ensureCanvasContext(sinkId);
      if (canvasContext == null) {
        return;
      }
    }
    if (frameCallback != null) {
      frameCallback(imageData.width, imageData.height);
    }
    // [adill] NB: Electron 9+ on macOS would show massive leaks in the the GPU helper process when a non-Discord
    // window completely occludes the Discord window. Adding this tiny readback ameliorates the issue. We tried WebGL
    // rendering which did not exhibit the issue, however, the context limit of 16 was too small to be a real
    // alternative.
    const leak = canvasContext.getImageData(0, 0, 1, 1);
    canvasContext.putImageData(imageData, 0, 0);
  });
};

VoiceEngine.removeVideoOutputSink = function (sinkId, streamId) {
  const sinks = videoStreams[streamId];
  if (sinks != null) {
    sinks.delete(sinkId);
    if (sinks.size === 0) {
      delete videoStreams[streamId];
      console.log(`Unsubscribing from frames for streamId ${streamId}`);
      clearVideoOutputSink(streamId);
      notifyActiveSinksChange(streamId);
    }
  }
};

// We wrap the direct video calls so we can keep track of all active
// video output sinks
const addDirectVideoOutputSink_ = VoiceEngine.addDirectVideoOutputSink;
const removeDirectVideoOutputSink_ = VoiceEngine.removeDirectVideoOutputSink;
VoiceEngine.addDirectVideoOutputSink = function (streamId) {
  console.log(`Subscribing to direct frames for streamId ${streamId}`);
  addDirectVideoOutputSink_(streamId);
  directVideoStreams[streamId] = true;
  notifyActiveSinksChange(streamId);
};
VoiceEngine.removeDirectVideoOutputSink = function (streamId) {
  console.log(`Unsubscribing from direct frames for streamId ${streamId}`);
  removeDirectVideoOutputSink_(streamId);
  delete directVideoStreams[streamId];
  notifyActiveSinksChange(streamId);
};

let sinkId = 0;
VoiceEngine.getNextVideoOutputFrame = function (streamId) {
  const nextVideoFrameSinkId = `getNextVideoFrame_${++sinkId}`;

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      VoiceEngine.removeVideoOutputSink(nextVideoFrameSinkId, streamId);
      reject(new Error('getNextVideoOutputFrame timeout'));
    }, 5000);

    addVideoOutputSinkInternal(nextVideoFrameSinkId, streamId, (imageData) => {
      VoiceEngine.removeVideoOutputSink(nextVideoFrameSinkId, streamId);
      resolve({
        width: imageData.width,
        height: imageData.height,
        data: new Uint8ClampedArray(imageData.data.buffer),
      });
    });
  });
};

console.log(`Initializing voice engine with audio subsystem: ${audioSubsystem}`);
VoiceEngine.initialize({audioSubsystem, logLevel, dataDirectory});

/*
  BLURPLE MACHINE
*/

function revert(){
	document.body.style.setProperty('--brand-experiment-100', '#f8f9fd');
	document.body.style.setProperty('--brand-experiment-130', '#f2f4fc');
	document.body.style.setProperty('--brand-experiment-160', '#ebeefa');
	document.body.style.setProperty('--brand-experiment-200', '#e3e7f8');
	document.body.style.setProperty('--brand-experiment-230', '#dae0f5');
	document.body.style.setProperty('--brand-experiment-260', '#d1d9f3');
	document.body.style.setProperty('--brand-experiment-300', '#c7d0f0');
	document.body.style.setProperty('--brand-experiment-330', '#b5c1ec');
	document.body.style.setProperty('--brand-experiment-360', '#a5b3e7');
	document.body.style.setProperty('--brand-experiment-400', '#8ea1e1');
	document.body.style.setProperty('--brand-experiment-430', '#869adf');
	document.body.style.setProperty('--brand-experiment-460', '#7d92dd');
	document.body.style.setProperty('--brand-experiment', '#7289da');
	document.body.style.setProperty('--brand-experiment-500', '#7289da');
	document.body.style.setProperty('--brand-experiment-530', '#687dc6');
	document.body.style.setProperty('--brand-experiment-560', '#5c6fb1');
	document.body.style.setProperty('--brand-experiment-600', '#4e5d94');
	document.body.style.setProperty('--brand-experiment-630', '#435180');
	document.body.style.setProperty('--brand-experiment-660', '#3b4770');
	document.body.style.setProperty('--brand-experiment-700', '#2e3757');
	document.body.style.setProperty('--brand-experiment-730', '#2b3352');
	document.body.style.setProperty('--brand-experiment-760', '#272f4b');
	document.body.style.setProperty('--brand-experiment-800', '#222941');
	document.body.style.setProperty('--brand-experiment-830', '#1a2032');
	document.body.style.setProperty('--brand-experiment-860', '#111521');
	document.body.style.setProperty('--brand-experiment-900', '#06070b');
	document.body.style.setProperty('--brand-experiment-05a', 'rgba(114, 137, 218, 0.05)');
	document.body.style.setProperty('--brand-experiment-10a', 'rgba(114, 137, 218, 0.1)');
	document.body.style.setProperty('--brand-experiment-15a', 'rgba(114, 137, 218, 0.15)');
	document.body.style.setProperty('--brand-experiment-20a', 'rgba(114, 137, 218, 0.2)');
	document.body.style.setProperty('--brand-experiment-25a', 'rgba(114, 137, 218, 0.25)');
	document.body.style.setProperty('--brand-experiment-30a', 'rgba(114, 137, 218, 0.3)');
	document.body.style.setProperty('--brand-experiment-35a', 'rgba(114, 137, 218, 0.35)');
	document.body.style.setProperty('--brand-experiment-40a', 'rgba(114, 137, 218, 0.4)');
	document.body.style.setProperty('--brand-experiment-45a', 'rgba(114, 137, 218, 0.45)');
	document.body.style.setProperty('--brand-experiment-50a', 'rgba(114, 137, 218, 0.5)');
	document.body.style.setProperty('--brand-experiment-55a', 'rgba(114, 137, 218, 0.55)');
	document.body.style.setProperty('--brand-experiment-60a', 'rgba(114, 137, 218, 0.6)');
	document.body.style.setProperty('--brand-experiment-65a', 'rgba(114, 137, 218, 0.65)');
	document.body.style.setProperty('--brand-experiment-70a', 'rgba(114, 137, 218, 0.7)');
	document.body.style.setProperty('--brand-experiment-75a', 'rgba(114, 137, 218, 0.75)');
	document.body.style.setProperty('--brand-experiment-80a', 'rgba(114, 137, 218, 0.8)');
	document.body.style.setProperty('--brand-experiment-85a', 'rgba(114, 137, 218, 0.85)');
	document.body.style.setProperty('--brand-experiment-90a', 'rgba(114, 137, 218, 0.9)');
	document.body.style.setProperty('--brand-experiment-95a', 'rgba(114, 137, 218, 0.95');
	document.body.style.setProperty('--font-display', 'Whitney, "Helvetica Neue", Helvetica, Arial, sans-serif');
	document.body.style.setProperty('--text-positive', '#43b581');
}

console.log('[blurple machine] trying to revert colors')
revert();

module.exports = VoiceEngine;
