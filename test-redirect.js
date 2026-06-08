const mockReactNative = {
  Platform: { OS: 'android', select: () => {} }
};
require('module').Module._cache[require.resolve('react-native')] = {
  id: require.resolve('react-native'),
  filename: require.resolve('react-native'),
  loaded: true,
  exports: mockReactNative
};

const { makeRedirectUri } = require('expo-auth-session');
console.log('URI:', makeRedirectUri({ scheme: 'aaspaas' }));
