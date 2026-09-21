# JS AST Coverage Lab

In-browser JavaScript AST parsing, tracking injection, and execution coverage visualizer.

## Overview

Most developers rely on tools like Istanbul or NYC without seeing how statement counters actually work under the hood. `js-ast-coverage-lab` opens up that process. It takes raw source code, converts it into an Abstract Syntax Tree (AST), inserts tracking calls into every function and conditional branch, executes the code in a isolated Function sandbox, and maps execution metrics back to the original source text.

## How it Works

1. **AST Parsing**: Passes raw JavaScript to Esprima to construct a standard ESTree-compliant syntax graph with line location metadata.
2. **AST Mutation**: Traverses the node tree. Whenever it hits a `FunctionDeclaration`, `FunctionExpression`, `ArrowFunctionExpression`, or `IfStatement`, it prepends an internal `__coverage__.track(type, id)` call.
3. **Code Regeneration**: Uses Escodegen to convert the modified syntax tree back into valid executable JavaScript string data.
4. **Sandboxed Execution**: Evaluates the transformed code inside an isolated `Function` scope wired to a custom console wrapper and a live hit counter registry.
5. **Heatmap Rendering**: Matches hit counter coordinates against original line numbers to render visually styled code lines indicating executed versus unexecuted code paths.

## Key Features

- **AST Node Traversal**: Programmatically alters syntax nodes without breaking source syntax rules.
- **Conditional Branch Tracking**: Captures both `consequent` and `alternate` paths within conditional blocks.
- **Isolated Sandbox Execution**: Traps standard `console.log` statements while preventing target script scopes from leaking variables into global runtime memory.
- **Side-by-Side Heatmap Engine**: Generates real-time line-by-line coverage markers showing hit counts for every active statement.

## Tech Stack Breakdown

- **Markup & Layout**: HTML5, standard CSS Grid, Flexbox, custom tab panels
- **Parsing & Generation**: Esprima 4.0.1 (AST parser), Escodegen 2.1.0 (code generator)
- **Runtime Execution**: Native JavaScript scoped Function evaluation engine

## Prerequisites & Web-Based Quick Start

### Running via GitHub Codespaces

1. Click the **Code** dropdown on this repository.
2. Select the **Codespaces** tab and click **Create codespace on main**.
3. Once the environment loads, install the Live Server extension or run a simple static HTTP server:
   ```bash
   npx serve .
   ```
4. Open the generated port URL in your browser.

### Running Locally

No npm installs or build steps are required.

1. Clone or download the repository files.
2. Double-click index.html to open it directly in any modern browser, or serve it using Python:
    ```bash
    python3 -m http.server 8000
    ```
3. Open http://localhost:8000 in your web browser.


## Repository Structure

```bash
js-ast-coverage-lab/
├── .github/
│   └── workflows/
│       └── ci.yml             # Code health check workflow
├── .gitignore                  # Git ignore rules for editor state
├── index.html                  # Core application structure & CDN loaders
├── script.js                   # AST traversal, sandbox runtime, heatmap rendering
├── style.css                   # App layout styling and syntax coverage markers
└── README.md                   # Repository documentation
```

## Roadmap

[ ] Support for loop statements (for, while, do-while) instrumentation.

[ ] Add support for ES6 module import/export parsing syntax.

[ ] Implement hit count threshold indicators for critical branch metrics.