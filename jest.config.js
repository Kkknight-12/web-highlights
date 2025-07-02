export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  testMatch: [
    '**/__tests__/**/*.(js|jsx)',
    '**/?(*.)+(spec|test).(js|jsx)'
  ],
  transform: {},
  moduleFileExtensions: ['js', 'jsx', 'json', 'node']
}