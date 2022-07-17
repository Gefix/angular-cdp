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
To print the aggregated in the browser's console run
```
window.cdp.showComponentStats()
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
