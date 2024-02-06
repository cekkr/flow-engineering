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