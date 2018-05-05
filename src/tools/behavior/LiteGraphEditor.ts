
export default class LiteGraphEditor {
//Creates an interface to access extra features from a graph (like play, stop, live, etc)

public root : any;
public tools : any;
public graph : any;
public graphcanvas : any;

constructor(container_id, options?) {
	//fill container
	var html = "<div class='content'><div class='editor-area'><canvas class='graphcanvas' width='100%' height='100%' tabindex=10></canvas></div></div>";
	
	var root = document.createElement("div");
	this.root = root;
	root.className = "litegraph-editor";
	root.innerHTML = html;

	this.tools = root.querySelector(".tools");

	var canvas = root.querySelector(".graphcanvas");

	//create graph
	var graph = this.graph = new window.LiteGraph.LGraph();
	var graphcanvas = this.graphcanvas = new window.LiteGraph.LGraphCanvas(canvas,graph,{
		"show_info" : false
	});
	//graphcanvas.background_image = "imgs/grid.png";
	graph.onAfterExecute = function() { graphcanvas.draw(true); };

	graph.customStop = function() {
		graph.stop();
		window.LiteGraph.LiteGraph.stopBeginPlayProcessing = false;
	}

	//add stuff
	//this.addToolsButton("loadsession_button","Load","imgs/icon-load.png", this.onLoadButton.bind(this), ".tools-left" );
	//this.addToolsButton("savesession_button","Save","imgs/icon-save.png", this.onSaveButton.bind(this), ".tools-left" );


	//append to DOM
	var	parent = document.getElementById(container_id);
	if(parent)
		parent.appendChild(root);

	for (let i = 0; i<40;i++){
		graphcanvas.resize();
	}
    //graphcanvas.draw(true,true);
    
	window.LiteGraph.Editor = this;
	


}



Editor.prototype.createButton = function(name, icon_url)
{
	var button = document.createElement("button");
	if(icon_url)
		button.innerHTML = "<img src='"+icon_url+"'/> ";
	button.innerHTML += name;
	return button;
}


Editor.prototype.onSaveButton = function()
{
}

Editor.prototype.onPlayButton = function()
{
	var graph = this.graph;
	var button = this.root.querySelector("#playnode_button");

	if(graph.status == LiteGraph.LGraph.STATUS_STOPPED)
	{
		button.innerHTML = "<img src='imgs/icon-stop.png'/> Stop";
		graph.start(1); 
	}
	else
	{
		button.innerHTML = "<img src='imgs/icon-play.png'/> Play";
		graph.stop(); 
	}
}

Editor.prototype.onPlayStepButton = function()
{
	var graph = this.graph;
	graph.runStep(1);
	this.graphcanvas.draw(true,true);
}

Editor.prototype.onLiveButton = function()
{
	var is_live_mode = !this.graphcanvas.live_mode;
	this.graphcanvas.switchLiveMode(true);
	this.graphcanvas.draw();
	var url = this.graphcanvas.live_mode ? "imgs/gauss_bg_medium.jpg" : "imgs/gauss_bg.jpg";
	var button = this.root.querySelector("#livemode_button");
	button.innerHTML = !is_live_mode ? "<img src='imgs/icon-record.png'/> Live" : "<img src='imgs/icon-gear.png'/> Edit" ;
}


}
