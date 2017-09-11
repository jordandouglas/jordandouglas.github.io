/* 
	--------------------------------------------------------------------
	--------------------------------------------------------------------
	This file is part of Simpol.

    Simpol is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Simpol is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Simpol.  If not, see <http://www.gnu.org/licenses/>. 
    --------------------------------------------------------------------
    --------------------------------------------------------------------
-*/



function renderSecondaryStructure(data){
	
	
		//console.log("data", data);
		//return;
		if (data == null) return;

		$("#bases").children().show(0);
		for (var i = 0; i < data["toHide"].length; i ++){
			$(data["toHide"][i]).hide(0);
		}
	
		var yShift = 100;
		var width = parseFloat($("#pol").offset().left) + $("#bases").scrollLeft();
		var height = parseFloat($("#bases").height()) - yShift + 500;
		
		$("#mRNAsvg").remove();
		$("#bases").append("<svg id=mRNAsvg width=" + width + " height=" + height + " style='left:" + 0 + "px; top:" + yShift + "px; position:absolute; z-index: 2'></svg>")
	
		var svg = d3.select("#mRNAsvg");

		 var nodes = [{
		     "src": "src/Images/Cm.png"
		 }, {
		     "src": "src/Images/Gm.png"
		 }, {
		     "src": "src/Images/Um.png"
		 }, {
		     "src": "src/Images/Am.png"
		 }];
		
		nodes = data["vertices"];
		
		console.log("nodes", data["vertices"])

		 var edges = [{
		     "source": 0,
		     "target": 1
		 }, {
		     "source": 1,
		     "target": 2
		 }, {
		     "source": 2,
		     "target": 3
		 }];
		
		edges = data["bonds"];
		
		//console.log("Plotting edges", edges, "vertices", nodes);
		

		var dist = function(d){
			return d.bp ? 25 : 20;
		}
		
		var gravity = function(alpha) {
		    return function(d) {
		        d.y += (d.startY - d.y) * alpha;
		        d.x += (d.startX - d.x) * alpha;
		    };
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
		     .attr("width", d => d.fixed ? 0 : "22px" )
		     .attr("x", d => d.fixed ? d.fx - $("#bases").scrollLeft() : d.startX)
		     .attr("y", d => d.fixed ? d.fy : d.startY);


	     var simulation = d3.forceSimulation(nodes)
			.alphaDecay(0.007)
			.force("linkForce",linkForce)
			.force("charge", d3.forceManyBody().strength(-10))
			//.force("gravity", gravity(0.5))
			.on("tick", tick)
			//.force("center", d3.forceCenter($("#pol").offset().left, 100));


		 //simulation.nodes(nodes);
		 //simulation.force("link")
		    // .links(edges);

		var dx = function(d) {
			if (d.fixed) return d.x = d.fx;
			return d.x = Math.max(11 - d.startX, Math.min(width  - 22 - d.startX, d.x)); 
		};
		var dy = function(d) {
			if (d.fixed) return d.y = d.fy;
			return d.y = Math.max(11 - d.startY, Math.min(height - 22 - d.startY, d.y));
		};


		//simulation.on("tick", function() { 
		function tick(){
			
		//	node.attr("transform", (d) => "translate(" + dx(d) + "," + dy(d) + ")")
		
			

			node.attr("transform", function(d){
				return "translate(" + dx(d) + "," + dy(d) + ")";
			});
			
			node.attr("x", function(d) { dx(d) }); 
			node.attr("y", function(d) { dy(d) });
			
			
			
			
		     links.attr("x1", function(d) {
		            return d.source.x + 11 + d.source.startX;
					//return Math.max(10, Math.min(width - 10, d.source.x));
		         })
		         .attr("y1", function(d) {
		            return d.source.y + 11 + d.source.startY;
					//return Math.max(10, Math.min(height - 10, d.source.y));
		         })
		         .attr("x2", function(d) {
		            return d.target.x + (11 + d.target.startX);
					//return Math.max(10, Math.min(width - 10, d.target.x));
		         })
		         .attr("y2", function(d) {
		            return d.target.y + (11 + d.target.startY);
					//return Math.max(10, Math.min(height - 10, d.target.y));
		         })


		    


		 };

		 function dragstarted(d) {
			
			 if (d.fixed) return;
			
		     if (!d3.event.active) simulation.alphaTarget(0.3).restart();
		     d.fx = d.x;
		     d.fy = d.y;
		 }

		 function dragged(d) {
			
			if (d.fixed) return;
			
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







