// Tests for the withNotifeeMediaPlayback config plugin.
//
// The plugin is a pure JS function that transforms a manifest config object.
// By mocking @expo/config-plugins so withAndroidManifest calls the modifier
// directly, we can test the manifest transformation without any Gradle tooling.
//
// These tests prove the plugin corrects the foregroundServiceType from
// shortService (Notifee's AAR default) to mediaPlayback — the type that has
// no OS-enforced time limit on Android 14+.

jest.mock('@expo/config-plugins', () => ({
  withAndroidManifest: (config, modifier) => modifier(config),
}));

const withNotifeeMediaPlayback = require('../withNotifeeMediaPlayback');

const NOTIFEE_SERVICE = 'app.notifee.core.ForegroundService';

function makeConfig(serviceOverrides = {}) {
  return {
    modResults: {
      manifest: {
        $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
        application: [
          {
            $: {},
            service: [
              {
                $: {
                  'android:name': NOTIFEE_SERVICE,
                  'android:exported': 'false',
                  'android:foregroundServiceType': 'shortService',
                  ...serviceOverrides,
                },
              },
            ],
          },
        ],
      },
    },
  };
}

describe('withNotifeeMediaPlayback', () => {
  // ─── The core fix ─────────────────────────────────────────────────────────

  it('changes foregroundServiceType from shortService to mediaPlayback', () => {
    const result = withNotifeeMediaPlayback(makeConfig());
    const service = result.modResults.manifest.application[0].service.find(
      (s) => s.$['android:name'] === NOTIFEE_SERVICE,
    );
    expect(service.$['android:foregroundServiceType']).toBe('mediaPlayback');
  });

  it('adds tools:replace so the manifest merger lets our attribute win over the AAR', () => {
    const result = withNotifeeMediaPlayback(makeConfig());
    const service = result.modResults.manifest.application[0].service.find(
      (s) => s.$['android:name'] === NOTIFEE_SERVICE,
    );
    expect(service.$['tools:replace']).toBe('android:foregroundServiceType');
  });

  it('adds xmlns:tools to the manifest root when not already present', () => {
    const result = withNotifeeMediaPlayback(makeConfig());
    expect(result.modResults.manifest.$['xmlns:tools']).toBe(
      'http://schemas.android.com/tools',
    );
  });

  it('does not add a duplicate xmlns:tools when it is already declared', () => {
    const config = makeConfig();
    config.modResults.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const result = withNotifeeMediaPlayback(config);
    // Should not throw or produce a second entry — just the one already there.
    expect(result.modResults.manifest.$['xmlns:tools']).toBe(
      'http://schemas.android.com/tools',
    );
  });

  // ─── Service entry does not yet exist (clean app manifest) ────────────────

  it('creates a new service entry if the manifest has no services array', () => {
    const config = {
      modResults: {
        manifest: {
          $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
          application: [{ $: {} }], // no service array
        },
      },
    };
    const result = withNotifeeMediaPlayback(config);
    const services = result.modResults.manifest.application[0].service;
    expect(services).toBeDefined();
    const notifee = services.find((s) => s.$['android:name'] === NOTIFEE_SERVICE);
    expect(notifee.$['android:foregroundServiceType']).toBe('mediaPlayback');
    expect(notifee.$['tools:replace']).toBe('android:foregroundServiceType');
  });

  it('creates a new service entry when Notifee service is absent from the services list', () => {
    const config = {
      modResults: {
        manifest: {
          $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
          application: [
            {
              $: {},
              service: [
                { $: { 'android:name': 'com.example.OtherService' } },
              ],
            },
          ],
        },
      },
    };
    const result = withNotifeeMediaPlayback(config);
    const notifee = result.modResults.manifest.application[0].service.find(
      (s) => s.$['android:name'] === NOTIFEE_SERVICE,
    );
    expect(notifee).toBeDefined();
    expect(notifee.$['android:foregroundServiceType']).toBe('mediaPlayback');
  });

  // ─── Does not disturb other services ─────────────────────────────────────

  it('leaves other service entries unchanged', () => {
    const config = {
      modResults: {
        manifest: {
          $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
          application: [
            {
              $: {},
              service: [
                {
                  $: {
                    'android:name': 'com.example.OtherService',
                    'android:foregroundServiceType': 'dataSync',
                  },
                },
                {
                  $: {
                    'android:name': NOTIFEE_SERVICE,
                    'android:foregroundServiceType': 'shortService',
                  },
                },
              ],
            },
          ],
        },
      },
    };
    const result = withNotifeeMediaPlayback(config);
    const other = result.modResults.manifest.application[0].service.find(
      (s) => s.$['android:name'] === 'com.example.OtherService',
    );
    expect(other.$['android:foregroundServiceType']).toBe('dataSync');
  });

  // ─── Idempotent: safe to run more than once ───────────────────────────────

  it('is idempotent — running twice produces the same result as running once', () => {
    const config = makeConfig();
    const once = withNotifeeMediaPlayback(config);
    const twice = withNotifeeMediaPlayback(once);
    const service = twice.modResults.manifest.application[0].service.find(
      (s) => s.$['android:name'] === NOTIFEE_SERVICE,
    );
    expect(service.$['android:foregroundServiceType']).toBe('mediaPlayback');
    expect(service.$['tools:replace']).toBe('android:foregroundServiceType');
  });
});
