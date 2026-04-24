const { getDefaultConfig } = require('metro-config');
const path = require('path');

module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts },
  } = await getDefaultConfig();

  return {
    resolver: {
      assetExts: assetExts.filter(ext => ext !== 'svg'),
      sourceExts: [...sourceExts, 'svg'],
    },
    // Explicitly define which folders to watch - only our source code
    watchFolders: [
      path.resolve(__dirname, 'app'),
      path.resolve(__dirname, 'components'),
      path.resolve(__dirname, 'constants'),
    ],
    // Explicitly exclude problematic directories
    watcher: {
      // Don't watch node_modules at all
      watchNodeModules: false,
      // Additional exclusions for problematic TypeScript service directories
      excludedPaths: [
        '/node_modules/@typescript-eslint/',
        '/node_modules/@types/',
      ],
    },
    // Optimize for low watcher count
    maxWorkers: 1,
    // Increase timeout for file operations
    resolverConfigPath: './metro.resolver.config.js',
  };
})();