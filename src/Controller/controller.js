
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





// Toggle the navigation panel between hidden and shown
function showABCPanelFn(){

	if($("#showABCPanel").val() == "-"){
		$("#showABCPanel").val("+");
		$("#ABCPanelTableDIV").slideUp(100);
	}
	else{
		$("#showABCPanel").val("-");
		$("#ABCPanelTableDIV").slideDown(100);
	}

}


function showNavigationPanel(){

	if($("#showNavigationPanel").val() == "-"){
		$("#showNavigationPanel").val("+");
		$("#navigationPanelTable").slideUp(100);
	}
	else{
		$("#showNavigationPanel").val("-");
		$("#navigationPanelTable").slideDown(100);
	}

}





function renderTermination(result){

	var primerSeq = result["primerSeq"];
	var insertPositions = result["insertPositions"]; // Has there been an insertion due to slippage?

	//console.log("insertPositions", insertPositions);
	if (terminatedSequences.length < maxNumberTerminatedSequences){

		
		$("#bases").scrollLeft("0px");
		$("#clearSeqs").show()
		$("#downloadSeqs").show();
		$("#mRNAsvg").remove();


		// Initialise the buttons at the top of the sequence panel and the first row of the sequences table (if they have not already been created)
		if (largestTerminatedSequence == null) largestTerminatedSequence = primerSeq.length;
		initSequencesPanel();
		initSequenceTable();
		terminatedSequences.push(primerSeq);

		// Add this sequence to the table
		addTerminatedSequenceToTable(terminatedSequences.length, insertPositions);



	}


	// Update progress bar
	var progressElement = $("#counterProgress");
	if (progressElement != null) progressElement.html(parseFloat(progressElement.html()) + 1);



}





function initSequencesPanel(){



	if ($("#sequencesTableDIV").html() == "") {

		nTimes20SequencesToDisplay = 1;
		numSeqsDisplayed = 0;
		$("#downloadSeqs").show(100);
		if ($("#hideSequences").val() == "-") $("#sequencesTableDIV").height(20 * 21 + 100 + "px");

		if($("#PreExp").val() == "hidden") toggleSequences();

	}


}


// Generate the sequences table inside the sequences panel. Do not do this if the speed is hidden because the table will slow down
// the whole program even if it is invisible
function initSequenceTable(){

	if((simulating && $("#PreExp").val() == "hidden")  || $("#hideSequences").val() == "+" || ($("#sequencesTableDIV").length != 0 && $("#sequencesTableDIV").html() != "")) return;


	// Add a table with site numbers
	var tableHTML = `
			<table id='sequencesTable' style='position:absolute; font-family:\"Courier New\"; font-size:18px; border-spacing: 0; border-collapse: collapse;'></table>
	`;

	$("#sequencesTableDIV").html(tableHTML);


	var firstRow = "<tr id='terminationTableNumbers' style='height:40px'>";
	for (var i = 1; i < largestTerminatedSequence; i ++){
		if (i % 10 == 0) firstRow += "<td style='padding:0; margin:0;'><span style='padding:0 5; display:inline; position:absolute; vertical-align:top'>" + i + "</span></td>";
		else firstRow += "<td style='padding:0; margin:0;'><span style='padding:0 5; display:inline; position:absolute; text-align:center; vertical-align:top'></span></td>";
	}
	firstRow += "</tr>";
	$("#sequencesTable").append(firstRow + "<tr></tr>");


	terminationInsertPositions = [];



}



function addTerminatedSequenceToTable(seqNum, insertPositions){

	if (seqNum > terminatedSequences.length) return;


	var displaySeq = !(simulating && $("#PreExp").val() == "hidden") && $("#sequencesTableDIV").length != 0;
	// Only add the row if it is in the correct range
	if (seqNum >= (20 * (nTimes20SequencesToDisplay-1) + 1) && seqNum <= 20 * nTimes20SequencesToDisplay){
		numSeqsDisplayed++;

		if(displaySeq){

			var colours = {"A" : "#ed1c24", "U" : "#00aeef", "T" : "#1c75bc", "G" : "#00a14b", "C" : "#f7941e", "X" : "#ec008c"}
			var primerSeq = terminatedSequences[seqNum-1];

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


			/*
			// Add insertions to above sequences if necessary (assumes the list of insertion positions is sorted)
			for(var insertionIndex = 0; insertionIndex < insertPositions.length; insertionIndex++){

				var insertionCell = "<td style='padding:0; margin:0;'><span style='padding:1 5; display:inline; text-align:center'>&minus;</span></td>";
				$("#sequencesTable").find("tr").not(':first').each(function(){
					console.log("Adding", insertionCell, "to", insertPositions[insertionIndex]);
		        	//$(this).find("td").eq(insertPositions[insertionIndex]-1).after(insertionCell);

		        	$(this).find("td:nth-child(" + (insertPositions[insertionIndex]-1) + ")").after(insertionCell);

		    	});

			}*/


			// Add insertions to this sequence if necessary
			var newRow = "<tr class='simSequence' id='seq" + seqNum + "'>";
			$("#m0").remove();
			for (var i = 0; i < primerSeq.length; i ++){

				var baseToAdd = primerSeq[i];
				newRow += "<td style='padding:0; margin:0; background-color:" + colours[baseToAdd] + ";'><span style='padding:1 5;  display:inline; text-align:center'>" + baseToAdd + "</span></td>";

				$("#m" + (i+1)).remove();
				//delete_nt_controller(i, "m");
				
			}


			$("#sequencesTable").append(newRow  + "</tr>");
		}

	}


	// Do not display the sequence for now
	else if (seqNum == 20 * nTimes20SequencesToDisplay + 1){
		$("#plus20Sequences").removeClass("dropdown-disabled");
		$("#plus20Sequences").prop("disabled", false);
	}

	var numSeqsDisplayedString = (20 * (nTimes20SequencesToDisplay-1) + 1) + "-" + Math.min(seqNum, (20 * (nTimes20SequencesToDisplay-1) + 20));
	$("#numSeqsDisplayed").html(numSeqsDisplayedString);
	$("#numSeqsSimulated").html(terminatedSequences.length);




}


// Adds all the terminated sequences into the table
function renderTerminatedSequences(){


	initSequencesPanel();
	initSequenceTable();

	for(var i = 0; i < terminatedSequences.length; i ++){
		addTerminatedSequenceToTable(i+1);
	}


}




function plusSequences(){


	if (nTimes20SequencesToDisplay * 20 >= terminatedSequences.length) return;

	// Delete the current 20 sequences
	var startAt = 1 + 20 * (nTimes20SequencesToDisplay-1);
	for (var i = startAt; i <= startAt + 19; i ++){
		$("#seq" + i).remove();
	}

	nTimes20SequencesToDisplay++;
	numSeqsDisplayed = 0;
	var numSeqsDisplayedString = (20 * (nTimes20SequencesToDisplay-1) + 1) + "-" + Math.min(terminatedSequences.length, (20 * (nTimes20SequencesToDisplay-1) + 20));
	$("#numSeqsDisplayed").html(numSeqsDisplayedString);

	// Create the next 20 sequences
	var startAt = 1 + 20 * (nTimes20SequencesToDisplay-1);
	var stopAt = -1;
	for (var i = startAt; i <= startAt + 19; i ++){
		addTerminatedSequenceToTable(i);
	}

	if (nTimes20SequencesToDisplay * 20 >= terminatedSequences.length) $("#plus20Sequences").addClass("dropdown-disabled");
	$("#minus20Sequences").removeClass("dropdown-disabled");
	$("#minus20Sequences").prop("disabled", false);



}


function minusSequences(){


	if (nTimes20SequencesToDisplay == 1) return;


	// Delete the current 20 sequences
	var startAt = 1 + 20 * (nTimes20SequencesToDisplay-1);
	for (var i = startAt; i <= startAt + 19; i ++){
		$("#seq" + i).remove();
	}

	nTimes20SequencesToDisplay--;
	numSeqsDisplayed = 0;
	var numSeqsDisplayedString = (20 * (nTimes20SequencesToDisplay-1) + 1) + "-" + Math.min(terminatedSequences.length, (20 * (nTimes20SequencesToDisplay-1) + 20));
	$("#numSeqsDisplayed").html(numSeqsDisplayedString);

	// Create the previous 20 sequences
	var startAt = 1 + 20 * (nTimes20SequencesToDisplay-1);
	var stopAt = -1;
	for (var i = startAt; i <= startAt + 19; i ++){
		addTerminatedSequenceToTable(i);
	}

	if (nTimes20SequencesToDisplay == 1) $("#minus20Sequences").addClass("dropdown-disabled");
	$("#plus20Sequences").removeClass("dropdown-disabled");
	$("#plus20Sequences").prop("disabled", false);





}


function toggleSequences(){

	// Minimising the table deletes everything
	if($("#hideSequences").val() == "-"){
		$("#hideSequences").val("+");
		$("#sequencesTableDIV").html("");
		$("#sequencesTableDIV").height("0px");
	}

	// Maximising the table adds it all back
	else{
		$("#hideSequences").val("-");
		renderTerminatedSequences();
		$("#sequencesTableDIV").height(20 * 21 + 100 + "px");
	}
	
}



function clearSequences(){

	$("#sequencesTableDIV").hide(300);
	$("#numSeqsDisplayed").html(0);
	$("#numSeqsSimulated").html(0);
	wait(300).then(() => {
		$("#sequencesTableDIV").html("");
		$("#sequencesTableDIV").show(0);
	});
	terminatedSequences = [];
	largestTerminatedSequence = null;
	$("#downloadSeqs").hide(100);
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
function renderHTML_ultrafast(){

	

	//console.log("Rendering", simulating);
	if (!simulating) {
		resumeSimulation_controller();
		return;
	}
	
	renderParameters();
	renderObjects(true);
	drawPlots();
	setNextBaseToAdd_controller();
	resumeSimulation_controller();

}




// This function is called by the WebWorker during hidden simulations
function renderHTML_hidden(){
	
	renderParameters();
	drawPlots();
	if (running_ABC) get_unrendered_ABCoutput_controller(); // Update the ABC output if ABC is running


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
	ctx.fillStyle = obj["src"].split("_").length == 1 ? "#e6e6e6" : "#708090";     
	ctx.fillRect(x, y, width, height);
	




}



function renderObjects(override = false, resolve = function(){}){

	if (!ALLOW_ANIMATIONS) return;

	if (simulating && ANIMATION_TIME_controller == 1 && !override) return; // Do not do this if simulating in fast mode, unless permission is granted


	if (running_ABC) get_unrendered_ABCoutput_controller(); // Update the ABC output if ABC is running


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
	closeNTPModelPopup();


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
		saveXML.writeAttributeString("N", $("#nbasesToSimulate").val());
		saveXML.writeAttributeString('speed', $("#PreExp").val());
		
			// Sequence
			saveXML.writeStartElement('sequence');
			
				saveXML.writeAttributeString('seqID', $("#SelectSequence").val());
				saveXML.writeAttributeString('TemplateType', $("#SelectTemplateType").val());
				saveXML.writeAttributeString('PrimerType', $("#SelectPrimerType").val());
				saveXML.writeAttributeString('seq', result["TEMPLATE_SEQUENCE"]);
			
			saveXML.writeEndElement();
			
			
			
			// Plots
			if (PLOT_DATA["whichPlotInWhichCanvas"] != null) {
				saveXML.writeStartElement('plots');
					saveXML.writeAttributeString("hidden", $("#showPlots").val() == "+");
					for (var i = 1; i <=4; i ++){
						if (PLOT_DATA["whichPlotInWhichCanvas"][i] == null || PLOT_DATA["whichPlotInWhichCanvas"][i].name == "none") continue;
						
						saveXML.writeStartElement("plot" + i);
						for (pltData in PLOT_DATA["whichPlotInWhichCanvas"][i]){
							if (pltData == "xData" || pltData == "yData" || pltData == "zData") continue; // Don't save the data just the settings
							saveXML.writeAttributeString(pltData, PLOT_DATA["whichPlotInWhichCanvas"][i][pltData]);
						}
						saveXML.writeEndElement();
					}
					
				
				saveXML.writeEndElement();
			}

			// Current state
			/*
			saveXML.writeStartElement('state');
				saveXML.writeAttributeString('nascentLen', STATE[0]);
				saveXML.writeAttributeString('activeSitePosition', STATE[1]);
				saveXML.writeAttributeString('NTPbound', STATE[2]);
				saveXML.writeAttributeString('activated', STATE[3]);
			saveXML.writeEndElement();
			*/

		

		// Model settings
		saveXML.writeStartElement('elongation-model');
		saveXML.writeAttributeString('id', ELONGATION_MODEL["id"]);


		// All model properties
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
		saveXML.writeEndElement();

		// ABC settings
		saveXML.writeStartElement('ABC');

			var abcDataObjectForModel = getAbcDataObject($("#ABC_useMCMC").val() == 1 ? "ABC" : $("#ABC_useMCMC").val() == 2 ? "MCMC" : "NS-ABC");
			
			saveXML.writeAttributeString("inferenceMethod", abcDataObjectForModel["inferenceMethod"]);
			saveXML.writeAttributeString("ntrials", abcDataObjectForModel["ntrials"]);
			saveXML.writeAttributeString("testsPerData", abcDataObjectForModel["testsPerData"]);
			if (abcDataObjectForModel["inferenceMethod"] == "MCMC"){
				saveXML.writeAttributeString("RSSthreshold_min", abcDataObjectForModel["RSSthreshold_min"]);
				saveXML.writeAttributeString("RSSthreshold_0", abcDataObjectForModel["RSSthreshold_0"]);
				saveXML.writeAttributeString("RSSthreshold_gamma", abcDataObjectForModel["RSSthreshold_gamma"]);
				saveXML.writeAttributeString("burnin", abcDataObjectForModel["burnin"]);
				saveXML.writeAttributeString("logEvery", abcDataObjectForModel["logEvery"]);
			}

			saveXML.writeAttributeString("showRejectedParameters", $("#ABC_showRejectedParameters").is(":checked").length = 0 ? false : $("#ABC_showRejectedParameters").is(":checked"));


			// Sort the fits so that they are printed in the right order
			var fits = [];
			for (var fitID in abcDataObjectForModel["fits"]) fits.push(fitID);
			fits.sort();

			for (var i = 0; i < fits.length; i ++){

				var fitID = fits[i];
				var dataType = $("#forceVelocityInputData_" + fitID).length > 0 ? "forceVelocity" : $("#ntpVelocityInputData_" + fitID).length > 0 ? "ntpVelocity" : null;

				saveXML.writeStartElement(fitID);


					saveXML.writeAttributeString("dataType", dataType);
					saveXML.writeAttributeString("RSSthreshold", abcDataObjectForModel["fits"][fitID]["RSSthreshold"]);
					saveXML.writeAttributeString("ATPconc", abcDataObjectForModel["fits"][fitID]["ATPconc"]);
					saveXML.writeAttributeString("CTPconc", abcDataObjectForModel["fits"][fitID]["CTPconc"]);
					saveXML.writeAttributeString("GTPconc", abcDataObjectForModel["fits"][fitID]["GTPconc"]);
					saveXML.writeAttributeString("UTPconc", abcDataObjectForModel["fits"][fitID]["UTPconc"]);
					if (dataType == "ntpVelocity") saveXML.writeAttributeString("force", abcDataObjectForModel["fits"][fitID]["force"]);
					for (var obsNum = 0; obsNum < abcDataObjectForModel["fits"][fitID]["vals"].length; obsNum++){
						if (dataType == "forceVelocity"){
							var forceVelocity = abcDataObjectForModel["fits"][fitID]["vals"][obsNum]["force"] + "," + abcDataObjectForModel["fits"][fitID]["vals"][obsNum]["velocity"];
							saveXML.writeAttributeString("obs" + (obsNum+1), forceVelocity);
						}
						else if (dataType == "ntpVelocity"){
							var ntpVelocity = abcDataObjectForModel["fits"][fitID]["vals"][obsNum]["ntp"] + "," + abcDataObjectForModel["fits"][fitID]["vals"][obsNum]["velocity"];
							saveXML.writeAttributeString("obs" + (obsNum+1), ntpVelocity);
						}
					}


				saveXML.writeEndElement();

			}


		saveXML.writeEndElement();
		saveXML.writeEndDocument();
		
		//console.log( saveXML.flush());
		
		
		
		download("SimPol-" + datetime + ".xml", saveXML.flush());
		
	});
	
	
	

	


}




// Loads a session from the XML file stored at url
function loadSessionFromURL(url, resolve = function() { }){
	
	console.log("Trying to open", url);
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
		  
		   if (xhttp == null || xhttp.responseXML == "") return;
		   
		   //console.log("xhttp.responseText", xhttp.responseText);
		   var XMLstring = xhttp.responseText.replace(/(\r\n|\n|\r)/gm,"");
		   loadSession_controller(XMLstring, resolve);
		   
		}
	};
	xhttp.open("GET", url, true);
	xhttp.send();
	
	
}


// Load the session from an xml file
function loadSession(fileLocation = null){
	
	document.getElementById('uploadSessionFile').addEventListener('change', loadSessionFile, false);
	if(fileLocation == null) $("#uploadSessionFile").click();
	 
	 function loadSessionFile(evt) {

		var files = evt.target.files; // FileList object
			
		// Loop through the FileList
		for (var i = 0, f; f = files[i]; i++) {
		
			loadSessionFromFileName(f);

		}

		$("#uploadSessionFile").val("");

	 }


}



function loadSessionFromFileName(fileName){
	
	var reader = new FileReader();
	

	// Closure to capture the file information.
	reader.onload = (function(theFile) {
		return function(e) {

			if (e == null || e.target.result == "") return;
			var XMLstring = e.target.result.replace(/(\r\n|\n|\r)/gm,"");

			//console.log("Sending XMLstring", XMLstring);

			loadSession_controller(XMLstring);

		};
	})(fileName);

	reader.readAsText(fileName);

	
}








function getCacheClearTemplate(){


	return `
		<div id='clearCachePopup' style='background-color:adadad; padding: 10 10; position:fixed; width: 500px; left:35vw; top:50vh; z-index:5'>
			<div style='background-color: ebe9e7; padding: 10 10; text-align:center; font-size:15; font-family:Arial; overflow-y:auto;'>
				<span style='font-size: 22px'> Clear Cache </span>
				<span style='font-size: 30px; cursor:pointer; position:absolute; left:490px; top:5px' onclick='closeKineticCachePopup()'>&times;</span>
				<div style='padding:2; font-size:18px;'> Please select which data you would like to clear </div>
				<table cellpadding=10 style='width:100%; margin:auto;'>
				
					<tr>
						<td style="vertical-align:top; text-align:left; width:100%; font-size:16px"> 
							<label style="cursor:pointer;"> <input class="variable"  type="checkbox" checked="true" style="cursor:pointer;" id="distanceVsTime_cleardata">Distance versus time and velocity data (DVTSIZE values).</input> </label> <br>
							<label style="cursor:pointer;"> <input class="variable"  type="checkbox" checked="true" style="cursor:pointer;" id="timeHistogram_cleardata">Catalysis time data (TIMESIZE values). </input></label> <br>
							<label style="cursor:pointer;"> <input class="variable"  type="checkbox" checked="true" style="cursor:pointer;" id="customPlot_cleardata">Parameter plot data (PARAMSIZE values).</input> </label> <br>
							<label style="cursor:pointer;"> <input class="variable"  type="checkbox" checked="true" style="cursor:pointer;" id="timePerSite_cleardata">Dwell time per site data.</input> </label> <br>

							<br>
							<label style="cursor:pointer;"> <input class="variable"  type="checkbox" checked="true" style="cursor:pointer;" id="sequences_cleardata">Copied sequences (NUMSEQ seqs).</input></label> <br>

							<br>
							<label style="cursor:pointer;"> <input class="variable"  type="checkbox" checked="true" style="cursor:pointer;" id="ABC_cleardata">ABC output data and posterior distribution.</input></label> <br>
							

						</td>

					</tr>


					<tr >

						<td style="vertical-align:top; text-align:center; width:100%"> 
							<input type=button class="operation" onClick=clearCache() value='Delete' title="Deletes the selected data" style="width:100px"></input>
						</td>
					</tr>
					

				</table>
				


			</div>
		</div>
	`;

}





function clearKineticDataCache(){


	closeAllDialogs();
	
	$("#main").css("opacity", 0.5);
	$("#mySidenav").css("opacity", 0.5);
	
	var popupHTML = getCacheClearTemplate();

	getCacheSizes_controller(function(result){



		popupHTML = popupHTML.replace("DVTSIZE", result["DVTsize"]);
		popupHTML = popupHTML.replace("TIMESIZE", result["timeSize"]);
		popupHTML = popupHTML.replace("PARAMSIZE", result["parameterPlotSize"]);
		popupHTML = popupHTML.replace("NUMSEQ", terminatedSequences.length);
		$(popupHTML).appendTo('body');



		window.setTimeout(function(){


			
			$("#main").click(function(){
				closeKineticCachePopup();
			});
			
			$("#mySidenav").click(function(){
				closeKineticCachePopup();
			});
			
		}, 50);


	});


}





function clearCache(){

	if( $("#clearCachePopup").length == 0) return;

	var distanceVsTime_cleardata = $("#distanceVsTime_cleardata").prop('checked');
	var timeHistogram_cleardata = $("#timeHistogram_cleardata").prop('checked');
	var timePerSite_cleardata = $("#timePerSite_cleardata").prop('checked');
	var customPlot_cleardata = $("#customPlot_cleardata").prop('checked');
	var sequences_cleardata = $("#sequences_cleardata").prop('checked');
	var ABC_cleardata = $("#ABC_cleardata").prop('checked');
	if (sequences_cleardata) clearSequences();
	

	if (!distanceVsTime_cleardata && !timeHistogram_cleardata && !timePerSite_cleardata && !customPlot_cleardata && !ABC_cleardata) {
		closeKineticCachePopup();
		return;
	}

	stop_controller(function(){
		
		closeKineticCachePopup();
		refresh(function(){
			

			if (distanceVsTime_cleardata){
				DISTANCE_VS_TIME_CONTROLLER = [];
				VELOCITIES = [];
				haveShownDVTerrorMessage = false;
			} 

			if (timeHistogram_cleardata){
				DWELL_TIMES_CONTROLLER = [];
			}


			if (ABC_cleardata) {
				$("#ABCoutput").html("");
				$("#downloadABC").hide(50);
				$("#uploadABC").show(50);
				$(".ABC_display").hide(50);
				$(".RABC_display").hide(50);
				$(".MCMC_display").hide(50);

			}



			deletePlots_controller(distanceVsTime_cleardata, timeHistogram_cleardata, timePerSite_cleardata, customPlot_cleardata, ABC_cleardata, function(plotData){

				
				update_PLOT_DATA(plotData)


				window.requestAnimationFrame(function(){
					for (var plt in PLOT_DATA["whichPlotInWhichCanvas"]){
						if (PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] != "none" && PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] != "custom"  && PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] != "parameterHeatmap") eval(PLOT_DATA["whichPlotInWhichCanvas"][plt]["plotFunction"])();
						else if (PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] == "custom" || PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] == "parameterHeatmap") eval(PLOT_DATA["whichPlotInWhichCanvas"][plt]["plotFunction"])(plt);
					}
					
					
				});


				if (ABC_cleardata) {
					ABClines = [];
					ABClinesAcceptedOnly = [];
					validateAllAbcDataInputs();
					removeTracePlots();
				}

				
			});

		});
		
	});

}


function closeKineticCachePopup(){

	$("#mySidenav").unbind('click');
	$("#main").unbind('click');
	$("#clearCachePopup").remove();
	$("#main").css("opacity", 1);
	$("#mySidenav").css("opacity", 1);

}