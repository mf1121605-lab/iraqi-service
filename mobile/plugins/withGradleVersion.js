/**
 * Pins the generated Android project's Gradle wrapper version.
 *
 * expo-modules-core@1.12.26 (the version this SDK 51 project resolves to)
 * calls `from components.release` in its useExpoPublishing() Gradle script.
 * Gradle 8.8 (what `expo prebuild` generates by default for this template)
 * realizes the AGP "release" SoftwareComponent too late for that access,
 * producing "Could not get unknown property 'release'" plus a cascading
 * "Plugin [id: 'expo-module-gradle-plugin'] was not found" failure on any
 * module that applies ExpoModulesCorePlugin.gradle (e.g. expo-clipboard).
 * Gradle 8.6 predates that timing change and is verified compatible.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const GRADLE_VERSION = '8.6';

module.exports = function withGradleVersion(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const filePath = path.join(
        config.modRequest.platformProjectRoot,
        'gradle',
        'wrapper',
        'gradle-wrapper.properties'
      );
      if (fs.existsSync(filePath)) {
        const contents = fs.readFileSync(filePath, 'utf8');
        fs.writeFileSync(
          filePath,
          contents.replace(
            /distributionUrl=.*/,
            `distributionUrl=https\\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-all.zip`
          )
        );
      }
      return config;
    },
  ]);
};
