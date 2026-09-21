const runBtn = document.getElementById('run-btn');
const codeInput = document.getElementById('code-input');
const consoleOutput = document.getElementById('console-output');
const instrumentedCodeEl = document.getElementById('instrumented-code');
const codeHeatmap = document.getElementById('code-heatmap');
const coverageBadge = document.getElementById('coverage-badge');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${btn.dataset.tab}-view`).classList.add('active');
  });
});

let trackingData = {
  statements: {},
  branches: {},
  functions: {}
};

function instrumentAST(code) {
  trackingData = { statements: {}, branches: {}, functions: {} };
  
  let ast;
  try {
    ast = esprima.parseScript(code, { loc: true, range: true });
  } catch (err) {
    throw new Error(`Parse Error: ${err.message}`);
  }

  let counterId = 0;

  function createTrackerCall(type, id) {
    return {
      type: 'ExpressionStatement',
      expression: {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: '__coverage__' },
          property: { type: 'Identifier', name: 'track' },
          computed: false
        },
        arguments: [
          { type: 'Literal', value: type },
          { type: 'Literal', value: id }
        ]
      }
    };
  }

  function traverse(node, parent) {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
      const id = ++counterId;
      trackingData.functions[id] = {
        loc: node.loc,
        count: 0,
        name: node.id ? node.id.name : '(anonymous)'
      };

      const tracker = createTrackerCall('functions', id);
      if (node.body.type === 'BlockStatement') {
        node.body.body.unshift(tracker);
      } else {
        node.body = {
          type: 'BlockStatement',
          body: [tracker, { type: 'ReturnStatement', argument: node.body }]
        };
      }
    }

    if (node.type === 'IfStatement') {
      ['consequent', 'alternate'].forEach(branchKey => {
        if (!node[branchKey]) return;

        const id = ++counterId;
        trackingData.branches[id] = {
          loc: node[branchKey].loc,
          count: 0
        };

        const tracker = createTrackerCall('branches', id);
        if (node[branchKey].type === 'BlockStatement') {
          node[branchKey].body.unshift(tracker);
        } else {
          node[branchKey] = {
            type: 'BlockStatement',
            body: [tracker, node[branchKey]]
          };
        }
      });
    }

    if (node.type === 'ExpressionStatement' || node.type === 'VariableDeclaration' || node.type === 'ReturnStatement') {
      if (parent && parent.type === 'BlockStatement') {
        const id = ++counterId;
        trackingData.statements[id] = {
          loc: node.loc,
          count: 0
        };
      }
    }

    for (let key in node) {
      if (key === 'parent' || !node.hasOwnProperty(key)) continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(c => traverse(c, node));
      } else if (child && typeof child === 'object' && child.type) {
        traverse(child, node);
      }
    }
  }

  traverse(ast, null);
  return escodegen.generate(ast);
}

function runSandbox(instrumentedCode) {
  let logs = [];
  
  const customConsole = {
    log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')),
    error: (...args) => logs.push('[ERROR] ' + args.join(' ')),
    warn: (...args) => logs.push('[WARN] ' + args.join(' '))
  };

  const coverageTracker = {
    track: (type, id) => {
      if (trackingData[type] && trackingData[type][id]) {
        trackingData[type][id].count++;
      }
    }
  };

  try {
    const sandboxFunc = new Function('console', '__coverage__', instrumentedCode);
    sandboxFunc(customConsole, coverageTracker);
  } catch (err) {
    logs.push(`Runtime Error: ${err.message}`);
  }

  return logs.join('\n');
}

function renderHeatmap(rawCode) {
  const lines = rawCode.split('\n');
  let lineHits = new Array(lines.length).fill(0);
  let totalTracked = 0;
  let hitTracked = 0;

  ['functions', 'branches'].forEach(type => {
    Object.values(trackingData[type]).forEach(item => {
      totalTracked++;
      if (item.count > 0) hitTracked++;

      if (item.loc) {
        const startLine = item.loc.start.line - 1;
        const endLine = item.loc.end.line - 1;
        for (let l = startLine; l <= endLine; l++) {
          if (l < lineHits.length) {
            lineHits[l] = Math.max(lineHits[l], item.count);
          }
        }
      }
    });
  });

  const percentage = totalTracked === 0 ? 100 : Math.round((hitTracked / totalTracked) * 100);
  coverageBadge.textContent = `Coverage: ${percentage}%`;
  
  if (percentage > 80) {
    coverageBadge.style.background = '#dcfce7';
    coverageBadge.style.color = '#15803d';
  } else if (percentage > 50) {
    coverageBadge.style.background = '#fef3c7';
    coverageBadge.style.color = '#b45309';
  } else {
    coverageBadge.style.background = '#fee2e2';
    coverageBadge.style.color = '#b91c1c';
  }

  const heatmapHtml = lines.map((lineText, index) => {
    const hits = lineHits[index];
    let statusClass = 'untracked';
    if (hits > 0) statusClass = 'hit';
    else if (hits === 0 && lineText.trim().length > 0) statusClass = 'missed';

    return `<div class="line ${statusClass}">
      <span class="line-num">${index + 1}</span>
      <span class="line-hits">${hits > 0 ? hits + 'x' : ''}</span>
      <span class="line-text">${escapeHtml(lineText)}</span>
    </div>`;
  }).join('');

  codeHeatmap.innerHTML = heatmapHtml;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

runBtn.addEventListener('click', () => {
  const rawCode = codeInput.value;
  
  try {
    const instrumented = instrumentAST(rawCode);
    instrumentedCodeEl.textContent = instrumented;
    
    const logs = runSandbox(instrumented);
    consoleOutput.textContent = logs || '(Code executed with no console outputs)';

    renderHeatmap(rawCode);
  } catch (err) {
    consoleOutput.textContent = err.message;
    codeHeatmap.innerHTML = `<div class="error-msg">${err.message}</div>`;
    coverageBadge.textContent = 'Coverage: N/A';
    coverageBadge.style.background = '#f3f4f6';
    coverageBadge.style.color = '#6b7280';
  }
});

runBtn.click();