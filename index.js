const { exec } = require('child_process');
const path = require('path');

// Function to get the AST of a Python file in JSON format
function getPythonAst(filePath) {    
  const pythonScriptPath = path.join(__dirname, 'python2ast.py'); // Adjust the Python script path if necessary

  return new Promise((resolve)=>{
    exec(`python3 ${pythonScriptPath} "${filePath}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          return;
        }
        
        let ast = JSON.parse(stdout)
        resolve(ast)
    });
  })
}

// Example usage
if(false){
    const pythonFilePath = process.argv[2]; // Get the Python file path from command line arguments
    if (!pythonFilePath) {
    console.log('Usage: node get_ast.js <path-to-python-file>');
    process.exit(1);
    }
}

class Context {
    constructor(parent = null, name = null){
        if(parent instanceof Context)
            this.parent = parent
        else 
            this.name = parent

        if(name)
            this.name = name

        this.$ = {}
        this._ = []
    }

    enter(name){
        return new Context(this, name)
    }

    exit(){
        return this.parent
    }

    set(name, value={}){

        value = {...value, ...{"%name": name}}
        this._.push(value)

        let $ = this.$[name]

        if(!$){
            $ = new Context(this)
            this.$[name] = $   
            
            if(this.parent) 
                this.parent.set(name, value)
        }
        
        Object.assign($, value||{})                    

        return $
    }

    getTree(until=null, tree=[]){        
        if(this.parent && until != this.type)
            this.parent.getTree(until, tree)    
        
        tree.push(this['%name'])
        return tree
    }

    ns(){
        return this._.length.toString()
    }
}

class File {
    constructor(context, filename){
        this.$$ = this.context = context
        this.filename = filename
    }

    /// https://docs.python.org/3/library/ast.html
    /// Use this web page as reference about Python's AST

    async readAst(ast){
        if(!ast)
            console.error("debug empty readAst")

        switch(ast.node_type){
            case 'Import':
            case 'ImportFrom':
                return await this.readAst_Import(ast)
                
            case 'Try':
                return await this.readAst_Try(ast)

            case 'Assign':
                return await this.readAst_Assign(ast)

            case 'FunctionDef':
                return await this.readAst_FunctionDef(ast)

            case 'Return':
                return await this.readAst_Return(ast)

            case 'Constant':
                return await this.readAst_Constant(ast)

            case 'Call':
                return await this.readAst_Call(ast)

            case 'Attribute':
                return await this.readAst_Attribute(ast)
            
            case 'Name':
                return await this.readAst_Name(ast)

            case 'DictComp':
                return await this.readAst_DictComp(ast)

            case 'Compare':
                return await this.readAst_Compare(ast)

            case 'If':
            case 'IfExp':
                return await this.readAst_If(ast)

            case 'UnaryOp':
                return await this.readAst_UnaryOp(ast)
            
            case 'BinOp':
                return await this.readAst_BinOp(ast)

            case 'Subscript':
                return await this.readAst_Subscript(ast)

            case 'Expr':
                return await this.readAst_Expr(ast)

            case 'ClassDef':
                return await this.readAst_ClassDef(ast)

            case 'For':
                return await this.readAst_For(ast)

            case 'Dict':
                return await this.readAst_Dict(ast)

            case 'List':
                return await this.readAst_List(ast)

            case 'AnnAssign':
                return await this.readAst_AnnAssign(ast)

            case 'With':
                return await this.readAst_With(ast)   
                
            case 'Tuple':
                return await this.readAst_Tuple(ast)

            case 'Delete':
                return await this.readAst_Delete(ast)

            case 'Assert':
                return await this.readAst_Assert(ast)

            case 'Raise':
                return await this.readAst_Raise(ast)

            default:
                console.warn("to be implemented")
        }
    }    

    ////
    ////
    ////

    async readAst_Raise(ast){
        let $ = new Context("Raise")
        $.exc = ast.exc 
        return $
    }

    async readAst_Assert(ast){
        let $ = new Context("Assert")
        $.test = await this.readAst(ast.test)
        return $
    }

    async readAst_Delete(ast){
        let $$ = this.$$ = this.$$.set('%Delete')

        $$.targets = []
        for(let i=0; i<ast.targets.length; i++){
            $$.targets.push(await this.readAstValue(ast.targets[i]))
        }

        this.$$ = this.$$.exit()

        return $$
    }

    async readAst_Tuple(ast){
        let $ = new Context("Tuple")

        $.ctx = ast.ctx

        $.values = []
        for(let i=0; i<ast.elts.length; i++){
            $.values[i] = await this.readAstValue(ast.elts[i])
        }

        return $
    }

    async readAst_With(ast){
        let $$ = this.$$ = this.$$.enter('With')

        $$.items = []
        for(let item of ast.items){
            let resItem = {}

            resItem.context_expr = await this.readAst(item.context_expr)

            if(item.optional_vars)
                resItem.optional_vars = await this.readAst(item.optional_vars)

            $$.items.push(resItem)
        }

        this.readAstBody(ast.body)

        this.$$ = $$.exit()
        return $$
    }

    async readAst_AnnAssign(ast){
        let $$ = this.$$ = this.$$.set('%AnnAssign')
        $$.annotation = await this.readAst(ast.annotation)
        $$.simple = ast.simple 
        $$.target = await this.readAstValue(ast.target)
        $$.value = await this.readAstValue(ast.value)

        this.$$ = $$.exit()

        return $$
    }

    async readAst_List(ast){
        let $ = new Context("List")

        $.values = []
        for(let i=0; i<ast.elts.length; i++){
            $.values[i] = await this.readAstValue(ast.elts[i])
        }

        return $
    }

    async readAst_Dict(ast){
        let $ = new Context("Dict")
        $.dict = {}

        for(let i=0; i<ast.keys.length; i++){
            $.dict[ast.keys[i]] = await this.readAstValue(ast.values[i])
        }

        return $
    }

    async readAst_For(ast){
        let $$ = this.$$ = this.$$.enter('For')
        $$.iter = await this.readAst(ast.iter)
        $$.type_comment = ast.type_comment
        $$.target = await this.readAstValue(ast.target)

        await this.readAstBody(ast.body)

        this.$$ = $$.$else = new Context($$)
        await this.readAstBody(ast.orelse)
        this.$$ = this.$$.exit()

        this.$$ = this.$$.exit()
        return $$
    }

    async readAst_ClassDef(ast){
        let $$ = this.$$ = this.$$.set(ast.name)
        $$.bases = ast.bases 
        $$.decorator_list = ast.decorator_list 
        $$.keywords = ast.keywords

        this.readAstBody(ast.body)

        this.$$ = this.$$.exit()
        return $$
    }

    async readAst_Expr(ast){
        let $$ = this.$$ = this.$$.set('%Expr')
        $$.value = await this.readAstValue(ast.value)
        this.$$ = this.$$.exit()
        return $$
    }

    async readAst_Subscript(ast){
        let $$ = this.$$.set('%'+ast.node_type)

        $$.slice = await this.readAst(ast.slice)
        $$.value = await this.readAstValue(ast.value)

        return $$
    }

    async readAst_BinOp(ast){
        let $$ = this.$$.set('%BinOp')

        $$.left = await this.readAst(ast.left)
        $$.op = ast.node_type
        $$.right = await this.readAst(ast.right)

        return $$
    }

    async readAst_UnaryOp(ast){
        let $$ = this.$$.set('%BinOp')

        $$.op = ast.op.node_type 
        $$.operand = await this.readAst(ast.operand)

        return $$
    }

    async readAst_If(ast){
        const $$ = this.$$ = this.$$.enter(ast.node_type)
        $$.$common = 'If'

        $$.set('%test', ast.test)
        await this.readAstBody(ast.body)

        this.$$ = $$.$else = new Context($$)
        await this.readAstBody(ast.orelse)
        this.$$ = this.$$.exit()

        this.$$ = $$.exit()
        return $$
    }

    async readAst_Compare(ast){
        let $$ = this.$$.set('%Compare')

        $$.left = {name: ast.id, ctx: ast.ctx, type: ast.node_type}
        $$.comparators = ast.comparators
        $$.ops = ast.ops 

        return $$
    }

    async readAst_Call(ast){
        let $$ = this.$$ = this.$$.set('%Call')

        $$.args = ast.args
        $$.function = await this.readAstValue(ast.func)
        $$.tree = $$.function.getTree('Name')

        this.$$ = $$.exit()

        return $$
    }   
    
    async readAst_Name(ast){
        return this.$$.set(ast.id , {type: ast.node_type, ctxType: ast.ctx.node_type})
    }

    async readAst_Attribute(ast){
        return this.$$.set(ast.attr, {type: ast.node_type, ctx: ast.ctx})
    }

    async readAst_DictComp(ast){
        return this.$$.set(ast.node_type+'_'+this.$$.ns(), {...ast})
    }

    async readAst_Constant(ast, name=null){
        return this.$$.set(name || '%Constant', {value: ast.value, type: 'Constant'})
    }

    async readAst_Return(ast){
        const $$ = this.$$ = this.$$.set('%Return')
        await this.readAst(ast.value, '%value')
        this.$$ = this.$$.exit()
        return $$
    }

    async readAst_FunctionDef(ast){
        const $$ = this.$$ = this.$$.set(ast.name, {args: ast.args.args})
        await this.readAstBody(ast.body)
        this.$$ = this.$$.exit()
        return $$
    }

    async readAst_Import(ast){
        const $$ = this.$$ = this.$$.set('%'+ast.node_type)
        $$.$common = 'Import'

        for(let name of ast.names){
            let asName = name.asname || name.name           
            this.$$.set(asName, {type: 'module', name: ast.module || name.name})
        }
        
        this.$$ = this.$$.exit()
        return $$
    }

    async readAst_Try(ast){
        const $$ = this.$$ = this.$$.enter('Try')
        
        await this.readAstBody(ast)

        for(let handler of ast.handlers){
            switch(handler.node_type){
                case 'ExceptHandler':
                    await this.readAst_ExceptHandler(handler)
                    break;
            }
        }
        
        this.$$ = this.$$.exit()
        return $$
    }

    async readAst_ExceptHandler(ast){
        const $$ = this.$$ = this.$$.$exceptHandler = new Context(this.$$)
        await this.readAstBody(ast)
        this.$$ = this.$$.exit()
        return $$
    }

    async readAst_Assign(ast){
        let $$ = this.$$ = this.$$.set('%Return')

        for(let target of ast.targets){
            this.$$ = $$.set(target.id)
            await this.readAst(ast.value, '%value')
            this.$$ = $$.exit()
        }

        this.$$ = $$.exit()
        return $$
    }

    ////
    ////
    ////

    async readAstValue(value){

        let parent = null
        let t = value.node_type
        if((t == 'Call' || t == 'Attribute' || t == 'Name') && value.value)
            this.$$ = parent = await this.readAstValue(value.value)
        
        let res = await this.readAst(value)       
        
        if(parent)
            this.$$ = this.$$.exit()

        return res
    }

    async readAstBody(body){
        if(!body)
            console.error("sent empty body")

        body = body.body || body

        if(!Array.isArray(body))
            body = [body]

        for(let a of body){
            let r = await this.readAst(a)

            if(!r)
                console.log("debug: empty result")
        }
    }

    async getAst(){
        let ast = await getPythonAst(this.filename);
        await this.readAstBody(ast)
    }
}

async function main(){
    const project = new Context()

    const pythonFilePath = "tests/stablediffusion/ldm/modules/attention.py"
    let file = new File(project, pythonFilePath)
    await file.getAst()

    console.log("read")
}

main()