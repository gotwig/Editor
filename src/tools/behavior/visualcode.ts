import {
    Node,
    DirectionalLight, HemisphericLight,
    Scene,
    Tools as BabylonTools
} from 'babylonjs';

import Editor, {
    Tools,

    Layout,
    Toolbar,
    Grid, GridRow,
    CodeEditor,

    EditorPlugin,
    IDisposable   
} from 'babylonjs-editor';

window.LiteGraph = require("litegraph.js");

import "./LiteGraphEditor";


import Extensions from '../../extensions/extensions';
import { BehaviorMetadata, BehaviorCode } from '../../extensions/behavior/code';

import '../../extensions/behavior/code';
import LiteGraphEditor from './LiteGraphEditor';

export interface CodeGrid extends GridRow {
    name: string;
}

export default class BehaviorCodeEditor extends EditorPlugin {
    // Public members
    public layout: Layout = null;
    public toolbar: Toolbar = null;
    public grid: Grid<CodeGrid> = null;

    // Protected members
    protected code: CodeEditor = null;
    protected template: string = '// Some code';

    protected node: Node | Scene = null;

    protected datas: BehaviorMetadata = null;
    protected data: BehaviorCode = null;

    protected onSelectObject = (node) => node && this.selectObject(node);
    protected onResize = () => this.layout.element.resize();

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor(public editor: Editor) {
        super('VisualCode');
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        this.toolbar.element.destroy();
        this.grid.element.destroy();
        this.layout.element.destroy();

        // Events
        this.editor.core.onSelectObject.removeCallback(this.onSelectObject);
        this.editor.core.onResize.removeCallback(this.onResize);

        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        const div = $(this.divElement);

        // Create layout
        this.layout = new Layout('VisualCode');
        this.layout.panels = [
            { type: 'top', content: '<div id="CODE-BEHAVIOR-TOOLBAR"></div>', size: 30, resizable: false },
            { type: 'main', content: '<div id="CODEMAIN" style="width: 100%; height: 100%;"></div>', resizable: true }
        ];
        this.layout.build(div.attr('id'));

        // Add toolbar
        this.toolbar = new Toolbar('CodeToolbar');
        this.toolbar.items = [{ id: 'add', text: 'Play', caption: 'Play', img: 'icon-play-game' },
                              { id: 'save', text: 'Save', caption: 'Save', img: 'icon-save' }];
        this.toolbar.build('CODE-BEHAVIOR-TOOLBAR');

        // Add grid
        this.grid = new Grid<CodeGrid>('CodeGrid', {
            toolbarReload: false,
            toolbarSearch: false
        });
        this.toolbar.onClick = () => this.saveNodes();
        this.grid.columns = [{ field: 'name', caption: 'Name', size: '100%', editable: { type: 'string' } }];
        this.grid.onClick = (id) => this.selectCode(id[0]);
        this.grid.onAdd = () => this.add();
        this.grid.onDelete = (ids) => this.delete(ids);
        this.grid.onChange = (id, value) => this.change(id, value);
        this.grid.onEdit = (id) => this.editCode(id);
        this.grid.build('CODE-BEHAVIOR-LIST');

        // Add code editor
        this.code = await this.createEditor();
        this.template = await Tools.LoadFile<string>('./assets/templates/code/code.txt', false);

        // Events
        this.editor.core.onSelectObject.add(this.onSelectObject);
        this.editor.core.onResize.add(this.onResize);

        // Select object
        if (this.editor.core.currentSelectedObject)
            this.selectObject(this.editor.core.currentSelectedObject);

        // Request extension
        Extensions.RequestExtension(this.editor.core.scene, 'BehaviorExtension');

        // init code
        window.LiteGraph.Editor = new LiteGraphEditor("CODEMAIN");


        function sum(a,b)
        {
           return a+b;
        }
        
        window.LiteGraph.LiteGraph.wrapFunctionAsNode("math/sum",sum, ["Number","Number"],"Number");

//BeginPlay Event
function BeginPlayEVENT()
{
	this.size = [60,20];
	this.addOutput("Start", LiteGraph.EVENT);
	this.properties = {
		equal_to: "",
		has_property:"",
		property_equal_to: ""
	};
}

BeginPlayEVENT.title = "Event BeginPlay";
BeginPlayEVENT.desc = "";

BeginPlayEVENT.prototype.onExecute = function() {
    if (!window.LiteGraph.LiteGraph.stopBeginPlayProcessing){
        window.LiteGraph.LiteGraph.stopBeginPlayProcessing = true;
        this.triggerSlot(0);
    }
}

BeginPlayEVENT.prototype.onAction = function( action, param )
{
	if( param == null )
		return;

	if( this.properties.equal_to && this.properties.equal_to != param )
		return;

	if( this.properties.has_property )
	{
		var prop = param[ this.properties.has_property ];
		if( prop == null )
			return;

		if( this.properties.property_equal_to && this.properties.property_equal_to != prop )
			return;
	}

	this.triggerSlot(0,param);
}

window.LiteGraph.LiteGraph.registerNodeType("events/BeginPlay", BeginPlayEVENT );


//Tick Event
function TickEVENT()
{
	this.size = [60,20];
	this.addOutput("Start", LiteGraph.EVENT);
	this.properties = {
		equal_to: "",
		has_property:"",
		property_equal_to: ""
	};
}

TickEVENT.title = "Event Tick";
TickEVENT.desc = "";

TickEVENT.prototype.onExecute = function() {
        this.triggerSlot(0);
}

TickEVENT.prototype.onAction = function( action, param )
{
	if( param == null )
		return;

	if( this.properties.equal_to && this.properties.equal_to != param )
		return;

	if( this.properties.has_property )
	{
		var prop = param[ this.properties.has_property ];
		if( prop == null )
			return;

		if( this.properties.property_equal_to && this.properties.property_equal_to != prop )
			return;
	}

	this.triggerSlot(0,param);
}

window.LiteGraph.LiteGraph.registerNodeType("events/TickEvent", TickEVENT );


//Show value inside the debug console
function Console()
{
	this.mode = LiteGraph.ON_EVENT;
	this.size = [60,20];
	this.addProperty( "msg", "" );
	this.addInput("log", LiteGraph.EVENT);
	this.addInput("msg",0);
}

Console.title = "Console";
Console.desc = "Show value inside the console";

Console.prototype.onAction = function(action, param)
{
    console.log("test");
	if(action == "log")
		console.log( param );
	else if(action == "warn")
		console.warn( param );
	else if(action == "error")
		console.error( param );
}


Console.prototype.onGetInputs = function()
{
	return [["log",LiteGraph.ACTION],["warn",LiteGraph.ACTION],["error",LiteGraph.ACTION]];
}

window.LiteGraph.LiteGraph.registerNodeType("basic/console", Console );


    }

    /**
     * On the user shows the plugin
     */
    public onShow (): void {
        this.onResize();
    }

    /**
     * On the user selects a node in the editor
     * @param node the selected node
     */
    protected selectObject (node: Node | Scene): void {
        this.node = node;
        node.metadata = node.metadata || { };

        // Add all codes
        this.datas = node.metadata['visualbehavior'];
        if (!this.datas)
            this.datas = node.metadata['visualbehavior'] = { node: (node instanceof Scene) ? 'Scene' : node.name, metadatas: [] }

        // Clear existing data
        this.data = null;

        console.log(this.datas)
        
        this.grid.element.clear();

        //Load visual data
        if (this.datas.metadatas['graphdata']){
            window.LiteGraph.Editor.graph.configure( JSON.parse ( this.datas.metadatas['graphdata'] ) );
        }

        else {
            if (window.LiteGraph.Editor){
                window.LiteGraph.Editor.graph.clear();
            }
        }

        // Add rows
        this.datas.metadatas.forEach((d, index) => {

        });

    }

    /**
     * On the user selects a code
     * @param index the index of the 
     */
    protected selectCode (index: number): void {
        this.data = this.datas.metadatas[index];
        this.code.setValue(this.data.code);
    }

    /**
     * The user clicks on "Add"
     */
    protected saveNodes (): void {

        if (this.datas.metadatas['graphdata']){
            this.datas.metadatas['graphdata'] = 
                JSON.stringify( window.LiteGraph.Editor.graph.serialize() );
        }
        else {
            this.datas.metadatas['graphdata'] = 
                JSON.stringify( window.LiteGraph.Editor.graph.serialize() );
        }

    }

    /**
     * The user wants to delete a script
     * @param ids: the ids to delete
     */
    protected delete (ids: number[]): void {
        let offset = 0;
        ids.forEach(id => {
            this.datas.metadatas.splice(id - offset, 1);
            offset++;
        });
    }

    /**
     * On the user changes the name of the script
     * @param id: the id of the script
     * @param value: the new value
     */
    protected change (id: number, value: string): void {
        this.datas.metadatas[id].name = value;
    }

    /**
     * Creates the code editor
     */
    protected async createEditor (parent?: HTMLDivElement, data?: BehaviorCode, caller?: Window): Promise<CodeEditor> {

    }

    /**
     * On edit the code in a new window
     * @param id: the id of the script
     */
    protected async editCode (id: number): Promise<void> {
        const name = 'Code Editor - ' + this.datas.metadatas[id].name;

        // Create popup
        const popup = Tools.OpenPopup('./code-editor.html#' + name, name, 1280, 800);
        popup.document.title = name;
        popup.addEventListener('editorloaded', async () => {
            const code = await this.createEditor(<HTMLDivElement> popup.document.getElementById('EDITOR-DIV'), this.data, popup);
            code.setValue(this.data.code);
        });
        popup.addEventListener('beforeunload', () => {
            CodeEditor.RemoveExtraLib(popup);
        });
    }
}
