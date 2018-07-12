/* 
	--------------------------------------------------------------------
	--------------------------------------------------------------------
	This file is part of SimPol.

    SimPol is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    SimPol is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with SimPol.  If not, see <http://www.gnu.org/licenses/>. 
    --------------------------------------------------------------------
    --------------------------------------------------------------------
-*/

MFE_simulation = null;
MFE_node = null;
MFE_links = null;
MFE_wallRepulsionForce = -500; // * nodes.length;
MFE_wallReplusionDistance = 20000000; // How close does something need to be to a wall to experience repulsion
MFE_repulsionForce = -10;
MFE_yShift = 100;



function destroySecondaryStructure(){
	$("#mRNAsvg").remove();
	$("#bases").height(300);
	$("#bases").children().show(0);
}


// Call this function when the force directed graph already exists and you have new edges/vertices to add/remove
// https://bl.ocks.org/mbostock/1095795
function updateSecondaryStructure(new_nodes, edges){


	if (new_nodes.length == 0 || MFE_simulation == null) return;

	if (MFE_simulation == null) {
		//renderSecondaryStructure(data);
		return;
	}

	//renderSecondaryStructure({vertices: nodes, bonds: []});
	//return;

	for (var v in new_nodes) if (new_nodes[v].fixed) {
		new_nodes[v].y -= MFE_yShift;
		new_nodes[v].fixedY -= MFE_yShift;
	}


	MFE_width = parseFloat($("#pol").offset().left) + parseFloat($("#pol").width()) + $("#bases").scrollLeft() + 300;
	$("#mRNAsvg").width(MFE_width);
	



	// If there are any new vertices add them to the list. If some need removing then remove them
	var simulationNodes = MFE_simulation.nodes();
	console.log(simulationNodes);
	for (var i = 0; i < new_nodes.length; i ++){
		var baseNum = parseFloat(new_nodes[i].id.substring(1));
		simulationNodes[baseNum] = new_nodes[i];
	}
	

	var svg = d3.select("#mRNAsvg");


	// Remove the old edges and nodes
	$(".svgnode").remove();
	$(".svgedge").remove();


	// Add the new bonds
	var linkForce = d3.forceLink(edges).distance(MFE_dist).strength(2);
	MFE_links = svg.selectAll("foo")
		 .data(edges);

	MFE_links.exit().remove();

	MFE_links =	 MFE_links.enter()
		 .append("line")
		 .attr("class", "svgedge")
		 .style("stroke", "#858280")
		 .style("stroke-width", function(d) { return d.bp ? 5 : 2; } )
		 .merge(MFE_links);
	var color = d3.scaleOrdinal(d3.schemeCategory20);



	
	// Add the new nodes
	MFE_node = svg.selectAll("img")
	 .data(simulationNodes);

	// MFE_node.exit().remove();

    MFE_node = MFE_node.enter()
		 .append("g")
		 .call(d3.drag()
	     .on("start", MFE_dragstarted)
	     .on("drag", MFE_dragged)
	     .on("end", MFE_dragended));



	var nodeImage = MFE_node.append("image")
	 .attr("xlink:href", d => "src/Images/" + d.src + ".png")
	 .attr("height", "22px")
	 .attr("width", d => d.fixed ? 0 : d.src == "5RNA" ? "77px" : "22px" )
   	 .attr("class", "svgnode");
	 
	 //.attr("x", d => d.fixed ? d.fx - $("#bases").scrollLeft() : d.x)
	 //.attr("y", d => d.fixed ? d.fy : d.y);


	// Restart the simulation
	MFE_simulation = d3.forceSimulation(simulationNodes)
		.alphaDecay(0.007)
		.force("linkForce", linkForce)
		.force("charge", d3.forceManyBody().strength(MFE_repulsionForce))
		.on("tick", tick)
		//.alpha(1).restart();


	//MFE_simulation.nodes(MFE_node);
	// MFE_simulation.alpha(1).restart();

	/*
	for (var i = 0; i < data.vertices.length; i ++){

		// If this vertex already exists
		var vertex = data.vertices[i];


	}
	*/

}


// Call this function the first time the force directed graph is established
function renderSecondaryStructure(data){
	
	

	
		$("#bases").height(800);
		MFE_width = parseFloat($("#pol").offset().left) + parseFloat($("#pol").width()) + $("#bases").scrollLeft() + 300;
		MFE_height = parseFloat($("#bases").height()) - MFE_yShift - 100;
		
		$("#mRNAsvg").remove();
		$("#bases").append("<svg id=mRNAsvg width=" + MFE_width + " height=" + MFE_height + " style='left:" + 0 + "px; top:" + MFE_yShift + "px; position:absolute; z-index: 2'></svg>")
	
		var svg = d3.select("#mRNAsvg");


		/*

		console.log("data", data);
		//return;
		if (data == null || data.vertices == null) return;

		$("#bases").children().show(0);
		for (var i = 0; i < data["toHide"].length; i ++){
			$(data["toHide"][i]).hide(0);
		}


		*/
		//if (data == null || data.vertices == null) return;
		//var nodes = data["vertices"];
		//var edges = data["bonds"];



		var nodes = [];
		var edges = [];

		//for (v in nodes) if (nodes[v].fixed) {
			//nodes[v].y -= yShift;
			//nodes[v].fixedY -= yShift;
		//}



		
		//console.log("Plotting edges", edges, "vertices", nodes);




		 //var simulation = d3.forceSimulation()
		     //.force("link", d3.forceLink())
		     //.force("charge", d3.forceManyBody().strength(-20))
		     //.force("center", d3.forceCenter(width / 2, height / 2));
		
		var linkForce  = d3.forceLink(edges).distance(MFE_dist).strength(2);

								

		MFE_links = svg.selectAll("foo")
		 .data(edges)
		 .enter()
		 .append("line")
		 .style("stroke", "#858280")
		 .style("stroke-width", function(d) { return d.bp ? 5 : 2; } );

		 var color = d3.scaleOrdinal(d3.schemeCategory20);

		 MFE_node = svg.selectAll("img")
		     .data(nodes)
		     .enter()
		     .append("g")
		     .call(d3.drag()
		         .on("start", MFE_dragstarted)
		         .on("drag", MFE_dragged)
		         .on("end", MFE_dragended));


		 var nodeImage = MFE_node.append("image")
		     .attr("xlink:href", d => "src/Images/" + d.src + ".png")
		     .attr("height", "22px")
		     .attr("width", d => d.fixed ? 0 : d.src == "5RNA" ? "77px" : "22px" )
		     //.attr("x", d => d.fixed ? d.fx - $("#bases").scrollLeft() : d.x)
		     //.attr("y", d => d.fixed ? d.fy : d.y);


		

	     MFE_simulation = d3.forceSimulation(nodes)
			.alphaDecay(0.007)
			.force("linkForce", linkForce)
			.force("charge", d3.forceManyBody().strength(MFE_repulsionForce))
			//.force("gravity", gravity(0.5))
			.on("tick", tick)
			//.force("center", d3.forceCenter($("#pol").offset().left, 100));


		 //simulation.nodes(nodes);
		 //simulation.force("link")
		    // .links(edges);




		
}


function MFE_dist(d){
	return d.bp ? 30 : d.terminal ? 50 : 20;
}


function MFE_dragstarted(d) {

	if (d.fixed) return;

	// if (d.x - (d.src == "5RNA" ? 38 : 11) < 0 || d.y - 22 < 0 || d.x + (d.src == "5RNA" ? 38 : 11) > width-20 || d.y + 22 > height-20) return;

	if (!d3.event.active) MFE_simulation.alphaTarget(0.3).restart();
	d.fx = d.x;
	d.fy = d.y;
}

function MFE_dragged(d) {

	if (d.fixed) return;

	//console.log("dragged", d, d3.event);

	//if (d3.event.x - (d.src == "5RNA" ? 38 : 11) < 0 || d3.event.y - 22 < 0 || d3.event.x + (d.src == "5RNA" ? 38 : 11) > width-20 || d3.event.y + 22 > height-20) return;

	d.fx = d3.event.x;
	d.fy = d3.event.y;
}

function MFE_dragended(d) {

	if (d.fixed) return;

	if (!d3.event.active) MFE_simulation.alphaTarget(0);
	d.fx = null;
	d.fy = null;
}




function MFE_dx(dvertex) {

	if (dvertex.fixed) return dvertex.x = dvertex.fixedX;

	//console.log("moving", dvertex);

	if (dvertex.x - (dvertex.src == "5RNA" ? 38 : 11) < 0) dvertex.x = 0;// -dvertex.x;
	else if (dvertex.x + (dvertex.src == "5RNA" ? 38 : 11) > MFE_width-20) dvertex.x = MFE_width-20;// 2*(width-20) - dvertex.x;

	/*
	// Ensure that the item has not passed through the wall 
	var distanceToLeftWall_start =  dvertex.x - (dvertex.src == "5RNA" ? 38 : 11); // (dvertex.src == "5RNA" ? 38 : 11) - dvertex.startX; 
	var distanceToRightWall_start = width  - (dvertex.src == "5RNA" ? 77 : 22) - dvertex.x;
	dvertex.x = Math.max(distanceToLeftWall_start, Math.min(distanceToRightWall_start, dvertex.x)); 
	*/



	var distanceToLeftWall = Math.max(dvertex.x - (dvertex.src == "5RNA" ? 38 : 11), 1);
	var distanceToRightWall = Math.max((MFE_width-20) - (dvertex.x + (dvertex.src == "5RNA" ? 38 : 11)), 1);
	if (distanceToLeftWall < MFE_wallReplusionDistance) dvertex.vx += -MFE_wallRepulsionForce / (distanceToLeftWall * distanceToLeftWall);
	if (distanceToRightWall < MFE_wallReplusionDistance) dvertex.vx += MFE_wallRepulsionForce / (distanceToRightWall * distanceToRightWall);


	/*
	// Calculate wall repulsion force. Do not accept non-positive distances to the wall
	var distanceToLeftWall_end = Math.max(distanceToLeftWall_start + dvertex.x, 1); 
	var distanceToRightWall_end = Math.max(distanceToRightWall_start - dvertex.x, 1);
	if (distanceToLeftWall_end < wallReplusionDistance) dvertex.x += -wallRepulsionForce / (distanceToLeftWall_end * distanceToLeftWall_end * distanceToLeftWall_end);
	if (distanceToRightWall_end < wallReplusionDistance) dvertex.x += wallRepulsionForce / (distanceToRightWall_end * distanceToRightWall_end * distanceToRightWall_end);
	*/

	return dvertex.x; 

};


function MFE_dy(dvertex) {
	
	if (dvertex.fixed) return dvertex.y = dvertex.fixedY;


	if (dvertex.y - 22 < 0) dvertex.y = 0;// -dvertex.y + 22;
	else if (dvertex.y + 22 > MFE_height-20) dvertex.y = MFE_height-20; //2*(height-20) - dvertex.y;

	/*
	// Ensure that the item has not passed through the wall 
	var distanceToTopWall_start = dvertex.y; // (dvertex.src == "5RNA" ? 38 : 11) - dvertex.startX; 
	var distanceToBottomWall_start = 800 - 22 - dvertex.y;
	dvertex.y = Math.max(-distanceToTopWall_start, Math.min(distanceToBottomWall_start, dvertex.y)); 
	*/


	// Calculate wall repulsion force. Do not accept non-positive distances to the wall
	var distanceToTopWall = Math.max(dvertex.y - 22, 1);
	var distanceToBottomWall = Math.max((MFE_height-20) - (dvertex.y + 22), 1);
	if (distanceToTopWall < MFE_wallReplusionDistance) dvertex.vy += -MFE_wallRepulsionForce / (distanceToTopWall * distanceToTopWall * distanceToTopWall);
	if (distanceToBottomWall < MFE_wallReplusionDistance) dvertex.vy += MFE_wallRepulsionForce / (distanceToBottomWall * distanceToBottomWall * distanceToTopWall);



	return dvertex.y; // = Math.max(11 - dvertex.startY, Math.min(height - 22 - dvertex.startY, dvertex.y));
};



//simulation.on("tick", function() { 
function tick(){
	
//	node.attr("transform", (d) => "translate(" + dx(d) + "," + dy(d) + ")")


	MFE_node.attr("transform", function(dvertex){
		return "translate(" + MFE_dx(dvertex) + "," + MFE_dy(dvertex) + ")";
	});
	
	//node.attr("x", function(dvertex) { dx(dvertex) }); 
	//node.attr("y", function(dvertex) { dy(dvertex) });
	
	


	MFE_links.attr("x1", function(d) {
	    return d.source.x + (d.src == "5RNA" ? 38 : 11);// + d.source.startX;
		//return Math.max(10, Math.min(width - 10, d.source.x));
	 })
	 .attr("y1", function(d) {
	    return d.source.y + (d.src == "5RNA" ? 38 : 11);// + d.source.startY;
		//return Math.max(10, Math.min(height - 10, d.source.y));
	 })
	 .attr("x2", function(d) {
	    return d.target.x + (d.src == "5RNA" ? 38 : 11);// + d.target.startX;
		//return Math.max(10, Math.min(width - 10, d.target.x));
	 })
	 .attr("y2", function(d) {
	    return d.target.y + (d.src == "5RNA" ? 38 : 11);// + d.target.startY;
		//return Math.max(10, Math.min(height - 10, d.target.y));
	 })


 };