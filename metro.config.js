const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Let Metro resolve the generated Drizzle migration files (drizzle/*.sql).
config.resolver.sourceExts.push('sql');

module.exports = config;
