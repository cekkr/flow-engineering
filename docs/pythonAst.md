To write a Node.js script that obtains the Abstract Syntax Tree (AST) of a Python file in JSON format, you can use the `child_process` module to execute a Python script that generates the AST. For this, you would need a Python environment with access to the `ast` module (which is part of the standard library) and possibly the `json` module to serialize the AST.

Here's a step-by-step guide on how to do this:

### Step 1: Python Script to Generate AST in JSON

First, write a Python script that reads another Python file, generates its AST, and prints the AST in JSON format. Save this as `generate_ast.py`.

```python
import ast
import json
import sys

def ast_to_dict(node):
    if isinstance(node, ast.AST):
        fields = {k: ast_to_dict(v) for k, v in ast.iter_fields(node)}
        fields['node_type'] = node.__class__.__name__
        return fields
    elif isinstance(node, list):
        return [ast_to_dict(n) for n in node]
    else:
        return node

if __name__ == '__main__':
    with open(sys.argv[1], 'r') as file:
        source = file.read()

    tree = ast.parse(source)
    print(json.dumps(ast_to_dict(tree), indent=2))
```

### Step 2: Node.js Script to Call Python Script

Next, write your Node.js script that calls the Python script with the path of the Python file you want to analyze. Save this as `get_ast.js`.

```javascript
const { exec } = require('child_process');
const path = require('path');

// Function to get the AST of a Python file in JSON format
function getPythonAst(filePath) {
  const pythonScriptPath = path.join(__dirname, 'generate_ast.py'); // Adjust the Python script path if necessary
  exec(`python ${pythonScriptPath} "${filePath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log('Python AST in JSON Format:', stdout);
  });
}

// Example usage
const pythonFilePath = process.argv[2]; // Get the Python file path from command line arguments
if (!pythonFilePath) {
  console.log('Usage: node get_ast.js <path-to-python-file>');
  process.exit(1);
}

getPythonAst(pythonFilePath);
```

### Usage

1. Ensure you have both Python and Node.js installed on your system.
2. Place both `generate_ast.py` and `get_ast.js` in the same directory (or adjust the script paths as necessary).
3. Run the Node.js script from the command line, passing the path to the Python file as an argument:

```bash
node get_ast.js /path/to/your/python_file.py
```

This will execute the Python script `generate_ast.py`, which generates the AST of the specified Python file and prints it in JSON format. The Node.js script captures this output and prints it to the console.