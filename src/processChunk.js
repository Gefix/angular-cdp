const stringReplaceLoader = require('string-replace-loader');

function processChunk(source, map) {

  const query = {
    multiple: [
      {
        search: 'function executeTemplate(tView, lView, templateFn, rf, context) {',
        replace: `const cdp = window.cdp = {};

cdp.clearStats = () => {
    cdp.componentTotalRefreshes = 0;
    cdp.componentTotalRenderTime = 0;
    cdp.componentStats = {};

    cdp.tickCount = 0;
    cdp.tickStats = {};
}

cdp.clearStats();

function ComponentStat(name, checkAlways, dirty, transplanted, total, templateTime) {
    this.name = name;
    this.checkAlways = checkAlways || 0;
    this.dirty = dirty || 0;
    this.transplanted = transplanted || 0;
    this.total = total || 0;
    this.templateTime = templateTime || 0;
}

cdp.showComponentStats = () => {
    const details = Object.values(cdp.componentStats).sort((a, b) => b.total - a.total).map(x => { return { ...x, templateTime: Math.round(x.templateTime) } });
    console.table(details);
    console.log(\`Total Component Refreshes: \${cdp.componentTotalRefreshes}\`);
}

function TickStat(name, component, fn, invoke, invokeTask, total) {
    this.name = name;
    this.component = component;
    this.fn = fn;
    this.invoke = invoke || 0;
    this.invokeTask = invokeTask || 0;
    this.total = total || 0;
}

cdp.showTickStats = () => {
    const details = Object.values(cdp.tickStats).sort((a, b) => b.total - a.total);
    console.table(details);
    console.log(\`Angular Change Detection Ticks: \${cdp.tickCount}\`);
}

const COMPONENT_NAME_SYMBOL = Symbol('ComponentName');
const DEEP_COMPONENT_NAME_SYMBOL = Symbol('DeepComponentName');

function getComponentName(lView, deep) {
    const symbol = deep ? DEEP_COMPONENT_NAME_SYMBOL : COMPONENT_NAME_SYMBOL
    if (!lView[symbol]) {
        let componentName = "";
        try {
            componentName = lView[1] && lView[1].template && lView[1].template.name || componentName;
            if (componentName.endsWith('_Template')) {
                componentName = componentName.replace(/^_+/,'').split('_')[0];
            } else {
                componentName = lView.__proto__.constructor.name || componentName;
                if (componentName.indexOf('_') > 0) {
                    const parts = componentName.replace(/__+/g,'_').split('_');
                    if (parts[0] !== 'LEmbeddedView') {
                        componentName = parts[1];
                    } else {
                        componentName = deep ? (getComponentName(lView[3], true) || parts[1] || componentName) : "";
                    }
                } else {
                    componentName = lView[0] && lView[0].tagName && lView[0].tagName.indexOf('-') > 0 && lView[0].tagName || componentName;
                    if (/^(Array|LContainer|LComponentView|LEmbeddedView)$/.test(componentName) && lView[3]) {
                        componentName = deep ? (getComponentName(lView[3], true) || componentName) : "";
                    }
                }
            }
        } catch {}
        lView[symbol] = componentName;
    }
    return lView[symbol];
}

const wrappers = [
    [/^(\\(?event\\)?\\s*=>\\s*{\\s*\\/\\/ Ivy uses '__ngUnwrap__' as a special token that allows us to unwrap the function)|(.=>{if\\("__ngUnwrap__"===T\\)return)/, '__ngUnwrap__'],
    [/^(function wrapListenerIn_markDirtyAndPreventDefault\\(e\\))|(function .\\(.\\){if\\(.===Function\\)return)/, Function]
]

function unwrapFunction(fn) {
    let code = fn.toString();
    let wrapper = null;
    while (wrapper = wrappers.find(w=>w[0].test(code))) {
        fn = fn(wrapper[1]);
        code = fn.toString();
    }
    return [fn, code];
}

function getComponentNameFromFunctionCode(code) {
    const componentMatch = code.match(/^function ([^_(]+)_/);
    return componentMatch && componentMatch[1];
}

function aggregateTaskCall(taskFunction, category) {
    let [fn, code] = unwrapFunction(taskFunction);
    code = code.slice(0, 100);
    const tickStat = cdp.tickStats[code] = cdp.tickStats[code] || new TickStat(code, getComponentNameFromFunctionCode(code), fn);
    tickStat.fn = fn;
    tickStat[category]++;
    tickStat.total++;
}

function executeTemplate(tView, lView, templateFn, rf, context) {
    const componentName = getComponentName(lView, true);
    cdp.componentStats[componentName] = cdp.componentStats[componentName] || new ComponentStat(componentName);
    const timeStarted = performance.now();

`,
      },
      {
        search: 'setSelectedIndex(prevSelectedIndex);',
        replace: `setSelectedIndex(prevSelectedIndex);

        const elapsedTime = performance.now() - timeStarted;
        cdp.componentTotalRenderTime += elapsedTime;
        cdp.componentStats[componentName].templateTime += elapsedTime;
`,
      },
      {
        search: 'const tView = componentView[TVIEW];',
        replace: `const tView = componentView[TVIEW];

        const componentName = getComponentName(componentView);
        if (componentName) {
            cdp.componentStats[componentName] = cdp.componentStats[componentName] || new ComponentStat(componentName);
        }
`,
      },
      {
        search: 'refreshView(tView, componentView, tView.template, componentView[CONTEXT]);',
        replace: `
            if (componentName) {
                cdp.componentStats[componentName].total++;
                cdp.componentTotalRefreshes++;
                if(componentView[FLAGS] & 16) {
                    cdp.componentStats[componentName].checkAlways++;
                } else {
                    cdp.componentStats[componentName].dirty++;
                }
            }

            refreshView(tView, componentView, tView.template, componentView[CONTEXT]);`,
      },
      {
        search: 'if (componentView[TRANSPLANTED_VIEWS_TO_REFRESH] > 0) {',
        replace: `if (componentView[TRANSPLANTED_VIEWS_TO_REFRESH] > 0) {
            if (componentName) {
                cdp.componentStats[componentName].total++;
                cdp.componentTotalRefreshes++;
                cdp.componentStats[componentName].transplanted++;
            }
`,
      },
      {
        search: /this.tick\(\);\s*}/,
        replace: `cdp.tickCount++;
                    this.tick();
                }`,
      },
      {
        search: /onEnter\(zone\);\s*return delegate\.invokeTask\(target, task, applyThis, applyArgs\);/,
        replace: `if(zone.isStable) {
                aggregateTaskCall(task.callback, 'invokeTask');
            }

            onEnter(zone);
            return delegate.invokeTask(target, task, applyThis, applyArgs);`,
      },
      {
        search: /onEnter\(zone\);\s*return delegate\.invoke\(target, callback, applyThis, applyArgs, source\);/,
        replace: `if(zone.isStable) {
                aggregateTaskCall(callback, 'invoke');
            }

            onEnter(zone);
            return delegate.invoke(target, callback, applyThis, applyArgs, source);`,
      }
    ]
  };

  stringReplaceLoader.bind({ ...this, query })(source, map);
}

module.exports = processChunk
