const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

// Pure-logic unit tests only — no DOM needed, so 'node' env keeps runs fast.
const customJestConfig = {
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/mobile/'],
  // A stray untracked nested clone (iraqi-service/) predating this session
  // shares package.json's "name" field, which trips Jest's haste-map
  // collision warning — exclude it from module scanning rather than
  // touching a directory of unknown origin.
  modulePathIgnorePatterns: ['<rootDir>/iraqi-service/'],
};

module.exports = createJestConfig(customJestConfig);
