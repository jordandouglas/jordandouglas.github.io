


function refreshNavigationCanvases(){
	drawNTPcanvas();
	drawDeactivationCanvas();

}



function plotArrow_navigationPanel(ctx, fromx, fromy, direction, label = "", rate, spacingBetweenStates, hovering = false, reactionApplicable = true){




	ctx.globalAlpha = 1;
	var headlen = 10;
	var toy, tox;
	var arrowSpace = 5;
	switch(direction) {
	    case "left":
	    	toy = fromy;
	    	tox = fromx - spacingBetweenStates + 3*arrowSpace;
	        break;
   	    case "right":
	    	toy = fromy;
	    	tox = fromx + spacingBetweenStates - 3*arrowSpace;
	        break;
	}


    //variables to be used when creating the arrow
    var angle = Math.atan2(toy-fromy,tox-fromx);

    var arrowSize = 22;

	// Clear the area
	ctx.clearRect(Math.min(tox, fromx), 0, Math.abs(fromx - tox), 100);



    //starting path of the arrow from the start square to the end square and drawing the stroke
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.strokeStyle = !hovering ? "#008cba" : "white";
    ctx.strokeStyle = reactionApplicable ? ctx.strokeStyle : "#708090";
    ctx.lineWidth = arrowSize;
    ctx.stroke();

    //starting a new path from the head of the arrow to one of the sides of the point
    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/7),toy-headlen*Math.sin(angle-Math.PI/7));

    //path from the side point of the arrow, to the other side point
    ctx.lineTo(tox-headlen*Math.cos(angle+Math.PI/7),toy-headlen*Math.sin(angle+Math.PI/7));

    //path from the side point back to the tip of the arrow, and then again to the opposite side point
    ctx.lineTo(tox, toy);
    ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/7),toy-headlen*Math.sin(angle-Math.PI/7));

    //draws the paths created above
    ctx.lineWidth = arrowSize;
    ctx.stroke();
    ctx.fillStyle = !hovering ? "#008cba" : "white";
    ctx.fillStyle = reactionApplicable ? ctx.fillStyle : "#708090";
    ctx.fill();


    // Label
    var xLabPos = fromx + (direction == "left" ? -3 : 3);
	var yLabPos = fromy;
	ctx.textAlign = direction == "left" ? "right" : "left";
	ctx.textBaseline="middle";
	ctx.fillStyle = hovering ? "#008cba" : "white";
	ctx.font = "16px Arial";
	ctx.fillText(label, xLabPos, yLabPos);



	// Rate under label
	ctx.textAlign = direction == "left" ? "right" : "left";
	ctx.textBaseline="middle";
	ctx.fillStyle = "black";
	ctx.font = "16px Arial";

	ctx.fillText(roundToSF(rate, 1) + "s\u207B\u00B9", xLabPos, yLabPos - 1.25*arrowSize);


	return {tox: tox, toy: toy, headlen: headlen};

}




function plotArrowButton_navigationPanel(ctx, fromx, fromy, direction, label = "", rate, onClick = function() { }, navigationHoverEvents, spacingBetweenStates, canvas, reactionApplicable = true){

	
	// Draw the arrow
	var arrowDimensions = plotArrow_navigationPanel(ctx, fromx, fromy, direction, label, rate, spacingBetweenStates, false, reactionApplicable)


    // Mouseover event
	navigationHoverEvents.push(function(e, rect) {


		if (label == "") return;

		var mouseInArrow = true;

        var mouseX = e.clientX - rect.left - 10;
		var mouseY = e.clientY - rect.top - 10;

		// X-axis collision
		if(direction == "left") mouseInArrow = mouseInArrow && arrowDimensions["tox"] - arrowDimensions["headlen"] <= mouseX && fromx >= mouseX; 
		else mouseInArrow = mouseInArrow && fromx  <= mouseX && arrowDimensions["tox"] + arrowDimensions["headlen"] >= mouseX; 


		// Y-axis collision
		mouseInArrow = mouseInArrow && fromy - 20 <= mouseY && fromy >= mouseY; 



		if (reactionApplicable && mouseInArrow){
			canvas.addEventListener('click', onClick, false);
			return true
		}else{
			canvas.removeEventListener('click', onClick);
			return false;
		}



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
	var navigationHoverEvents = [];

	getNTPCanvasData_controller(function(result){


		ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		var stateMargin = 2;
		var stateWidth = 0.2 * (plotWidth - stateMargin);
		var spacingBetweenStates = (plotWidth - 3*stateWidth - 2*stateMargin) / 2;


		var topBaseY = stateMargin + plotHeight * 0.1;
		var bottomBaseY = plotHeight * 0.5;


		var leftStateX = 5;
		var middleStateX = 140;
		var rightStateX = 280;

		// Left hand state (unbound)
		var leftStateHTML = `
			<img src="src/Images/` + result["previousTemplateBase"] 	+ `g.png" style="left:` + leftStateX + 		`px; top:` + topBaseY + 		`px; width: 20px; height: 20px; position: absolute; z-index: 3;">
			<img src="src/Images/` + result["templateBaseBeingCopied"]	+ `g.png" style="left:` + (leftStateX + 25) + `px; top:` + topBaseY + 		`px; width: 20px; height: 20px; position: absolute; z-index: 3;">
			<img src="src/Images/` + result["previousNascentBase"] 		+ `m.png" style="left:` + leftStateX + 		`px; top:` + bottomBaseY + 	`px; width: 20px; height: 20px; position: absolute; z-index: 3;">
		`;


		// Middle state (bound)
		var middleStateHTML = `
			<img src="src/Images/` + result["previousTemplateBase"] 	+ `g.png" style="left:` + middleStateX + 		`px; top:` + topBaseY + 		`px; width: 20px; height: 20px; position: absolute; z-index: 3;">
			<img src="src/Images/` + result["templateBaseBeingCopied"]	+ `g.png" style="left:` + (middleStateX + 25) + `px; top:` + topBaseY + 		`px; width: 20px; height: 20px; position: absolute; z-index: 3;">
			<img src="src/Images/` + result["previousNascentBase"] 		+ `m.png" style="left:` + middleStateX + 		`px; top:` + bottomBaseY + 		`px; width: 20px; height: 20px; position: absolute; z-index: 3;">
			<img src="src/Images/` + result["baseToAdd"] 				+ `m.png" style="left:` + (middleStateX + 30) +	`px; top:` + (bottomBaseY+5 ) + `px; width: 20px; height: 20px; position: absolute; z-index: 3;">
			<img src="src/Images/TP.png"										  style="left:` + (middleStateX + 45) +	`px; top:` + (bottomBaseY+20) + `px; width: 20px; height: 20px; position: absolute; z-index: 3;">
		`;

		// Right state (catalysed)
		var rightStateHTML = `
			<img src="src/Images/` + result["previousTemplateBase"] 	+ `g.png" style="left:` + rightStateX + 		`px; top:` + topBaseY + 	`px; width: 20px; height: 20px; position: absolute; z-index: 3;">
			<img src="src/Images/` + result["templateBaseBeingCopied"]	+ `g.png" style="left:` + (rightStateX + 25) + `px; top:` + topBaseY + 		`px; width: 20px; height: 20px; position: absolute; z-index: 3;">
			<img src="src/Images/` + result["previousNascentBase"] 		+ `m.png" style="left:` + rightStateX + 		`px; top:` + bottomBaseY + 	`px; width: 20px; height: 20px; position: absolute; z-index: 3;">
			<img src="src/Images/` + result["baseToAdd"] 				+ `m.png" style="left:` + (rightStateX + 25) +	`px; top:` + bottomBaseY +  `px; width: 20px; height: 20px; position: absolute; z-index: 3;">
		`;

		$("#ntpCanvasDIV img").remove();
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
			var onClickLeft = function(){
				canvas.removeEventListener('click', onClickLeft);
				result["NTPbound"] && result["mRNAPosInActiveSite"] == 1 ? releaseNTP_controller() : bindNTP_controller();
			};

			var arrowX = result["NTPbound"] ? middleStateX - 10: leftStateX + 50;
			var bindingOrReleasingApplicable = result["mRNAPosInActiveSite"] == 1 && result["activated"];
			if (!bindingOrReleasingApplicable) bindOrReleaseRate = 0;
			plotArrowButton_navigationPanel(ctx, arrowX, plotHeight / 2, result["NTPbound"] ? "left" : "right", result["NTPbound"] ? "Release" : "Bind", bindOrReleaseRate, onClickLeft, navigationHoverEvents, spacingBetweenStates, canvas, bindingOrReleasingApplicable);


			// NTP bound state
			if (result["NTPbound"]){

				var onClickRight = function(){
					canvas.removeEventListener('click', onClickRight);
					bindNTP_controller();
				};

				var arrowX = middleStateX + 55;
				plotArrowButton_navigationPanel(ctx, arrowX, plotHeight / 2, "right", "Catalyse", result["kCat"], onClickRight, navigationHoverEvents, spacingBetweenStates, canvas, true);


			}




		}

		// Catalysed state
		else if (!result["NTPbound"] && result["mRNAPosInActiveSite"] <= 0){

			var decayRate = 0;
			var onClickLeft = function(){
				canvas.removeEventListener('click', onClickLeft);
				releaseNTP_controller();
			};

			var arrowX = rightStateX - 10;
			var decayApplicable = result["mRNAPosInActiveSite"] == 0 && result["activated"];
			plotArrowButton_navigationPanel(ctx, arrowX, plotHeight / 2, "left", "Decay", decayRate, onClickLeft, navigationHoverEvents, spacingBetweenStates, canvas, decayApplicable);


		}
		//plotArrowButton_navigationPanel(ctx, middleStateX + 52, plotHeight / 2, result["NTPbound"] ? "left" : "right", result["NTPbound"] ? "Release NTP" : "Bind NTP", bindOrReleaseRate, onClick, navigationHoverEvents, spacingBetweenStates, canvas);




		// Draw a rectangle around the current state
		/*
		var stateX = !result["NTPbound"] && result["mRNAPosInActiveSite"] ? 4 : result["NTPbound"] ? middleStateX : rightStateX;
		stateX -= stateMargin;
		ctx.beginPath();
		ctx.lineWidth="4";
		ctx.strokeStyle="#008cba";
		ctx.rect(stateX, stateMargin, 52, plotHeight-2*stateMargin);
		ctx.stroke();
		*/
		canvas.onmousemove = function(e) { 

			var rect = this.getBoundingClientRect();
			var mouseHover = false;
			for (var i = 0; i < navigationHoverEvents.length; i++){
				
				if (navigationHoverEvents[i](e, rect)){
					mouseHover = true;
				 	break;
				}

			}


			if (mouseHover){
				$("#ntpCanvas").css('cursor','pointer');
			}

			else{
				//$("#kineticStateSescription").hide(1);
				$("#ntpCanvas").css('cursor','auto');
			}


		};


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
		var state = result["state"];
		var kA = result["kA"];
		var kU = result["kU"];
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		

		//state[3] = !state[3];

		var navigationHoverEvents = [];
		var currentStateMargin = 2;
		var spacingBetweenStates = plotWidth * 0.25 - 2*currentStateMargin;



		// Draw a polymerase on either side
		var polHeightRad = (plotHeight - currentStateMargin) / 2;
		var polWidthRad = (plotWidth * 0.35 - currentStateMargin) / 2;
		var polYCoord = polHeightRad + currentStateMargin/2;
		var activePolXCoord = polWidthRad + currentStateMargin;
		var inactivePolXCoord = plotWidth * 0.65 + polWidthRad;


		//ctx.globalAlpha = state[3] ? 1 : 0.4;
		ctx.fillStyle = "#b3b3b3";
		ctx.beginPath();
		ctx_ellipse(ctx, activePolXCoord, polYCoord, polWidthRad, polHeightRad, 0, 0, 2*Math.PI);
		ctx.fill();

		//ctx.globalAlpha = !state[3] ? 1 : 0.4;
		ctx.beginPath();
		ctx_ellipse(ctx, inactivePolXCoord, polYCoord, polWidthRad, polHeightRad, 0, 0, 2*Math.PI);
		ctx.fill();




		// Rectangle to denote hybrid
		var rectHeight = (plotHeight - currentStateMargin) * 0.4;
		var rectWidth = polWidthRad*1.5;
		var rectYPos = (plotHeight-currentStateMargin) * 0.3 + currentStateMargin/2;
		var activeRectXPos = rectWidth * 1/6 + currentStateMargin;
		var inactiveRectXPos = plotWidth * 0.65 + rectWidth * 1/6;

		//ctx.globalAlpha = state[3] ? 1 : 0.4;
		ctx.fillStyle = "#e6e6e6";
		ctx.fillRect(activeRectXPos, rectYPos, rectWidth, rectHeight);
		/*ctx.beginPath();
		ctx.lineWidth="2";
		ctx.strokeStyle="#536872";
		ctx.rect(activeRectXPos, rectYPos, rectWidth, rectHeight);
		ctx.stroke();*/
		//ctx.globalAlpha = !state[3] ? 1 : 0.4;
		ctx.fillStyle = "#708090";
		ctx.fillRect(inactiveRectXPos, rectYPos, rectWidth, rectHeight);


		ctx.globalAlpha = 1;

		// Draw a rectangle around the current state
		/*
		var stateHeight = plotHeight;
		var stateWidth = plotWidth * 0.35 + currentStateMargin;
		var stateY = 0;
		var stateX = state[3] ? 0 : plotWidth * 0.65 - currentStateMargin; // State[3] is whether the polymerase is active or not
		ctx.beginPath();
		ctx.lineWidth="6";
		ctx.strokeStyle="#008cba";
		ctx.rect(stateX, stateY, stateWidth, stateHeight);
		ctx.stroke();
		*/





		// Arrow from current state to other state
		var fromX = (state[3] ?  plotWidth * 0.35 + currentStateMargin : plotWidth * 0.65 - currentStateMargin);
		var rate = state[3] ? kU : kA;
		var onClick = function(){
			canvas.removeEventListener('click', onClick);
			state[3] ? deactivate_controller() : activate_controller();
		};

		if (state[2]) rate = 0; // Cannot deactivate if NTP bound
		plotArrowButton_navigationPanel(ctx, fromX, plotHeight / 2, state[3] ? "right" : "left", state[3] ? "Deactivate" : "Activate", rate, onClick, navigationHoverEvents, spacingBetweenStates, canvas, !state[2]);



		canvas.onmousemove = function(e) { 

			var rect = this.getBoundingClientRect();
			var mouseHover = false;
			for (var i = 0; i < navigationHoverEvents.length; i++){
				
				if (navigationHoverEvents[i](e, rect)){
					mouseHover = true;
				 	break;
				}

			}


			if (mouseHover){
				$("#deactivationCanvas").css('cursor','pointer');
			}

			else{
				//$("#kineticStateSescription").hide(1);
				$("#deactivationCanvas").css('cursor','auto');
			}


		};


	});



}

