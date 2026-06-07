// Notifee's core AAR declares its ForegroundService with foregroundServiceType="shortService".
// On Android 14+ (SDK 34+), shortService has a system-enforced time limit (~3 min) after
// which the OS kills the service and reports an ANR. A 25-minute focus session exceeds
// this limit on every run.
//
// This plugin overrides the service type to mediaPlayback in the merged manifest,
// which has no time limit and matches the FOREGROUND_SERVICE_MEDIA_PLAYBACK permission
// already declared in app.json.
//
// Without this, merely declaring the permission does NOT change the service type from
// Notifee's bundled AAR — the merged manifest still reads shortService.

const { withAndroidManifest } = require('@expo/config-plugins');

const NOTIFEE_SERVICE = 'app.notifee.core.ForegroundService';

module.exports = function withNotifeeMediaPlayback(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // tools:replace is required for the manifest merger to let our attribute win
    // over the same attribute in Notifee's bundled AAR manifest.
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const application = manifest.application?.[0];
    if (!application) return config;

    if (!application.service) {
      application.service = [];
    }

    const existing = application.service.find(
      (s) => s.$?.['android:name'] === NOTIFEE_SERVICE,
    );

    if (existing) {
      existing.$['android:foregroundServiceType'] = 'mediaPlayback';
      existing.$['tools:replace'] = 'android:foregroundServiceType';
    } else {
      application.service.push({
        $: {
          'android:name': NOTIFEE_SERVICE,
          'android:exported': 'false',
          'android:foregroundServiceType': 'mediaPlayback',
          'tools:replace': 'android:foregroundServiceType',
        },
      });
    }

    return config;
  });
};
