__author__ = 'petlja'

import os
import shutil

from docutils import nodes
from docutils.parsers.rst import directives
from docutils.parsers.rst import Directive


def setup(app):
    app.connect('html-page-context', html_page_context_handler)
    app.add_directive('dbpetlja', dbDirective)

    app.add_stylesheet('dbDirective.css')

    app.add_javascript('dbDirective.js')
    app.add_javascript('sql.js')

    app.add_node(dbNode, html=(visit_info_note_node, depart_info_note_node))


def html_page_context_handler(app, pagename, templatename, context, doctree):
    app.builder.env.h_ctx = context

TEMPLATE_START = """
    <div id="%(divid)s" class="db" data-db-name="%(dbfile)s" %(solutionquery)s %(checkquery)s> 
        <div class="row">
        <div class="db-input"> 
            <div class= "editor-div-db"> 
            <textarea class="query" rows='6'>%(content)s</textarea>
            </div>
            <br>
            <button class='runQuery btn btn-success'>Izvrsi upit</button>
            <br>
            <div class='result'  disabled>
        </div>
        </div>
        <div class="stats" > 
        </div>
        </div>

"""

TEMPLATE_END = """
            
    </div>
"""


class dbNode(nodes.General, nodes.Element):
    def __init__(self, content):
        super(dbNode, self).__init__()
        self.components = content


def visit_info_note_node(self, node):
    node.delimiter = "_start__{}_".format(node.components['divid'])
    self.body.append(node.delimiter)
    res = TEMPLATE_START % node.components
    self.body.append(res)


def depart_info_note_node(self, node):
    res = TEMPLATE_END
    self.body.append(res)
    self.body.remove(node.delimiter)


class dbDirective(Directive):
    required_arguments = 1
    optional_arguments = 0
    has_content = True
    option_spec = {}
    option_spec.update({
        'dbfile': directives.unchanged,
        'solutionquery': directives.unchanged,
        'checkquery': directives.unchanged,
    })
    def run(self):
        env = self.state.document.settings.env
        self.options['divid'] = self.arguments[0]

        if 'dbfile' not in self.options:
            self.error('No script path specified')
        if 'solutionquery' in self.options:
            self.options['solutionquery'] = 'db-check = "{}"'.format( self.options['solutionquery'])
        else:
            self.options['solutionquery'] = ''

        if 'checkQuery' in self.options:
            self.options['checkquery'] = 'db-check-query = "{}"'.format( self.options['checkquery'])
        else:
            self.options['checkquery'] = ''

        self.options['content'] = self.content[0]

        db = dbNode(self.options)

        return [db]

html_escape_table = {
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
    ">": "&gt;",
    "<": "&lt;",
    }

def html_escape(text):
    """Produce entities within text."""
    return "".join(html_escape_table.get(c,c) for c in text)
