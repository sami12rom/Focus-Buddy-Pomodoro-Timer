const { withAndroidManifest } = require('@expo/config-plugins');

const RECORD_AUDIO = 'android.permission.RECORD_AUDIO';

module.exports = function removeRecordAudio(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const isNotRecordAudio = (p) => p.$?.['android:name'] !== RECORD_AUDIO;
    if (manifest['uses-permission']) {
      manifest['uses-permission'] = manifest['uses-permission'].filter(isNotRecordAudio);
    }
    if (manifest['uses-permission-sdk-23']) {
      manifest['uses-permission-sdk-23'] = manifest['uses-permission-sdk-23'].filter(isNotRecordAudio);
    }
    return config;
  });
};
