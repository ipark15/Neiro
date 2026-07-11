const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// `ws` is only needed during `expo export` (Node.js 20, no native WebSocket).
// Metro statically resolves all require() calls, so stub it out for native/dev builds.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'ws') {
    return { type: 'empty' };
  }
  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
