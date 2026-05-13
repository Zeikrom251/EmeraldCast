import type { Config } from 'jest'

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@repo/types$': '<rootDir>/../../packages/types/index.ts',
    '^@repo/utils$': '<rootDir>/../../packages/utils/index.ts',
  },
}

export default config
