const NormalModule = require('webpack').NormalModule;

const PLUGIN_NAME = 'angular-cdp';

const LOADER = require.resolve('./src/processChunk.js');

class AngularCDP {
    apply(compiler) {
        const isWebpackV5 = compiler.webpack && compiler.webpack.version >= '5';

        compiler.hooks.compilation.tap(PLUGIN_NAME, compilation => {
            const tapCallback = (_, normalModule) => {
                const moduleRequest = normalModule.userRequest || '';

                if (/[/\\]core\.m?js$/.test(moduleRequest) && !normalModule.loaders.some(l => l.loader === LOADER)) {
                    normalModule.loaders.push({
                        loader: LOADER
                    });
                }
            };

            if (isWebpackV5) {
                NormalModule.getCompilationHooks(compilation).beforeLoaders.tap(
                    PLUGIN_NAME,
                    tapCallback
                );
            } else {
                compilation.hooks.normalModuleLoader.tap(PLUGIN_NAME, tapCallback);
            }
        });
    }
}

module.exports = AngularCDP;
