// Simulates initialising the SDK after Nest/Express are already loaded.
const root = __dirname + "/../../";
require(root + 'node_modules/@nestjs/core');
require(root + 'node_modules/express');
require(root + 'dist/src/otel/preload.js');
require(root + 'dist/src/main.js');
