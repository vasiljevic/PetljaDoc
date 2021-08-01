var dbDirectivesList = {}
var instanceList = []
class DbDirectives {
    constructor(opts) {
        this.opts = opts;
        this.id = opts.id;
        this.name = opts.getAttribute('data-db-name');
        this.output = opts.getElementsByClassName('result')[0];
        this.run = opts.getElementsByClassName('runQuery')[0];
        this.stats = opts.getElementsByClassName('stats')[0];
        this.editor = this.opts.getElementsByClassName('query')[0];
        this.editor.value =  this.editor.value + "\n";
        this.editorCM = CodeMirror.fromTextArea(this.editor,{
            autoRefresh: true,
            lineNumbers: true,
            mode: 'text/x-sql', 
            indentUnit: 4,
            lineWrapping: true,
            matchBrackets: true, 
            autoMatchParens: true,
            extraKeys: { "Tab": "indentMore", "Shift-Tab": "indentLess" }
        }) 
        this.editor.remove();

        if(opts.hasAttribute('db-check')){
            this.query = opts.getAttribute('db-check');
            opts.removeAttribute('db-check');
            if(opts.hasAttribute('db-check-query')){
                this.queryTest = opts.getAttribute('db-check-query');
                opts.removeAttribute('db-check-query');
                this.run.addEventListener('click',  this.checkQueryWithTest.bind(this));
            }
            else{
                this.run.addEventListener('click',  this.checkQuery.bind(this));
            }
        }
        else{
            this.run.addEventListener('click',  this.execute.bind(this));
        }
        this.script = ''
    }

    async initDb() {
        this.script =  await (await fetch('../../_static/db/'+this.name)).text();
        pyodide.globals.name = this.name;
        pyodide.globals.creationQuery = this.script;
        
        pyodide.runPythonAsync(`
        dbs[name] = sqlite3.connect(name)
        dbs[name].executescript(creationQuery)
        dbs[name].commit()
        `).then(
            this.initialized = true
        );
    }

    state(){
        pyodide.runPythonAsync(`
        state(dbs[name],id)
        `)
            .then()
            .catch();

    }
    
    async execute(){
        this.clearOutput();
        this.queryUser = this.editorCM.getValue();
        pyodide.globals.name = this.name;
        pyodide.globals.query = this.queryUser;
        pyodide.globals.id = this.id;
        await pyodide.runPythonAsync(`
        execute_query(dbs[name], query, id)
        `)
            .then()
            .catch();
        this.state();
    }

    async checkQueryWithTest(){
        this.clearOutput();
        this.queryUser = this.editorCM.getValue();
        pyodide.globals.name = this.name;
        pyodide.globals.query = this.query;
        pyodide.globals.queryUser = this.queryUser;
        pyodide.globals.queryTest = this.queryTest;
        pyodide.globals.id = this.id;
        await pyodide.runPythonAsync(`
        checkWithTest(dbs[name], query, queryUser,queryTest, id)
        `)
            .then()
            .catch();;
    }

    async checkQuery(){
        this.clearOutput();
        this.queryUser = this.editorCM.getValue();
        pyodide.globals.name = this.name;
        pyodide.globals.query = this.query;
        pyodide.globals.queryUser = this.queryUser;
        pyodide.globals.id = this.id;
        await pyodide.runPythonAsync(`
        check(dbs[name], query, queryUser, id)
        `)
            .then()
            .catch();
    }

    clearOutput(){
        this.output.innerHTML = '';
    }

    writeToOutput(rows, trunc, clear){
        if(clear)
            this.clearOutput();

        var body = this.output;
        var tbl = document.createElement('table');
        tbl.setAttribute('class', 'res-tables');

        var tbdy = document.createElement('tbody');
        var tr = document.createElement('tr');

        var td = document.createElement('th');  
        td.appendChild(document.createTextNode('#'));
        tr.appendChild(td);

        for (var i=0;i<rows[0].length;i++){
            var td = document.createElement('th');  
            td.appendChild(document.createTextNode(rows[0][i]))
            tr.appendChild(td)
        }

        tbdy.appendChild(tr);

        for (var i = 1; i < rows.length; i++) {
            var tr = document.createElement('tr');
            var td = document.createElement('td');    
            td.appendChild(document.createTextNode(i));
            tr.appendChild(td);
            for (var j = 0; j<rows[i].length;j++){    
                var td = document.createElement('td');    
                td.appendChild(document.createTextNode(rows[i][j]))
                tr.appendChild(td)
            }

            tr.appendChild(td)
            tbdy.appendChild(tr);
        }
        if(trunc){
            var tr = document.createElement('tr');  
            var td = document.createElement('td');
            td.innerHTML = '...';
            td.setAttribute('colspan',rows[0].length+1)
            tr.appendChild(td);
            tbdy.appendChild(tr);
        }

        tbl.appendChild(tbdy);
        body.appendChild(tbl)
    }


    writeErrorToOutput(err){
        this.clearOutput();
        var errP = document.createElement('p');
        errP.setAttribute('class','errP');
        errP.innerText = err;
        this.output.appendChild(errP);
    }

    querySuccess(str){
        this.clearOutput();
        var msgP = document.createElement('p');
        msgP.setAttribute('class','msgP');
        msgP.innerText = str;
        this.output.appendChild(msgP);
    }

    writeToDbState(tables){
        this.stats.innerHTML = '';

        var body = this.stats;
        var tbl = document.createElement('table');
        tbl.setAttribute('class', 'db-tables');

        var tbdy = document.createElement('tbody');
        var tr = document.createElement('tr');
        var td = document.createElement('th');
        var td2 = document.createElement('th');

        td.appendChild(document.createTextNode('Tabela'))
        td2.appendChild(document.createTextNode('Redova'))
        tr.appendChild(td)
        tr.appendChild(td2)
        tbdy.appendChild(tr);

        for (var i = 0; i < tables.length; i++) {
            var tr = document.createElement('tr');
            var td = document.createElement('td');

            td.appendChild(document.createTextNode(tables[i][0]))
            td.setAttribute("db-name", tables[i][0]);
            td.setAttribute("db-instance", this.name);
            td.setAttribute("db-id", this.id);
            td.setAttribute("class", "db-table");

            td.addEventListener('click', function(e) {
                var dbName = e.target.getAttribute("db-name")
                pyodide.globals.name = e.target.getAttribute("db-instance");
                pyodide.globals.query = "select * from " + dbName;
                pyodide.globals.id = e.target.getAttribute("db-id");
                pyodide.runPythonAsync(`
                execute_query(dbs[name], query, id)
                `).then();       
            })

            var td2 = document.createElement('td');

            td2.appendChild(document.createTextNode(tables[i][1]))
            tr.appendChild(td)
            tr.appendChild(td2)
            tbdy.appendChild(tr);
        }
        tbl.appendChild(tbdy);
        body.appendChild(tbl)
    }
  }


window.addEventListener('load',function(){
    languagePluginLoader.then(() => 
    pyodide.runPythonAsync(`
        import js
        import micropip
        import sqlite3
        from collections import Counter
        from sqlite3.dbapi2 import Error

        def execute_query(conn,query,id):
            cur = conn.cursor()
            try:
                cur.execute(query)
                conn.commit()
            except Error as e:
                js.writeErrorToOutput(str(e),id)
            else:
                if cur.description:
                    rows =  [[description[0] for description in cur.description]] + list(cur.fetchall())[0:20]
                    js.writeToOutput(list(rows),id, len(rows) > 20)
                else:
                    js.querySuccess('Upit je uspesno izvrsen', id)

        def state(conn,id):
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cur.fetchall()
            statsToSend = []
            for table in tables:
                table = table[0]
                cur.execute("select '{}', count(*) from {}".format(table,table))
                stat = cur.fetchall()
                statsToSend.append((stat[0][0],stat[0][1]))
            
            js.writeToDbState(statsToSend,id)

        def check(conn,query,userQuery,id):
            cur = conn.cursor()
            conn.commit()
            try:
                cur.execute(query)
                resault = list(cur.fetchall())
                conn.rollback()
                cur.execute(userQuery)
                resaultUser = list(cur.fetchall())
                conn.rollback()
            except Error as e:
                js.writeErrorToOutput(str(e),id)
            else:
                if 'order by' in query.lower():
                    if resault == resaultUser:
                        js.querySuccess('Upit je tacan',id)
                    else:
                        js.writeErrorToOutput('Pogresno resenje.',id)
                else:
                    check = Counter(resault) - Counter(resaultUser)
                    if len(check) == 0:
                        js.querySuccess('Upit je tacan',id)
                        if cur.description:
                            rows =  [[description[0] for description in cur.description]] + list(resaultUser)[0:20]
                            if len(rows) > 1:
                                js.writeToOutput(list(rows),id, len(rows) > 20, False)
                    else:
                        js.writeErrorToOutput('Pogresno resenje.',id)
                        
        
        def checkWithTest(conn,query,userQuery, testQuery, id):
            cur = conn.cursor()
            conn.commit()
            try:
                cur.execute(query)
                cur.execute(testQuery)
                resault = list(cur.fetchall())
                conn.rollback()
                cur.execute(userQuery)
                cur.execute(testQuery)
                resaultUser = list(cur.fetchall())
                conn.rollback()
            except Error as e:
                js.writeErrorToOutput(str(e),id)
            else:
                if 'order by' in query.lower():
                    if resault == resaultUser:
                        js.querySuccess('Upit je tacan',id)
                        if cur.description:
                            rows =  [[description[0] for description in cur.description]] + list(resaultUser)[0:20]
                            if len(rows) > 1:
                                js.writeToOutput(list(rows),id, len(rows) > 20, False)
                    else:
                        js.writeErrorToOutput('Pogresno resenje.',id)
                else:
                    check = Counter(resault) - Counter(resaultUser)
                    if len(check) == 0:
                        js.querySuccess('Upit je tacan',id)
                        if cur.description:
                            rows =  [[description[0] for description in cur.description]] + list(resaultUser)[0:20]
                            if len(rows) > 1:
                                js.writeToOutput(list(rows),id, len(rows) > 20, False)
                    else:
                        js.writeErrorToOutput('Pogresno resenje.',id)


        dbs = {};
    `)).then(() => {
		dbDirectives = document.getElementsByClassName('db')
		for (var i = 0; i < dbDirectives.length; i++) {
            var dbName = dbDirectives[i].getAttribute('data-db-name')
            var id = dbDirectives[i].id
            if (!(instanceList.includes(dbName))){
                instanceList.push(dbName);
			    dbDirectivesList[id] = new DbDirectives(dbDirectives[i]);
                dbDirectivesList[id].initDb();
            }		
            else{
                dbDirectivesList[id] = new DbDirectives(dbDirectives[i]);
            }	
		}
	})
})



function writeToOutput(rows,id,trunc = false, clear = true){
    dbDirectivesList[id].writeToOutput(rows,trunc,clear)
}

function  writeToDbState(tables,id){
    dbDirectivesList[id].writeToDbState(tables)
}

function writeErrorToOutput(err,id) {
    dbDirectivesList[id].writeErrorToOutput(err)    
}

function querySuccess(str,id){
    dbDirectivesList[id].querySuccess(str)
}