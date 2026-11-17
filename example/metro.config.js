const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const projectRoot = __dirname;
const appNodeModules = path.join(projectRoot, 'node_modules');
const defaultConfig = getDefaultConfig(projectRoot);

const escapePathForRegex = value =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolvePackageRoot = packageName => {
  try {
    return path.dirname(
      require.resolve(`${packageName}/package.json`, {
        paths: [projectRoot],
      }),
    );
  } catch {
    return null;
  }
};

const isOutsideProjectRoot = value => {
  const relativePath = path.relative(projectRoot, value);

  return relativePath.startsWith('..') || path.isAbsolute(relativePath);
};

const visitRnSdkRoot = resolvePackageRoot('react-native-visit-rn-sdk');
const isLinkedVisitRnSdk =
  visitRnSdkRoot != null && isOutsideProjectRoot(visitRnSdkRoot);

const appDependencies = [
  'react',
  'react-native',
  'react-native-event-listeners',
  'react-native-location-enabler',
  'react-native-webview',
];
const linkedPackageBlockList = isLinkedVisitRnSdk
  ? appDependencies.map(packageName => {
      const packagePath = path.join(visitRnSdkRoot, 'node_modules', packageName);
      return new RegExp(`${escapePathForRegex(packagePath)}\\/.*`);
    })
  : [];

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: isLinkedVisitRnSdk ? [visitRnSdkRoot] : [],
  resolver: {
    ...defaultConfig.resolver,
    blockList: [].concat(
      defaultConfig.resolver.blockList ?? [],
      linkedPackageBlockList,
    ),
    nodeModulesPaths: isLinkedVisitRnSdk
      ? [appNodeModules, ...defaultConfig.resolver.nodeModulesPaths]
      : defaultConfig.resolver.nodeModulesPaths,
    extraNodeModules: {
      ...defaultConfig.resolver.extraNodeModules,
      react: path.join(appNodeModules, 'react'),
      'react-native': path.join(appNodeModules, 'react-native'),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
