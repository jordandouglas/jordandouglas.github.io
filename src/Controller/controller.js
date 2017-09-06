
/* 
	--------------------------------------------------------------------
	--------------------------------------------------------------------
	This file is part of SNAPdragon.

    SNAPdragon is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    SNAPdragon is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with SNAPdragon.  If not, see <http://www.gnu.org/licenses/>. 
    --------------------------------------------------------------------
    --------------------------------------------------------------------
-*/



slip_left_btn = function(S = 0){
	slip_left(S);
}

slip_right_btn = function(S = 0){
	slip_right(S);
}



function renderTermination(result){

	var primerSeq = result["primerSeq"];
	var insertPositions = result["insertPositions"]; // Has there been an insertion due to slippage?

	//console.log("insertPositions", insertPositions);

	var colours = {"A" : "#ed1c24", "U" : "#00aeef", "T" : "#1c75bc", "G" : "#00a14b", "C" : "#f7941e", "X" : "#ec008c"}
	
	$("#bases").scrollLeft("0px");
	$("#clearSeqs").show()
	$("#downloadSeqs").show();
	$("#mRNAsvg").remove();



	
	if ($("#sequences").html() == "") {

		$("#sequences").show();
		nTimes20SequencesToDisplay = 1;

		var firstLine = "<div  style='font-family:\"Arial\"; font-size:18px;'>";
		numSeqsDisplayed = 0;


		firstLine += " <span style='font-size:22px'>Simulated sequences: &nbsp;&nbsp;&nbsp;</span>"


		firstLine += " <input type=button id='minus20Sequences' class='minimise dropdown-disabled' style='width:40px'  value='&larr;20' onClick=minusSequences() title='See previous 20 sequences'>"
		firstLine += "&nbsp;Displaying <span id='numSeqsDisplayed'>0</span> out of <span id='numSeqsSimulated'>0</span>&nbsp;"
		firstLine += " <input type=button id='plus20Sequences' class='minimise dropdown-disabled' style='width:40px'  value='20&rarr;' onClick=plusSequences() title='See next 20 sequences'>"

		firstLine += "&nbsp;&nbsp;&nbsp;";
		firstLine += `<input type=button class='minimise' id='hideSequences'  value='-' title='Hide/show the sequence window' onClick=toggleSequences()>&nbsp;`;
		firstLine += '<input type="image" style="vertical-align: middle; height:20px;  padding: 5 0" title="Download sequences in .fasta format" id="downloadSeqs" onClick="downloadSequences()" src="src/Images/download.png"> </input>'; 
		firstLine += ' <input type="image" style="vertical-align: middle; width:20px; height:20px;  padding: 5 0" title="Delete all sequences and close sequence window" id="clearSeqs" onClick="clearSequences()" src="src/Images/close.png"></input>'; 

		// Add a table with site numbers
		var tableHTML = "<table id='sequencesTable' style='position:absolute; font-family:\"Courier New\"; font-size:18px; border-spacing: 0; border-collapse: collapse;'></table>";
		$("#sequences").html(firstLine + "</div>" + tableHTML)
		
		var firstRow = "<tr id='terminationTableNumbers' style='height:40px'>";
		for (var i = 1; i < primerSeq.length; i ++){
			if (i % 10 == 0) firstRow += "<td style='padding:0; margin:0;'><span style='padding:0 5; display:inline; position:absolute; vertical-align:top'>" + i + "</span></td>";
			else firstRow += "<td style='padding:0; margin:0;'><span style='padding:0 5; display:inline; position:absolute; text-align:center; vertical-align:top'></span></td>";
		}
		firstRow += "</tr>";
		$("#sequencesTable").append(firstRow + "<tr></tr>");

		$("#sequences").height(20 * 21 + 100 + "px");

		
		if ($("#PreExp").val() == "hidden") toggleSequences();

		largestTerminatedSequence = primerSeq.length;
		terminationInsertPositions = [];
		
	}




	// Check if any more numbers need to be added to the top
	if(primerSeq.length > largestTerminatedSequence){

		var newNumberCells = ""
		for (var i = largestTerminatedSequence; i < primerSeq.length; i ++){
			if (i % 10 == 0) newNumberCells += "<td style='padding:0; margin:0;'><span style='padding:0 5; display:inline; position:absolute; vertical-align:top'>" + i + "</span></td>";
			else newNumberCells += "<td style='padding:0; margin:0;'><span style='padding:0 5; display:inline; position:absolute; text-align:center; vertical-align:top'></span></td>";
		}
		$("#terminationTableNumbers").append(newNumberCells);

		largestTerminatedSequence = primerSeq.length;

	}


	// Add insertions to above sequences if necessary (assumes the list of insertion positions is sorted)
	for(var insertionIndex = 0; insertionIndex < insertPositions.length; insertionIndex++){

		var insertionCell = "<td style='padding:0; margin:0;'><span style='padding:1 5; display:inline; text-align:center'>&minus;</span></td>";
		$("#sequencesTable").find("tr").not(':first').each(function(){
			console.log("Adding", insertionCell, "to", insertPositions[insertionIndex]);
        	//$(this).find("td").eq(insertPositions[insertionIndex]-1).after(insertionCell);

        	$(this).find("td:nth-child(" + (insertPositions[insertionIndex]-1) + ")").after(insertionCell);

    	});

	}


	// Add insertions to this sequence if necessary
	
	
	var newSeq = "";
	var newRow = "<tr class='simSequence' id='seq" + (terminatedSequences.length+1) + "' style='display:none;'>";
	$("#m0").remove();
	for (var i = 0; i < primerSeq.length; i ++){

		var baseToAdd = primerSeq[i];
		newRow += "<td style='padding:0; margin:0; background-color:" + colours[baseToAdd] + ";'><span style='padding:1 5;  display:inline; text-align:center'>" + baseToAdd + "</span></td>";
		newSeq += baseToAdd;

		$("#m" + (i+1)).remove();
		//delete_nt_controller(i, "m");
		
	}
	$("#sequencesTable").append(newRow  + "</tr>");


	// Display the sequence
	terminatedSequences.push(newSeq);
	if (terminatedSequences.length <= 20 * nTimes20SequencesToDisplay) {
		$("#seq" + terminatedSequences.length).show(200);

		numSeqsDisplayed++;
	}


	// Do not display the sequence for now
	else if (terminatedSequences.length == 20 * nTimes20SequencesToDisplay + 1){
		$("#plus20Sequences").removeClass("dropdown-disabled");
		$("#plus20Sequences").prop("disabled", false);
	}

	var numSeqsDisplayedString = (20 * (nTimes20SequencesToDisplay-1) + 1) + "-" + Math.min(terminatedSequences.length, (20 * (nTimes20SequencesToDisplay-1) + 20));
	$("#numSeqsDisplayed").html(numSeqsDisplayedString);
	$("#numSeqsSimulated").html(terminatedSequences.length);


	// Update progress bar
	var progressElement = $("#counterProgress");
	if (progressElement != null) progressElement.html(parseFloat(progressElement.html()) + 1);




	


}




function plusSequences(){


	if (nTimes20SequencesToDisplay * 20 >= terminatedSequences.length) return;

	// Hide the previous 20 sequences
	var startAt = 1 + 20 * (nTimes20SequencesToDisplay-1);
	for (var i = startAt; i <= startAt + 19; i ++){
		$("#seq" + i).hide();
	}

	nTimes20SequencesToDisplay++;
	var numSeqsDisplayedString = (20 * (nTimes20SequencesToDisplay-1) + 1) + "-" + Math.min(terminatedSequences.length, (20 * (nTimes20SequencesToDisplay-1) + 20));
	$("#numSeqsDisplayed").html(numSeqsDisplayedString);

	// Show the next 20 sequences
	var startAt = 1 + 20 * (nTimes20SequencesToDisplay-1);
	var stopAt = -1;
	for (var i = startAt; i <= startAt + 19; i ++){
		if ($("#seq" + i).length == 0){
			stopAt = i-startAt;
			break;
		}
		$("#seq" + i).show();
	}

	if (nTimes20SequencesToDisplay * 20 >= terminatedSequences.length) $("#plus20Sequences").addClass("dropdown-disabled");
	$("#minus20Sequences").removeClass("dropdown-disabled");
	$("#minus20Sequences").prop("disabled", false);



}


function minusSequences(){


	if (nTimes20SequencesToDisplay == 1) return;


	// Hide the previous 20 sequences
	var startAt = 1 + 20 * (nTimes20SequencesToDisplay-1);
	for (var i = startAt; i <= startAt + 19; i ++){
		$("#seq" + i).hide();
	}

	nTimes20SequencesToDisplay--;
	var numSeqsDisplayedString = (20 * (nTimes20SequencesToDisplay-1) + 1) + "-" + Math.min(terminatedSequences.length, (20 * (nTimes20SequencesToDisplay-1) + 20));
	$("#numSeqsDisplayed").html(numSeqsDisplayedString);

	// Show the next 20 sequences
	var startAt = 1 + 20 * (nTimes20SequencesToDisplay-1);
	var stopAt = -1;
	for (var i = startAt; i <= startAt + 19; i ++){
		if ($("#seq" + i).length == 0){
			stopAt = i-startAt;
			break;
		}
		$("#seq" + i).show();
	}

	if (nTimes20SequencesToDisplay == 1) $("#minus20Sequences").addClass("dropdown-disabled");
	$("#plus20Sequences").removeClass("dropdown-disabled");
	$("#plus20Sequences").prop("disabled", false);





}


function toggleSequences(){

	if($("#hideSequences").val() == "-"){
		$("#hideSequences").val("+");
		$("#sequencesTable").hide(300);
		$("#sequences").height(50 + "px");
	}
	else{
		$("#hideSequences").val("-");
		$("#sequencesTable").show(300);
		$("#sequences").height(20 * 21 + 100 + "px");
	}
	
}



function clearSequences(){

	$("#sequences").hide(300);
	wait(300).then(() => {
		$("#sequences").html("");
		$("#sequences").height(0);
	});
	terminatedSequences = [];
}



function downloadSequences(){


	var fasta = "";
	for(var i = 0; i < terminatedSequences.length; i ++){
		fasta += ">Seq" + (i+1) + "\n" + terminatedSequences[i] + "\n";
	}

	download("sequences.fasta", fasta);

}


function download(filename, text) {


	// Open in new window
	if (filename == null || filename == ""){

		var wnd = window.open("data:text/html," + encodeURIComponent(text),  "_blank", "width=800,height=500");
		wnd.document.title = 'testing';
		wnd.focus();

	}

	// Download file
	else{

		var pom = document.createElement('a');
		pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
		pom.setAttribute('download', filename);


		if (document.createEvent) {
			var event = document.createEvent('MouseEvents');
			event.initEvent('click', true, true);
			pom.dispatchEvent(event);
		}
		else {
			pom.click();
		}
	}
}





// This function is called by the WebWorker during ultrafast simulations
function renderHTML(){

	

	//console.log("Rendering", simulating);
	if (!simulating) {
		resumeSimulation_controller();
		return;
	}
	
	renderParameters();
	renderObjects();
	drawPlots();
	setNextBaseToAdd_controller();
	update_sliding_curve(0);
	update_binding_curve(0);
	update_activation_curve(0);

	resumeSimulation_controller();

}


function renderObjectsUntilReceiveMessage(msgID){


	if(MESSAGE_LISTENER[msgID] == null || (simulating && !simulationRenderingController)) return;

	/*
	actionsUntilNextUpdate --;
	if (actionsUntilNextUpdate > 0){
		window.requestAnimationFrame(function(){
			renderObjectsUntilReceiveMessage(msgID);
		});
	 	return;
	}
	actionsUntilNextUpdate = renderGraphicsEveryNsteps;
	
	*/



	if (simulating) drawPlots();

	window.requestAnimationFrame(function(){



		renderObjects(false, function() { renderObjectsUntilReceiveMessage(msgID) });
		renderParameters();
		setNextBaseToAdd_controller();
		update_sliding_curve(0);
		update_binding_curve(0);
		update_activation_curve(0);

	});

}





function delete_TP(pos){



	window.requestAnimationFrame(function() {
		//console.log("Removing", "#phos" + pos);
		$("#phos" + pos).promise().done(function(){
			$("#phos" + pos).remove();
		});
	});

}


// Older versions of firefox (<48) do not have the ellipse function built in
function ctx_ellipse(ctx, x, y, radiusX, radiusY, rotation, startAngle, endAngle, antiClockwise = true) {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(rotation);
	ctx.scale(radiusX, radiusY);
	ctx.arc(0, 0, 1, startAngle, endAngle, antiClockwise);
	ctx.restore();
}

function generatePol(obj){

	
	var canvas = $("<canvas></canvas>");
	canvas.attr("id", obj["id"]);
	canvas.css("left", obj["x"] == parseInt(obj["x"], 10) ? obj["x"] + "px" : obj["x"]); // If there are no units then use pixels
	canvas.css("top",  obj["y"] == parseInt(obj["y"], 10) ? obj["y"] + "px" : obj["y"]);
	canvas.attr("width", obj["width"] == parseInt(obj["width"], 10) ? obj["width"] + "px" : obj["width"]); 
	canvas.attr("height", obj["height"] == parseInt(obj["height"], 10) ? obj["height"] + "px" : obj["height"]);
	canvas.css("position", "absolute");
	canvas.css("z-index", obj["zIndex"]);
	$("#bases").append(canvas);

	canvas = $('#' + obj["id"])[0];
	var ctx = canvas.getContext('2d');


	if (obj["src"] != "square"){

		// Ellipse
		ctx.fillStyle = "#b3b3b3";
		ctx.beginPath();
		
		
		//ctx.ellipse(canvas.width/2, canvas.height/2, canvas.width/2, canvas.height/2, 0, 0, 2 * Math.PI);
		
	
		
		ctx_ellipse(ctx, canvas.width/2, canvas.height/2, canvas.width/2, canvas.height/2, 0, 0, 2*Math.PI);
		
		
		ctx.fill();

	}

	// Double stranded nascent strands look better if the polymerase is square
	else{
		ctx.fillStyle = "#b3b3b3";
		ctx.fillRect(0, canvas.height/6, canvas.width, 4*canvas.height/6);
	}


	// Rectangle to denote hybrid
	var x = 30;
	var y = 130 - obj["y"]  - 3;
	var width = obj["width"] - 75 + 5;
	var height = 51;
	ctx.fillStyle = obj["src"].split("_").length == 1 ? "#e6e6e6" : "black";
	ctx.fillRect(x, y, width, height);
	




}



function renderObjects(override = false, resolve = function(){}){

	if (!ALLOW_ANIMATIONS) return;
	if (simulating && ANIMATION_TIME_controller == 1 && !override) return; // Do not do this if simulating in fast mode, unless permission is granted


	window.requestAnimationFrame(function() {

		//if (renderingObjects) return;
		
		var toCall = () => new Promise((resolve) => get_unrenderedObjects_controller(resolve));
		toCall().then((unrenderedObjects_controller) => {

			//renderingObjects = true;
			while(unrenderedObjects_controller.length > 0){

				var nt = unrenderedObjects_controller.shift();



				if (nt["id"] == "clear") {
					$('#bases').html("");
					//console.log("Clearing");
					continue;
				}



				
				// Remove the object from the page
				if(nt["needsDeleting"]){

					//console.log("Deleting", nt["id"]);

					$("#" + nt["id"]).remove();
					if (nt["hasTP"]) delete_TP(nt["pos"]);
					nt["needsDeleting"] = false;
					continue;

				}
				

				// Add the nucleotide object on to html
				if(nt["needsGenerating"]){


					if ($("#" + nt["id"]).length != 0) continue;


					// Polymerase is generated differently since it is a canvas not an image
					if (nt["id"] == "pol" && nt["src"] != "paraPol") {
						generatePol(nt);

					}else{



						//console.log("Generating", nt["id"]);

						var img = $("<img></img>");
						img.attr("id", nt["id"]);
						img.attr("src", "src/Images/" + nt["src"] + ".png");
						img.css("left", nt["x"] == parseInt(nt["x"], 10) ? nt["x"] + "px" : nt["x"]); // If there are no units then use pixels
						img.css("top",  nt["y"] == parseInt(nt["y"], 10) ? nt["y"] + "px" : nt["y"]);
						img.css("width", nt["width"] == parseInt(nt["width"], 10) ? nt["width"] + "px" : nt["width"]); 
						img.css("height", nt["height"] == parseInt(nt["height"], 10) ? nt["height"] + "px" : nt["height"]);
						img.css("position", "absolute");
						img.css("z-index", nt["zIndex"]);


						$("#bases").append(img);

						if (nt["hasTP"]) add_triphosphate(nt["pos"], nt["x"], nt["y"]);
					}


					// If we just generated it then do not do anything else to it or the effect will be applied 2x
					nt["needsGenerating"] = false;
					nt["needsAnimating"] = false;
					nt["needsSourceUpdate"] = false;
					nt["dx"] = 0;
					nt["dy"] = 0;	
					if (nt["id"] == "pol") moveScrollBar();
					continue;


				}


				// Change the source image
				if (nt["needsSourceUpdate"]){

					// Polymerase is generated differently since it is a canvas not an image
					if (nt["id"] == "pol" && nt["src"] != "paraPol") {
						generatePol(nt);
					}else{
						$("#" + nt["id"]).finish();
						$("#" + nt["id"]).attr("src", "src/Images/" + nt["src"] + ".png");
					}

					nt["needsSourceUpdate"] = false;
				}


				// Change the x and y coordinates of the object and move the triphoshate with it
				if(nt["needsAnimating"]){

					//console.log("Animating", nt["id"]);

					var element = $("#" + nt["id"]);


					var TP_inDOM = nt["seq"] == "m" && $("#phos" + nt["pos"]).length > 0;

					// Add the triphosphate if required
					if (nt["hasTP"] && !TP_inDOM) add_triphosphate(nt["pos"], nt["x"], nt["y"]);


					// Instant update
					if (nt["animationTime"] == 1){
						//console.log("Need to instantly update", nt);
						element.finish();
						element.css("left", nt["x"] + "px");
						element.css("top", nt["y"] + "px");

						if (TP_inDOM){
							$("#phos" + nt["pos"]).finish();
							$("#phos" + nt["pos"]).css("left", nt["x"] + 15 + "px");
							$("#phos" + nt["pos"]).css("top", nt["y"] + 15 + "px");
						}

					}

					// Animation
					else{


						element.finish();

						//console.log("Need to animate", nt);
						element.animate( {left: "+=" + nt["dx"], top: "+=" + nt["dy"]}, nt["animationTime"] );

						if (TP_inDOM){
							$("#phos" + nt["pos"]).animate( {left: "+=" + nt["dx"], top: "+=" + nt["dy"]}, nt["animationTime"] );
						}

					}


					// Remove the triphosphate if required
					if (nt["seq"] == "m" && nt["hasTP"] != null && !nt["hasTP"] && TP_inDOM) delete_TP(nt["pos"]);

					nt["dx"] = 0;
					nt["dy"] = 0;		
					nt["needsAnimating"] = false;
				} 

				if (nt["id"] == "pol") {
					moveScrollBar();




				}

			}

				

			//$("#bases").children().promise().done(function(){
				//renderingObjects = false;
				removeSequenceLoadingHTML();
				
			//});

			resolve();
			
		});



	});



}






















function add_triphosphate(pos, x, y){

	if (!ALLOW_ANIMATIONS) return;
	if (!displayTP) return;


	//console.log("Adding", "#phos" + pos);
	var img = $("<img></img>");
	img.attr("id", "phos" + pos);
	img.attr("src", "src/Images/TP.png");
	img.css("left", x+15 + "px");
	img.css("top", y+15 + "px");
	img.css("width", "20px");
	img.css("height", "20px");
	img.css("position", "absolute");
	img.css("z-index", "1");

	$("#bases").append(img);


}



function closeAllDialogs(){

	closeModelDiagramPopup();
	closePriorDistributionPopup();
	closeNTPModelDiagramPopup();
	closePlotDownloadPopup();
	closePlotSettingsPopup();
	closeKineticCachePopup();


}



function getFormattedDateAndTime(){


	var currentdate = new Date(); 
	var datetime = 
			currentdate.getFullYear() + "/"
			+ (currentdate.getMonth()+1)  + "/" 
			+ currentdate.getDate() + " "
            + currentdate.getHours() + ":"  
            + currentdate.getMinutes() + ":" 
            + currentdate.getSeconds();

	return datetime;     

}



// Save the session to an xml file
// Using classes from XMLWriter.js   https://github.com/flesler/XMLWriter
function saveSession(){
	
	
	var toCall = () => new Promise((resolve) => getSaveSessionData_controller(resolve));
	toCall().then((result) => {

	
		var PHYSICAL_PARAMETERS_LOCAL = result["PHYSICAL_PARAMETERS"];
		var ELONGATION_MODEL = result["ELONGATION_MODEL"];
		var STATE = result["STATE"];

		var saveXML = new XMLWriter();
		saveXML.writeStartDocument();
		
		var currentdate = new Date(); 
		var datetime = 
				currentdate.getFullYear() + "_"
				+ (currentdate.getMonth()+1)  + "_" 
				+ currentdate.getDate() + "-"
                + currentdate.getHours() + "."  
                + currentdate.getMinutes() + "." 
                + currentdate.getSeconds();
		
		saveXML.writeStartElement('session');
		saveXML.writeAttributeString('datetime', datetime);
		
			// Sequence
			saveXML.writeStartElement('sequence');
			
				saveXML.writeAttributeString('seqID', $("#SelectSequence").val());
				saveXML.writeAttributeString('TemplateType', $("#SelectTemplateType").val());
				saveXML.writeAttributeString('PrimerType', $("#SelectPrimerType").val());
				saveXML.writeAttributeString('seq', result["TEMPLATE_SEQUENCE"]);
			
			saveXML.writeEndElement();


			// Current state
			/*
			saveXML.writeStartElement('state');
				saveXML.writeAttributeString('nascentLength', STATE[0]);
				saveXML.writeAttributeString('activeSitePosition', STATE[1]);
				saveXML.writeAttributeString('NTPbound', STATE[2]);
				saveXML.writeAttributeString('activated', STATE[3]);
			saveXML.writeEndElement();
			*/

		

		// Model settings
		saveXML.writeStartElement('elongation-model');
		saveXML.writeAttributeString('id', ELONGATION_MODEL["id"]);
		for (var modelProperty in ELONGATION_MODEL){

			if (modelProperty == "id" || modelProperty == "name") continue;
			saveXML.writeStartElement(modelProperty);
			saveXML.writeAttributeString('val', ELONGATION_MODEL[modelProperty]);
			saveXML.writeEndElement();
			
		}

		saveXML.writeEndElement();
		saveXML.writeEndElement();

		// Parameter values
		saveXML.writeStartElement('parameters');
		for (var paramID in PHYSICAL_PARAMETERS_LOCAL){
			
			if (PHYSICAL_PARAMETERS_LOCAL[paramID]["hidden"]) continue;
			
			saveXML.writeStartElement(paramID);
			saveXML.writeString(PHYSICAL_PARAMETERS_LOCAL[paramID]["name"]);
			//saveXML.writeAttributeString('id', paramID);
			saveXML.writeAttributeString('val', PHYSICAL_PARAMETERS_LOCAL[paramID]["val"]);
			
			if (PHYSICAL_PARAMETERS_LOCAL[paramID]["binary"]) continue;
			
			saveXML.writeAttributeString('distribution', PHYSICAL_PARAMETERS_LOCAL[paramID]["distribution"]);
			
			
			// Distribution parameters
			if (PHYSICAL_PARAMETERS_LOCAL[paramID]["fixedDistnVal"] != null) saveXML.writeAttributeString('fixedDistnVal', PHYSICAL_PARAMETERS_LOCAL[paramID]["fixedDistnVal"]);
			if (PHYSICAL_PARAMETERS_LOCAL[paramID]["uniformDistnLowerVal"] != null) saveXML.writeAttributeString('uniformDistnLowerVal', PHYSICAL_PARAMETERS_LOCAL[paramID]["uniformDistnLowerVal"]);
			if (PHYSICAL_PARAMETERS_LOCAL[paramID]["uniformDistnUpperVal"] != null) saveXML.writeAttributeString('uniformDistnUpperVal', PHYSICAL_PARAMETERS_LOCAL[paramID]["uniformDistnUpperVal"]);
			if (PHYSICAL_PARAMETERS_LOCAL[paramID]["ExponentialDistnVal"] != null) saveXML.writeAttributeString('ExponentialDistnVal', PHYSICAL_PARAMETERS_LOCAL[paramID]["ExponentialDistnVal"]);
			if (PHYSICAL_PARAMETERS_LOCAL[paramID]["normalMeanVal"] != null) saveXML.writeAttributeString('normalMeanVal', PHYSICAL_PARAMETERS_LOCAL[paramID]["normalMeanVal"]);
			if (PHYSICAL_PARAMETERS_LOCAL[paramID]["normalSdVal"] != null) saveXML.writeAttributeString('normalSdVal', PHYSICAL_PARAMETERS_LOCAL[paramID]["normalSdVal"]);
			if (PHYSICAL_PARAMETERS_LOCAL[paramID]["lognormalMeanVal"] != null) saveXML.writeAttributeString('lognormalMeanVal', PHYSICAL_PARAMETERS_LOCAL[paramID]["lognormalMeanVal"]);
			if (PHYSICAL_PARAMETERS_LOCAL[paramID]["lognormalSdVal"] != null) saveXML.writeAttributeString('lognormalSdVal', PHYSICAL_PARAMETERS_LOCAL[paramID]["lognormalSdVal"]);
			if (PHYSICAL_PARAMETERS_LOCAL[paramID]["gammaShapeVal"] != null) saveXML.writeAttributeString('gammaShapeVal', PHYSICAL_PARAMETERS_LOCAL[paramID]["gammaShapeVal"]);
			if (PHYSICAL_PARAMETERS_LOCAL[paramID]["gammaRateVal"] != null) saveXML.writeAttributeString('gammaRateVal', PHYSICAL_PARAMETERS_LOCAL[paramID]["gammaRateVal"]);
			if (PHYSICAL_PARAMETERS_LOCAL[paramID]["poissonRateVal"] != null) saveXML.writeAttributeString('poissonRateVal', PHYSICAL_PARAMETERS_LOCAL[paramID]["poissonRateVal"]);

			
			saveXML.writeEndElement();

			
		}


		saveXML.writeEndElement();
		saveXML.writeEndDocument();
		
		//console.log( saveXML.flush());
		
		
		
		download("SNAPdragon-" + datetime + ".xml", saveXML.flush());
		
	});
	
	
	

	


}




// Load the session from an xml file
function loadSession(){
	
	document.getElementById('uploadSessionFile').addEventListener('change', loadSessionFile, false);
	$("#uploadSessionFile").click();
	
	 function loadSessionFile(evt) {
		 
		 
		var files = evt.target.files; // FileList object
		
			
		// Loop through the FileList
		for (var i = 0, f; f = files[i]; i++) {
		
			var reader = new FileReader();

				// Closure to capture the file information.
				reader.onload = (function(theFile) {
				return function(e) {

					var XMLstring = e.target.result.replace(/(\r\n|\n|\r)/gm,"");

					//console.log("Sending XMLstring", XMLstring);

					loadSession_controller(XMLstring);

				};
			})(f);

			reader.readAsText(f);



		}


		$("#uploadSessionFile").val("");

	 }

	
}







