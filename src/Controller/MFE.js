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


function destroySecondaryStructure(){
		$("#mRNAsvg").remove();
		$("#bases").height(300);
		$("#bases").children().show(0);
}



function renderSecondaryStructure(data){
	
	
	
		console.log("data", data);
		//return;
		if (data == null || data.vertices == null) return;

		$("#bases").children().show(0);
		for (var i = 0; i < data["toHide"].length; i ++){
			$(data["toHide"][i]).hide(0);
		}
	
		$("#bases").height(800);
		var yShift = 100;
		var width = parseFloat($("#pol").offset().left) + parseFloat($("#pol").width()) + $("#bases").scrollLeft() + 300;
		var height = parseFloat($("#bases").height()) - yShift - 100;
		
		$("#mRNAsvg").remove();
		$("#bases").append("<svg id=mRNAsvg width=" + width + " height=" + height + " style='left:" + 0 + "px; top:" + yShift + "px; position:absolute; z-index: 2'></svg>")
	
		var svg = d3.select("#mRNAsvg");




		var nodes = data["vertices"];
		var edges = data["bonds"];

		for (v in nodes) if (nodes[v].fixed) {
			nodes[v].y -= yShift;
			nodes[v].fixedY -= yShift;
		}

		var repulsionForce = -10;
		var wallRepulsionForce = -200; // * nodes.length;
		var wallReplusionDistance = 20000000; // How close does something need to be to a wall to experience repulsion
		
		//console.log("Plotting edges", edges, "vertices", nodes);



		

		var dist = function(d){
			return d.bp ? 30 : d.terminal ? 50 : 20;
		}
		


		 //var simulation = d3.forceSimulation()
		     //.force("link", d3.forceLink())
		     //.force("charge", d3.forceManyBody().strength(-20))
		     //.force("center", d3.forceCenter(width / 2, height / 2));
		
		var linkForce  = d3.forceLink(edges).distance(dist).strength(2);

								

		 var links = svg.selectAll("foo")
		     .data(edges)
		     .enter()
		     .append("line")
		     .style("stroke", "#858280")
		     .style("stroke-width", function(d) { return d.bp ? 5 : 2; } );

		 var color = d3.scaleOrdinal(d3.schemeCategory20);

		 var node = svg.selectAll("img")
		     .data(nodes)
		     .enter()
		     .append("g")
		     .call(d3.drag()
		         .on("start", dragstarted)
		         .on("drag", dragged)
		         .on("end", dragended));


		 var nodeImage = node.append("image")
		     .attr("xlink:href", d => "src/Images/" + d.src + ".png")
		     .attr("height", "22px")
		     .attr("width", d => d.fixed ? 0 : d.src == "5RNA" ? "77px" : "22px" )
		     //.attr("x", d => d.fixed ? d.fx - $("#bases").scrollLeft() : d.x)
		     //.attr("y", d => d.fixed ? d.fy : d.y);


		

	     var simulation = d3.forceSimulation(nodes)
			.alphaDecay(0.007)
			.force("linkForce",linkForce)
			.force("charge", d3.forceManyBody().strength(repulsionForce))
			//.force("gravity", gravity(0.5))
			.on("tick", tick)
			//.force("center", d3.forceCenter($("#pol").offset().left, 100));


		 //simulation.nodes(nodes);
		 //simulation.force("link")
		    // .links(edges);


		
		var dx = function(dvertex) {

			if (dvertex.fixed) return dvertex.x = dvertex.fixedX;


			if (dvertex.x - (dvertex.src == "5RNA" ? 38 : 11) < 0) dvertex.x = 0;// -dvertex.x;
			else if (dvertex.x + (dvertex.src == "5RNA" ? 38 : 11) > width-20) dvertex.x = width-20;// 2*(width-20) - dvertex.x;

			/*
			// Ensure that the item has not passed through the wall 
			var distanceToLeftWall_start =  dvertex.x - (dvertex.src == "5RNA" ? 38 : 11); // (dvertex.src == "5RNA" ? 38 : 11) - dvertex.startX; 
			var distanceToRightWall_start = width  - (dvertex.src == "5RNA" ? 77 : 22) - dvertex.x;
			dvertex.x = Math.max(distanceToLeftWall_start, Math.min(distanceToRightWall_start, dvertex.x)); 
			*/



			var distanceToLeftWall = Math.max(dvertex.x - (dvertex.src == "5RNA" ? 38 : 11), 1);
			var distanceToRightWall = Math.max((width-20) - (dvertex.x + (dvertex.src == "5RNA" ? 38 : 11)), 1);
			if (distanceToLeftWall < wallReplusionDistance) dvertex.vx += -wallRepulsionForce / (distanceToLeftWall * distanceToLeftWall);
			if (distanceToRightWall < wallReplusionDistance) dvertex.vx += wallRepulsionForce / (distanceToRightWall * distanceToRightWall);


			/*
			// Calculate wall repulsion force. Do not accept non-positive distances to the wall
			var distanceToLeftWall_end = Math.max(distanceToLeftWall_start + dvertex.x, 1); 
			var distanceToRightWall_end = Math.max(distanceToRightWall_start - dvertex.x, 1);
			if (distanceToLeftWall_end < wallReplusionDistance) dvertex.x += -wallRepulsionForce / (distanceToLeftWall_end * distanceToLeftWall_end * distanceToLeftWall_end);
			if (distanceToRightWall_end < wallReplusionDistance) dvertex.x += wallRepulsionForce / (distanceToRightWall_end * distanceToRightWall_end * distanceToRightWall_end);
			*/

			return dvertex.x; 

		};


		var dy = function(dvertex) {
			
			if (dvertex.fixed) return dvertex.y = dvertex.fixedY;


			if (dvertex.y - 22 < 0) dvertex.y = 0;// -dvertex.y + 22;
			else if (dvertex.y + 22 > height-20) dvertex.y = height-20; //2*(height-20) - dvertex.y;

			/*
			// Ensure that the item has not passed through the wall 
			var distanceToTopWall_start = dvertex.y; // (dvertex.src == "5RNA" ? 38 : 11) - dvertex.startX; 
			var distanceToBottomWall_start = 800 - 22 - dvertex.y;
			dvertex.y = Math.max(-distanceToTopWall_start, Math.min(distanceToBottomWall_start, dvertex.y)); 
			*/


			// Calculate wall repulsion force. Do not accept non-positive distances to the wall
			var distanceToTopWall = Math.max(dvertex.y - 22, 1);
			var distanceToBottomWall = Math.max((height-20) - (dvertex.y + 22), 1);
			if (distanceToTopWall < wallReplusionDistance) dvertex.vy += -wallRepulsionForce / (distanceToTopWall * distanceToTopWall);
			if (distanceToBottomWall < wallReplusionDistance) dvertex.vy += wallRepulsionForce / (distanceToBottomWall * distanceToBottomWall);



			return dvertex.y; // = Math.max(11 - dvertex.startY, Math.min(height - 22 - dvertex.startY, dvertex.y));
		};


		//simulation.on("tick", function() { 
		function tick(){
			
		//	node.attr("transform", (d) => "translate(" + dx(d) + "," + dy(d) + ")")
		
			

			node.attr("transform", function(dvertex){
				return "translate(" + dx(dvertex) + "," + dy(dvertex) + ")";
			});
			
			//node.attr("x", function(dvertex) { dx(dvertex) }); 
			//node.attr("y", function(dvertex) { dy(dvertex) });
			
			
		

			links.attr("x1", function(d) {
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

		 function dragstarted(d) {
			
			 if (d.fixed) return;

			// if (d.x - (d.src == "5RNA" ? 38 : 11) < 0 || d.y - 22 < 0 || d.x + (d.src == "5RNA" ? 38 : 11) > width-20 || d.y + 22 > height-20) return;
			
		     if (!d3.event.active) simulation.alphaTarget(0.3).restart();
		     d.fx = d.x;
		     d.fy = d.y;
		 }

		 function dragged(d) {
			
			if (d.fixed) return;

			//if (d3.event.x - (d.src == "5RNA" ? 38 : 11) < 0 || d3.event.y - 22 < 0 || d3.event.x + (d.src == "5RNA" ? 38 : 11) > width-20 || d3.event.y + 22 > height-20) return;
			
		    d.fx = d3.event.x;
		    d.fy = d3.event.y;
		 }

		 function dragended(d) {
			
			if (d.fixed) return;
			
		    if (!d3.event.active) simulation.alphaTarget(0);
		    d.fx = null;
		    d.fy = null;
		 }
	
}
