# angular-cdp

A lightweight change detection profiler for Angular 9+

## Installation

The profiler is packaged as a webpack plugin that dynamically injects an additional custom loader for the Angular core.(m)js source code bundle in order to monkey-patch it during the build stage.

1. Add the webpack plugin package
```
npm install --save-dev Gefix/angular-cdp
```

2. Add the plugin to the app's webpack.config.js file (create one if the app does not have a custom webpack configuration file)
```
const AngularCDP = require('angular-cdp');

module.exports = {
  plugins: [
    new AngularCDP()
  ]
};
```

3. (Optional) If the Angular application is not already configured to use a custom webpack configuration file:

* Add the @angular-builders/custom-webpack package
```
npm install --save-dev @angular-builders/custom-webpack
```

* Edit the angular.js file
Change the build.builder from "@angular-devkit/build-angular:browser" to "@angular-builders/custom-webpack:browser"
Add a "customWebpackConfig" configuration option to the build
Change the serve.builder from "@angular-devkit/build-angular:dev-server" to "@angular-builders/custom-webpack:dev-server"
```
"build": {
  "builder": "@angular-builders/custom-webpack:browser",
  "options": {
    "customWebpackConfig": {
      "path": "./webpack.config.js"
    }
...
},
"serve": {
  "builder": "@angular-builders/custom-webpack:dev-server",
...
```

## Usage
All data is stored in the window.cdp object at run-time.
To print the aggregated component statistics in the browser's console run
```
window.cdp.showComponentStats()
```
To print the aggregated change detection tick statistics in the browser's console run
```
window.cdp.showTickStats()
```
To clear the data and reset the counters run
```
window.cdp.clearStats()
```

## Data
The following data is collected and aggregated per component during each view template execution:
* name - the name of the component, extracted heuristically from the template name, constructor name, or tag name of the closest parent non-embedded view
* checkAlways - the # of times an instance of the component was refreshed because it was using the default change-detection strategy and a refresh of the app root was performed
* dirty - the # of times an instance of the component was refreshed because if was marked as dirty
* transplanted - the # of times a transplanted view instance of the component was refreshed
* total - the total # of times an instance of the component was refreshed
* templateTime - the total time in milliseconds spent in refreshing views of the component (includes time spent in embedded views, but not in child components)

The following data is collected and aggregated for each function/task invocation that makes the angular zone unstable:
* name - the first 100 characters of the event/callback function source code
* component - if available, the heuristically extracted name of the component whose template hosts the function
* fn - a reference to the last recorded function with the same signature. This may capture context and cause memory / GC issues - use clearStats() to free the memory
* invoke - the # of times the function was called when the ngZone was stable and via direct invocation (usually from async sources such as fetch/setTimeout)
* invokeTask - the # of times the function was called when the ngZone was stable and via invokeTask (usually from browser UI events)
* total - the total # of times the function was called when the ngZone was stable. Each such call usually leads to Angular's tick() function being called when the microtask queue becomes empty which in turn explicitly processes change detection and its side-effects.

Note: Due to the complex interaction between zone.js, NgZone, Angular's component lifecycle, and Angular's change detection logic - it is possible for the sum of the individual function invocations to differ from the total window.cdp.tickCount property. Currently the window.cdp.tickCount property holds the amount of times the tick() function has been called due to interaction inside the NgZone - calls due to component loading are not counted.
