const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ogg is not in Metro's default asset extensions
config.resolver.assetExts.push('ogg');

module.exports = config;
