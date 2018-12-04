
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


function refreshNavigationCanvases(){

	drawTranslocationCanvas();
	drawNTPcanvas();
	drawDeactivationCanvas();
	drawCleavageCanvas();

	var numSlippageLandscapes = $(".slippageCell").length;
	//console.log("numSlippageLandscapes", numSlippageLandscapes);
	for (var s = 0; s < numSlippageLandscapes; s ++) drawSlippageCanvas(s);


}




function removeArrow(ele){
	$(ele).remove();
}

function plotArrowButton_navigationPanel(ctx, id, fromx, fromy, direction, label = "", rate, onClick = "", hoverTitle = "", spacingBetweenStates, canvas, reactionApplicable = true){


	var arrowPadding = IS_MOBILE ? 12 : 0;
	var arrowWidth = spacingBetweenStates + 15;
	var arrowHeight = 55;
	var arrowTop =  $(canvas).offset().top - $(canvas).parent().offset().top + fromy - arrowHeight/2 - arrowPadding;
	var arrowLeft =  fromx + (direction == "right" ? 0 : -arrowWidth) - arrowPadding;
	var cssclass = direction == "left" ? "" : "rotate180";
	var textAlign = direction == "left" ? "right" : "left";
	var src = "../src/Images/arrow" + (reactionApplicable ? "" : "Grey") + ".png";
	var cursorClass = reactionApplicable ? "pointer" : "not-allowed";
	var labelY = arrowTop + 18 + arrowPadding;
	var labelX = arrowLeft + arrowPadding;


	var arrowHTML = `
		<input type="image" id="` + id + `" class="navArrow ` + cssclass + `" src="` + src + `" title="` + hoverTitle + `" onclick="if (!simulating)` + onClick + `;" style = "padding:` + arrowPadding + `; cursor:` + cursorClass + `;position:absolute; width:` + arrowWidth + `px; height:` + arrowHeight + `px; top:` + arrowTop + `px; left:` + arrowLeft + `px; z-index:2 ">
		<div class="navArrow noselect" onclick="if (!simulating) ` + onClick + `;" title="` + hoverTitle + `" style="cursor:` + cursorClass + `; vertical-align:middle; color:white; font-family:Arial; text-align:` + textAlign + `; position:absolute; font-size:15px; top:` + labelY + `px; left:` + labelX + `px; width:` + arrowWidth + `px; z-index:2">&nbsp;` + label + `&nbsp;</div>

	`;

	// Rate above label
	if(rate != null){

		var rateHTML = `
			<div class="navArrow" style="color:black; font-family:Arial; text-align:` + textAlign + `; position:absolute; font-size:18px; top:` + (arrowTop - 25) + `px; left:` + arrowLeft + `px; width:` + arrowWidth + `px">` + roundToSF(rate, 3) + `s<sup>-1</sup></div>
		`;

		arrowHTML += rateHTML;

	}


	$(canvas).parent().append(arrowHTML);


}




function draw_sliding_plot(dx){


	var ymax = -maxHeight;
	for (i = 0; i < displaySlidingPeakHeights.length; i ++){
		if (displaySlidingPeakHeights[i] != maxHeight) ymax = Math.max(ymax, displaySlidingPeakHeights[i]);
	}
	
	var ymin = maxHeight;
	for (i = 0; i < displaySlidingTroughHeights.length; i ++){
		if (displaySlidingTroughHeights[i] != maxHeight) ymin = Math.min(ymin, displaySlidingTroughHeights[i]);
	}
	
	ymax = roundToSF(ymax);
	ymin = roundToSF(ymin);

	
	draw_a_landscape_plot(dx, displaySlidingPeakHeights, displaySlidingTroughHeights, "#008CBA", "translocationLandscapeCanvas", ymin, ymax);

}






function drawTranslocationCanvas(){


	// Delete the canvas and add it back
	//$("#deactivationCanvas").remove();
	//$("#deactivationCanvasDIV").html('<canvas id="deactivationCanvas" height=70 width=350></canvas>');

	// Draw two arrow buttons - one to slide left and one to slide right
	// The free energy landscape is in a different canvas

	var canvas = $("#translocationCanvas")[0];
	if (canvas == null) return;


	var ctx = canvas.getContext('2d');
	ctx.globalAlpha = 1;


	
	var plotWidth = canvas.width;
	var plotHeight = canvas.height;


	getTranslocationCanvasData_controller(function(result){


		//console.log("result", result);

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		$(canvas).parent().find(".navArrow").remove();

		var currentStateMargin = 2;
		var spacingBetweenStates = plotWidth * 0.25 - 2*currentStateMargin;


		// Backwards arrow
		var fromX = canvas.width / 2 - 25;
		var kBck = result["kBck"];

		plotArrowButton_navigationPanel(ctx, "bckBtn", fromX, canvas.height/2 + 20, "left", "Backwards", kBck, "backwards_controller()", "Translocate the polymerase backwards (&larr; key)", spacingBetweenStates, canvas, result["bckBtnActive"]);



		// Forwards arrow
		var fromX = canvas.width / 2 + 25;
		var kFwd = result["kFwd"];

		plotArrowButton_navigationPanel(ctx, "fwdBtn", fromX, canvas.height/2 + 20, "right", result["fwdBtnLabel"], kFwd, "forward_controller()", "Translocate the polymerase forwards (&rarr; key)", spacingBetweenStates, canvas, result["fwdBtnActive"]);


	});



}






function drawNTPcanvas(){


	// Delete the canvas and add it back
	//$("#ntpCanvas").remove();
	//$("#ntpCanvasDIV").html('<canvas id="ntpCanvas" height=70 width=350></canvas>');


	var canvas = $("#ntpCanvas")[0];
	if (canvas == null) return;


	var ctx = canvas.getContext('2d');
	ctx.globalAlpha = 1;


	
	var plotWidth = canvas.width;
	var plotHeight = canvas.height;

	getNTPCanvasData_controller(function(result){

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		$(canvas).parent().find(".navArrow").remove();
		$("#ntpCanvasDIV img").remove();

		if (result == null || result["templateBaseBeingCopied"] == null || result.terminated) return;

		
		var stateMargin = 2;
		var stateWidth = 0.2 * (plotWidth - stateMargin);
		var spacingBetweenStates = (plotWidth - 3*stateWidth - 2*stateMargin) / 2;


		var topBaseY = stateMargin + plotHeight * 0.1;
		var bottomBaseY = plotHeight * 0.5;


		var leftStateX = 5;
		var middleStateX = 140;
		var rightStateX = 280;

		// Left hand state (unbound)
		var leftStateHTML =  `
			<img src="../src/Images/` + result["previousTemplateBase"] 	+ `g.png" style="left:` + leftStateX + 		`px; top:` + topBaseY + 		`px; width: 20px; height: 20px; position: absolute; z-index: 3;">
			<img src="../src/Images/` + result["templateBaseBeingCopied"]	+ `g.png" style="left:` + (leftStateX + 25) + `px; top:` + topBaseY + 		`px; width: 20px; height: 20px; position: absolute; z-index: 3;">
			<img src="../src/Images/` + result["previousNascentBase"] 		+ `m.png" style="left:` + leftStateX + 		`px; top:` + bottomBaseY + 	`px; width: 20px; height: 20px; position: absolute; z-index: 3;">
		`;


		// Middle state (bound)
		var middleStateHTML =  `
			<img src="../src/Images/` + result["previousTemplateBase"] 	+ `g.png" style="left:` + middleStateX + 		`px; top:` + topBaseY + 		`px; width: 20px; height: 20px; position: absolute; z-index: 3;">
			<img src="../src/Images/` + result["templateBaseBeingCopied"]	+ `g.png" style="left:` + (middleStateX + 25) + `px; top:` + topBaseY + 		`px; width: 20px; height: 20px; position: absolute; z-index: 3;">
			<img src="../src/Images/` + result["previousNascentBase"] 		+ `m.png" style="left:` + middleStateX + 		`px; top:` + bottomBaseY + 		`px; width: 20px; height: 20px; position: absolute; z-index: 3;">
			<img src="../src/Images/` + result["baseToAdd"] 				+ `m.png" style="left:` + (middleStateX + 30) +	`px; top:` + (bottomBaseY+5 ) + `px; width: 20px; height: 20px; position: absolute; z-index: 3;">
			<img src="../src/Images/TP.png"										  style="left:` + (middleStateX + 45) +	`px; top:` + (bottomBaseY+20) + `px; width: 20px; height: 20px; position: absolute; z-index: 3;">
		`;

		// Right state (catalysed)
		var rightStateHTML = `
			<img src="../src/Images/` + result["previousTemplateBase"] 	+ `g.png" style="left:` + rightStateX + 		`px; top:` + topBaseY + 	`px; width: 20px; height: 20px; position: absolute; z-index: 3;">
			<img src="../src/Images/` + result["templateBaseBeingCopied"]	+ `g.png" style="left:` + (rightStateX + 25) + `px; top:` + topBaseY + 		`px; width: 20px; height: 20px; position: absolute; z-index: 3;">
			<img src="../src/Images/` + result["previousNascentBase"] 		+ `m.png" style="left:` + rightStateX + 		`px; top:` + bottomBaseY + 	`px; width: 20px; height: 20px; position: absolute; z-index: 3;">
			<img src="../src/Images/` + result["baseToAdd"] 				+ `m.png" style="left:` + (rightStateX + 25) +	`px; top:` + bottomBaseY +  `px; width: 20px; height: 20px; position: absolute; z-index: 3;">
		`;


		$("#ntpCanvasDIV").append(leftStateHTML);
		$("#ntpCanvasDIV").append(middleStateHTML);
		$("#ntpCanvasDIV").append(rightStateHTML);




		// Draw backbone bonds
		ctx.strokeStyle = "#696969";
		ctx.lineWidth = 5;
		ctx.beginPath();
		ctx.moveTo(leftStateX + 10, topBaseY + 10);
		ctx.lineTo(leftStateX + 40, topBaseY + 10);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(middleStateX + 10, topBaseY + 10);
		ctx.lineTo(middleStateX + 40, topBaseY + 10);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(rightStateX + 10, topBaseY + 10);
		ctx.lineTo(rightStateX + 40, topBaseY + 10);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(rightStateX + 10, bottomBaseY + 10);
		ctx.lineTo(rightStateX + 40, bottomBaseY + 10);
		ctx.stroke();




		// Draw arrows between states

		// Unbound or bound state
		if (result["mRNAPosInActiveSite"] >= 1){
			var bindOrReleaseRate = result["NTPbound"] ? result["kRelease"] : result["kBind"];
			var onClickLeft = result["NTPbound"] && result["mRNAPosInActiveSite"] == 1 ? "releaseNTP_controller()" : "bindNTP_controller()";

			var arrowX = result["NTPbound"] ? middleStateX - 10: leftStateX + 50;
			var bindingOrReleasingApplicable = result["mRNAPosInActiveSite"] == 1 && result["activated"];
			if (!bindingOrReleasingApplicable) bindOrReleaseRate = 0;
			plotArrowButton_navigationPanel(ctx, "bindBtn", arrowX, plotHeight / 2, result["NTPbound"] ? "left" : "right", result["NTPbound"] ? "Release" : "Bind", bindOrReleaseRate, onClickLeft, result["NTPbound"] ? "Release the NTP (shift + &larr;)" : "Bind an NTP molecule (shift + &rarr;)", spacingBetweenStates, canvas, bindingOrReleasingApplicable);



			// NTP bound state
			if (result["NTPbound"]){

				var onClickRight = "bindNTP_controller()";

				var arrowX = middleStateX + 55;
				plotArrowButton_navigationPanel(ctx, "catBtn", arrowX, plotHeight / 2, "right", "Catalyse", result["kCat"], onClickRight, "Add the bound NTP onto the end of the nascent strand (shift + &rarr;)", spacingBetweenStates, canvas, true);


			}




		}

		// Catalysed state
		else if (!result["NTPbound"] && result["mRNAPosInActiveSite"] <= 0){

			var decayRate = 0;
			var onClickLeft = "releaseNTP_controller()";

			var arrowX = rightStateX - 10;
			var decayApplicable = result["mRNAPosInActiveSite"] == 0 && result["activated"];
			plotArrowButton_navigationPanel(ctx, "catBtn", arrowX, plotHeight / 2, "left", "Lysis", decayRate, onClickLeft, "Pyrophosphorylysis; remove the most recently added base from the chain (shift + &larr;)", spacingBetweenStates, canvas, decayApplicable);


		}


	});


}








function drawDeactivationCanvas(){


	// Delete the canvas and add it back
	//$("#deactivationCanvas").remove();
	//$("#deactivationCanvasDIV").html('<canvas id="deactivationCanvas" height=70 width=350></canvas>');


	var canvas = $("#deactivationCanvas")[0];
	if (canvas == null) return;


	var ctx = canvas.getContext('2d');
	ctx.globalAlpha = 1;

	
	var plotWidth = canvas.width;
	var plotHeight = canvas.height;


	getDeactivationCanvasData_controller(function(result){


		// Draws a plot. On the left is a picture of the activated polymerase and on the right is the inactivated one
		// The current state will be highlighted
		// There will be an arrow going from the current state to the other state
		// Above the arrow is the rate constant
		// Below the arrow is a button to perform the reaction manually
		var activated = result.activated;
		var NTPbound = result.NTPbound;
        var operationApplicable = result.operationApplicable;
		var kA = result["kA"];
		var kU = result["kU"];
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		$(canvas).parent().find(".navArrow").remove();
		$("#deactivationCanvasDIV img").remove(); 


		var currentStateMargin = 2;
		var spacingBetweenStates = plotWidth * 0.25 - 2*currentStateMargin;


		
		// Draw a polymerase on either side
		var polHeightRad = (plotHeight - currentStateMargin) / 2;
		var polWidthRad = (plotWidth * 0.35 - currentStateMargin) / 2;
		var polYCoord = 5;
		var leftPolXCoord = 20;
		var rightPolXCoord = 200;


		
		var leftHTML = `<img style="position:absolute; width:80px; left:` + leftPolXCoord + `px; top:` + polYCoord + `px;" src = "../src/Images/activated.png"></img>`;
		var rightHTML = `<img style="position:absolute; width:80px; left:` + rightPolXCoord + `px; top:` + polYCoord + `px;" src = "../src/Images/inactivated.png"></img>`;
		$("#deactivationCanvasDIV").append(leftHTML);
		$("#deactivationCanvasDIV").append(rightHTML);
		
		/*
		
		// Draw a polymerase on either side
		var polHeightRad = (plotHeight - currentStateMargin) / 2;
		var polWidthRad = (plotWidth * 0.35 - currentStateMargin) / 2;
		var polYCoord = polHeightRad + currentStateMargin/2;
		var activePolXCoord = polWidthRad + currentStateMargin;
		var inactivePolXCoord = plotWidth * 0.65 + polWidthRad;



		ctx.fillStyle = "#b3b3b3";
		ctx.beginPath();
		ctx_ellipse(ctx, activePolXCoord, polYCoord, polWidthRad, polHeightRad, 0, 0, 2*Math.PI);
		ctx.fill();


		ctx.beginPath();
		ctx_ellipse(ctx, inactivePolXCoord, polYCoord, polWidthRad, polHeightRad, 0, 0, 2*Math.PI);
		ctx.fill();




		// Rectangle to denote hybrid
		var rectHeight = (plotHeight - currentStateMargin) * 0.4;
		var rectWidth = polWidthRad*1.5;
		var rectYPos = (plotHeight-currentStateMargin) * 0.3 + currentStateMargin/2;
		var activeRectXPos = rectWidth * 1/6 + currentStateMargin;
		var inactiveRectXPos = plotWidth * 0.65 + rectWidth * 1/6;


		ctx.fillStyle = "#e6e6e6";
		ctx.fillRect(activeRectXPos, rectYPos, rectWidth, rectHeight);
		
		ctx.fillStyle = "#708090";
		ctx.fillRect(inactiveRectXPos, rectYPos, rectWidth, rectHeight);


		ctx.globalAlpha = 1;
		
		*/


		// Arrow from current state to other state
		var fromX = (activated ?  plotWidth * 0.35 + currentStateMargin : plotWidth * 0.65 - currentStateMargin);
		var rate = activated ? kU : kA;
		var onClick = activated ? "deactivate_controller()" : "activate_controller()";

		if (NTPbound || !result.allowDeactivation) rate = 0; // Cannot deactivate if NTP bound
		plotArrowButton_navigationPanel(ctx, "activBtn", fromX, plotHeight / 2, activated ? "right" : "left", activated ? "Deactivate" : "Activate", rate, onClick, activated ? "Send the polymerase into a catalytically inactive intermediate state" : "Bring the polymerase back into its catalytically active intermediate state", spacingBetweenStates, canvas, operationApplicable);




	});



}





function drawCleavageCanvas(){

	var canvas = $("#cleavageCanvas")[0];
	if (canvas == null) return;


	var ctx = canvas.getContext('2d');
	ctx.globalAlpha = 1;

	
	var plotWidth = canvas.width;
	var plotHeight = canvas.height;


	getCleavageCanvasData_controller(function(result){

		
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		$(canvas).parent().find(".navArrow").remove();
		$("#cleavageCanvasDIV img").remove(); 


		var currentStateMargin = 2;
		var spacingBetweenStates = plotWidth * 0.25 - 2*currentStateMargin;



		// Draw a polymerase on either side
		var polHeightRad = (plotHeight - currentStateMargin) / 2;
		var polWidthRad = (plotWidth * 0.35 - currentStateMargin) / 2;
		var polYCoord = 15;
		var leftPolXCoord = -10;
		var rightPolXCoord = 190;


		
		var leftHTML = `<img style="position:absolute; width:120px; left:` + leftPolXCoord + `px; top:` + polYCoord + `px;" src = "../src/Images/leftCleavage.png"></img>`;
		var rightHTML = `<img style="position:absolute; width:120px; left:` + rightPolXCoord + `px; top:` + polYCoord + `px;" src = "../src/Images/rightCleavage.png"></img>`;
		$("#cleavageCanvasDIV").append(leftHTML);
		$("#cleavageCanvasDIV").append(rightHTML);
		

		// Arrow from current state to other state
		var fromX = plotWidth * 0.35 + currentStateMargin;
		var rate = result.kcleave;
		var onClick = "cleave_controller()";

		plotArrowButton_navigationPanel(ctx, "cleaveBtn", fromX, plotHeight / 2, "right", "Cleave", rate, onClick, "Cleave the 3\u2032 end of the nascent strand to break the pause", spacingBetweenStates, canvas, result.canCleave);




	});

}




function drawSlippageCanvas(S = 0){


	// Delete the canvas and add it back
	//$("#deactivationCanvas").remove();
	//$("#deactivationCanvasDIV").html('<canvas id="deactivationCanvas" height=70 width=350></canvas>');

	//console.log("Drawing slippage landscape", S);

	var canvas = $("#slippageCanvas" + S)[0];
	if (canvas == null) return;


	var ctx = canvas.getContext('2d');
	ctx.globalAlpha = 1;

	
	var plotWidth = canvas.width;
	var plotHeight = canvas.height;


	getSlippageCanvasData_controller(S, function(result){


		ctx.clearRect(0, 0, canvas.width, canvas.height);
		$(canvas).parent().find(".navArrow").remove();
		
		var stateWidth = 0.2 * plotWidth;
		var spacingBetweenStates = (plotWidth - 3*stateWidth) / 2 - 20;


		var leftStateX = 0;
		var middleStateX = (canvas.width - stateWidth) / 2;
		var rightStateX = canvas.width - stateWidth;


		// Each state is a horizontal line with kinks to represent bulge positions. The current kink is in red.
		var pixelsPerBasepair = stateWidth / (result["hybridLen"]-1);
		var templateHeight = canvas.height * 0.2;
		var nascentHeight = canvas.height * 0.35;
		var bulgeHeight = canvas.height * 0.6;


		ctx.strokeStyle = "#696969";
		ctx.lineWidth = 3;

		// Middle state
		var stateMiddle = result["stateMiddle"];

		ctx.beginPath();
		var rightBaseX = middleStateX + stateWidth;


		ctx.moveTo(rightBaseX, templateHeight);
		ctx.lineTo(middleStateX, templateHeight); 
		ctx.stroke();

		ctx.moveTo(rightBaseX - Math.max(stateMiddle["mRNAPosInActiveSite"], 0) * pixelsPerBasepair, nascentHeight); // Start on right side of hybrid
		for (var s = 0; s < stateMiddle["bulgePos"].length; s ++){
			var bulgePos = stateMiddle["bulgePos"][s];
			if (bulgePos == 0) continue;
			ctx.lineTo(rightBaseX - (bulgePos*pixelsPerBasepair - pixelsPerBasepair), nascentHeight); 
			ctx.lineTo(rightBaseX - (bulgePos*pixelsPerBasepair - 0.5*pixelsPerBasepair), bulgeHeight); // Top of kink
			ctx.lineTo(rightBaseX - (bulgePos*pixelsPerBasepair), nascentHeight); // Top of kink
		}
		ctx.lineTo(middleStateX, nascentHeight); 
		ctx.stroke();


		// Left state
		var stateLeft = result["stateLeft"];
		ctx.beginPath();
		rightBaseX = leftStateX + stateWidth;

		// Template
		ctx.moveTo(rightBaseX, templateHeight);
		ctx.lineTo(leftStateX, templateHeight); 
		ctx.stroke();


		ctx.moveTo(rightBaseX - Math.max(stateLeft["mRNAPosInActiveSite"], 0) * pixelsPerBasepair, nascentHeight);
		for (var s = 0; s < stateLeft["bulgePos"].length; s ++){
			var bulgePos = stateLeft["bulgePos"][s];
			if (bulgePos == 0) continue;
			ctx.lineTo(rightBaseX - (bulgePos*pixelsPerBasepair - pixelsPerBasepair), nascentHeight); 
			ctx.lineTo(rightBaseX - (bulgePos*pixelsPerBasepair - 0.5*pixelsPerBasepair), bulgeHeight); // Top of kink
			ctx.lineTo(rightBaseX - (bulgePos*pixelsPerBasepair), nascentHeight); // Top of kink
		}
		ctx.lineTo(leftStateX, nascentHeight);
		ctx.stroke();




		// Right state
		var stateRight = result["stateRight"];
		ctx.beginPath();
		rightBaseX = rightStateX + stateWidth;

		// Template
		ctx.moveTo(rightBaseX, templateHeight);
		ctx.lineTo(rightStateX, templateHeight); 
		ctx.stroke();


		ctx.moveTo(rightBaseX - Math.max(stateRight["mRNAPosInActiveSite"], 0) * pixelsPerBasepair, nascentHeight);
		for (var s = 0; s < stateRight["bulgePos"].length; s ++){
			var bulgePos = stateRight["bulgePos"][s];
			if (bulgePos == 0) continue;
			ctx.lineTo(rightBaseX - (bulgePos*pixelsPerBasepair - pixelsPerBasepair), nascentHeight); 
			ctx.lineTo(rightBaseX - (bulgePos*pixelsPerBasepair - 0.5*pixelsPerBasepair), bulgeHeight); // Top of kink
			ctx.lineTo(rightBaseX - (bulgePos*pixelsPerBasepair), nascentHeight); // Top of kink
		}
		ctx.lineTo(rightStateX, nascentHeight);
		ctx.stroke();



		// Slip left 
		var decayRate = 0;
		var onClickLeft = "slip_left_controller(" + S + ")";
		var arrowX = middleStateX - 5;
		//var decayApplicable = result["mRNAPosInActiveSite"] == 0 && result["activated"];
		plotArrowButton_navigationPanel(ctx, "slipLeftBtn" + S, arrowX, plotHeight / 2, "left", result.leftLabel.label, null, onClickLeft, result.leftLabel.title, spacingBetweenStates, canvas, result["leftLabel"].label != "");



		// Slip right 
		var decayRate = 0;
		var onClickRight = "slip_right_controller(" + S + ")";
		var arrowX = middleStateX + stateWidth + 5;
		//var decayApplicable = result["mRNAPosInActiveSite"] == 0 && result["activated"];
		plotArrowButton_navigationPanel(ctx, "slipRightBtn" + S, arrowX, plotHeight / 2, "right", result.rightLabel.label, null, onClickRight, result.rightLabel.title, spacingBetweenStates, canvas, result["rightLabel"].label != "");





	});



}
