module.exports = {
  preset: '@react-native/jest-preset',
  // These libraries ship modern JS that Jest must transform first.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-.*|gifted-charts-core)/)',
  ],
};
