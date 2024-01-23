const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

module.exports = async () => {
  const newConfig = {
    ...defaultConfig,
    resolver: {
      assetExts: [...defaultConfig.resolver.assetExts, 'db', 'sqlite', 'tflite', 'png', 'bin'],
      sourceExts: [...defaultConfig.resolver.sourceExts, 'svg', 'png'],
    },
  };

  return newConfig;
};