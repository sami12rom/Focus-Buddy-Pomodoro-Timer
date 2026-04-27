const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow metro to bundle .riv Rive animation files as binary assets
config.resolver.assetExts.push('riv');

module.exports = config;
