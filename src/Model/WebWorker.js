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

WW_JS = {};
WW_JS.isWebWorker = false;
if (typeof RUNNING_FROM_COMMAND_LINE === 'undefined') RUNNING_FROM_COMMAND_LINE = false;


	// Random.js from http://simjs.com/random.html


WW_JS.init_WW = function(isWW = false){

	WW_JS.isWebWorker = isWW;


	if (WW_JS.isWebWorker){
		//postMessage("MSG:WebWorker is connected");
		self.importScripts('sequences.js');
		self.importScripts('parameters.js');
		self.importScripts('simulator.js');
		self.importScripts('operators.js');
		self.importScripts('plots.js');
		self.importScripts('freeEnergy.js');
		self.importScripts('ABC.js');
		self.importScripts('MFE.js');
		self.importScripts('stateEncoding.js');
		self.importScripts('XMLparser.js');
		self.importScripts('../Resources/random.js');
		self.importScripts('../Resources/mersenne-twister.js');
		self.importScripts('../Resources/xml_for_script-3.1/jsXMLParser/xmlsax.js');
		MER_JS.init();
	}

	else if (RUNNING_FROM_COMMAND_LINE){



		SEQS_JS = require('./sequences.js');
		PARAMS_JS = require('./parameters.js');
		SIM_JS = require('./simulator.js');
		OPS_JS = require('./operators.js');
		PLOTS_JS = require('./plots.js');
		FE_JS = require('./freeEnergy.js');
		ABC_JS = require('./ABC.js');
		MFE_JS = require('./MFE.js');
		STATE_JS = require('./stateEncoding.js');
		XML_JS = require('./XMLparser.js');
		RAND_JS = require('../Resources/random.js');
		MER_JS = require('../Resources/mersenne-twister.js');
		require('../Resources/xml_for_script-3.1/jsXMLParser/xmlsax.js');


	}
	
	else MER_JS.init();
	
	needToRefreshNTPParameters = true;
	for (sequenceID in SEQS_JS.all_sequences){ break }; // Set the current sequence to the first sequence in the dict
	init_misincorporation_pairs();
	FE_JS.initFreeEnergy_WW();
	PARAMS_JS.initParameters_WW();


	unrenderedObjects = [];
	templateSequence = [];
	primerSequence = [];
	HTMLobjects = [];
	complementSequence = [];
	ANIMATION_TIME = 200;
	misbindMatrix = {};


	ddGpol = -8;
	dftTrough = 0;
	maxHeight = 10000;
	TbulgePos = 0;
	TbulgedBase = -1;
	TbulgeSize = 0;

	
	WW_JS.stopRunning_WW = true;
	simulating = false;
	simulationOnPause = false;
	ANIMATION_TIME_TEMP = 100; // TODO: sync with DOM



	//WW_JS.refresh_WW();





}





 WW_JS.refresh_WW = function(resolve, msgID){

	if (resolve === undefined) resolve = function() {};
	if (msgID === undefined) msgID = null;


	// Which sequence are we using
	if(!ABC_JS.ABC_simulating) PARAMS_JS.sample_parameters_WW(); // Do not sample parameters if in the middle of an ABC experiment
	templateEntryChannelLength = 6;
	templateExitChannelLength = 5;
	specialSite = -1;

	// Initial state
	WW_JS.currentState = { leftGBase: 0, rightGBase: PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"]-1, leftMBase: 0, rightMBase: PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"]-1, NTPtoAdd: "X",
					 mRNAPosInActiveSite: 0, NTPbound: false, nbases: 0, mRNALength: PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"], activated:true, rateOfBindingNextBase:0,
					 bulgePos: [0], bulgedBase: [-1], bulgeSize: [0], partOfBulgeID: [0], nextBaseToCopy: PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"], terminated: false };
	


	//WW_JS.currentState = STATE_JS.convertCompactStateToFullState(STATE_JS.convertFullStateToCompactState(WW_JS.currentState));

	
	WW_JS.add_pairs_WW();
	FE_JS.calculateAllBarrierHeights_WW();


	//if (!simulating) OPS_JS.transcribe_WW(2, true);
	
	// Update the force diagram
	PARAMS_JS.updateForce_WW();

	WW_JS.setNextBaseToAdd_WW();
	OPS_JS.transcribe_WW(2 + Math.max(2, PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+2), true); // Keep moving right until transcription bubble is sealed

	PLOTS_JS.refreshPlotData();

	STATE_JS.initTranslocationRateCache();



	if (msgID != null){
		postMessage(msgID + "~X~" + "done");
	}else{
		resolve(true);
	}



}



 WW_JS.add_pairs_WW = function(msgID){

	if (msgID === undefined) msgID = null;
	
	var bases = SEQS_JS.all_sequences[sequenceID]["seq"].toUpperCase();




	
	startX = 225;
	startY = 3 + 75;
	index = 1;

	HTMLobjects = [];
	unrenderedObjects = [{id: "clear"}];
	templateSequence = [];
	primerSequence = [];
	complementSequence = [];
	
	nucleoproteinPhase = -1;
	if (sequenceID != "$user" && SEQS_JS.all_sequences[sequenceID]["nucleoproteinPhase"] != null){
		nucleoproteinPhase = SEQS_JS.all_sequences[sequenceID]["nucleoproteinPhase"];
		
		for (var i = 0; i < Math.floor(bases.length / 6) + 1; i++) {
			var xPos = startX + 6 * 25 * (i-1) + (6-nucleoproteinPhase+1) * 25;
			var yPos = startY - 18;
			if (i == 0) {
				WW_JS.create_nucleoprotein_WW("NP" + (i+1), xPos, yPos -50);
			}
			else if (PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] + nucleoproteinPhase > i * 6 ) {
				WW_JS.create_nucleoprotein_WW("NP" + (i+1), xPos, yPos -50);
			}
			else if (templateEntryChannelLength + PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 2 + nucleoproteinPhase > i * 6) {
				WW_JS.create_nucleoprotein_WW("NP" + (i+1), xPos, yPos -50);
			}
			else{
				WW_JS.create_nucleoprotein_WW("NP" + (i+1), xPos, yPos);
			}
			
		}
	}
	
	
	
	if (sequenceID == "$user" || nucleoproteinPhase == -1) WW_JS.create_pol_WW(165, 81);
	else WW_JS.create_pol_WW(75, 70, "paraPol");
	
	if (SEQS_JS.all_sequences[sequenceID]["template"].substring(0,2) == "ds")  {
		if (SEQS_JS.all_sequences[sequenceID]["template"] == "dsRNA") WW_JS.create_nucleotide_WW("o0", "o", 0, startX-75, startY - 25 - 26, "5", "5RNA");
		else WW_JS.create_nucleotide_WW("o0", "o", 0, startX-75, startY - 25 - 26, "5", "5DNA");
	}

	if (SEQS_JS.all_sequences[sequenceID]["template"].substring(2,5) == "RNA") WW_JS.create_nucleotide_WW("g0", "g", 0, startX-75, startY + 52, "3", "3RNA");
	else WW_JS.create_nucleotide_WW("g0", "g", 0, startX-75, startY + 52, "3", "3DNA");
	
	if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(2) == "RNA") WW_JS.create_nucleotide_WW("m0", "m", 0, startX-75, startY + 77, "5", "5RNA");
	else WW_JS.create_nucleotide_WW("m0", "m", 0, startX-75, startY + 77, "5", "5DNA");
	
	for (i = 0; i < bases.length; i++) {
		
		var baseToAdd = bases[i];
		if (baseToAdd != "A" && baseToAdd != "C" && baseToAdd != "G" && baseToAdd != "T" && baseToAdd != "U") baseToAdd = "X";
		if ((SEQS_JS.all_sequences[sequenceID]["template"] == "ssRNA" || SEQS_JS.all_sequences[sequenceID]["template"] == "dsRNA") && baseToAdd == "T") baseToAdd = "U";
		if ((SEQS_JS.all_sequences[sequenceID]["template"] == "ssDNA" || SEQS_JS.all_sequences[sequenceID]["template"] == "dsDNA") && baseToAdd == "U") baseToAdd = "T";
		



		
		
		if (index < PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"]){
			
			WW_JS.create_nucleotide_WW("g" + index, "g", index, startX, startY + 52, baseToAdd, baseToAdd + "g");
			oppositeCol = baseToAdd == "G" ? "C" : baseToAdd == "C" ? "G" : baseToAdd == "A" ? "U" : baseToAdd == "U" ? "A" : baseToAdd == "T" ? "A" : "X";

			if ((SEQS_JS.all_sequences[sequenceID]["primer"].substring(2) == "RNA") && oppositeCol == "T") oppositeCol = "U";
			if ((SEQS_JS.all_sequences[sequenceID]["primer"].substring(2) == "DNA") && oppositeCol == "U") oppositeCol = "T";

			WW_JS.create_nucleotide_WW("m" + index, "m", index, startX, startY + 77, oppositeCol, oppositeCol + "m");
			WW_JS.setPrimerSequenceBaseParent(index, index);


			// The strand complementary to the template (if ds)
			if (SEQS_JS.all_sequences[sequenceID]["template"] == "dsRNA"){
				oppositeCol = baseToAdd == "G" ? "C" : baseToAdd == "C" ? "G" : baseToAdd == "A" ? "U" : baseToAdd == "U" ? "A" : "X";
				if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) != "ds") WW_JS.create_nucleotide_WW("o" + index, "o", index, startX, startY - 25 - 26, oppositeCol, oppositeCol + "g");
				else WW_JS.create_nucleotide_WW("o" + index, "o", index, startX, startY - 25 - 26, oppositeCol, oppositeCol + "m");
				
			}
			if (SEQS_JS.all_sequences[sequenceID]["template"] == "dsDNA"){
				oppositeCol = baseToAdd == "G" ? "C" : baseToAdd == "C" ? "G" : baseToAdd == "A" ? "T" : baseToAdd == "T" ? "A" : "X";
				if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) != "ds") WW_JS.create_nucleotide_WW("o" + index, "o", index, startX, startY - 25 - 26, oppositeCol, oppositeCol + "g");
				else WW_JS.create_nucleotide_WW("o" + index, "o", index, startX, startY - 25 - 26, oppositeCol, oppositeCol + "m");
			}


		}else{
			dy = 52 - Math.min(52, (index - (PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"]-1)) * 52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1));
			if (SEQS_JS.all_sequences[sequenceID]["template"].substring(0,2) == "ds") {
				WW_JS.create_nucleotide_WW("g" + index, "g", index, startX, startY + dy, baseToAdd, baseToAdd + "m");
			}
			else {
				WW_JS.create_nucleotide_WW("g" + index, "g", index, startX, startY + dy, baseToAdd, baseToAdd + "g");
			}


			// The strand complementary to the template (if ds)
			if (SEQS_JS.all_sequences[sequenceID]["template"] == "dsRNA"){
				oppositeCol = baseToAdd == "G" ? "C" : baseToAdd == "C" ? "G" : baseToAdd == "A" ? "U" : baseToAdd == "U" ? "A" : "X";
				WW_JS.create_nucleotide_WW("o" + index, "o", index, startX, startY - 25 - dy/2, oppositeCol, oppositeCol + "g");
			}
			if (SEQS_JS.all_sequences[sequenceID]["template"] == "dsDNA"){
				oppositeCol = baseToAdd == "G" ? "C" : baseToAdd == "C" ? "G" : baseToAdd == "A" ? "T" : baseToAdd == "T" ? "A" : "X";
				WW_JS.create_nucleotide_WW("o" + index, "o", index, startX, startY - 25 - dy/2, oppositeCol, oppositeCol + "g");
			}


		}

		startX = startX + 25;
		index = index + 1;
	}
		
	WW_JS.currentState["nbases"] = index;


	
	//window.requestAnimationFrame(function(){
		//callbackFn();
	//});
	if (msgID != null){
		postMessage(msgID + "~X~done");

	}
	

}



 WW_JS.stop_WW = function(resolve, msgID){


	if (resolve === undefined) resolve = function() {};
	if (msgID === undefined) msgID = null;

	simulating = false;
	WW_JS.stopRunning_WW = true;
	ANIMATION_TIME = 200;

	if (msgID != null){
		postMessage(msgID + "~X~" + "done");
	}
	else resolve();



}



function init_misincorporation_pairs(){
	
	
	correctPairs = {};
	correctPairs["AU"] = true;
	correctPairs["AT"] = true;
	correctPairs["TA"] = true;
	correctPairs["UA"] = true;
	correctPairs["GC"] = true;
	correctPairs["CG"] = true;

	transitionPairs = {}
	transitionPairs["AC"] = true;
	transitionPairs["CA"] = true;
	transitionPairs["TG"] = true;
	transitionPairs["UG"] = true;
	transitionPairs["GT"] = true;
	transitionPairs["GU"] = true;
	
	transversionPairs = {};
	transversionPairs["AA"] = true;
	transversionPairs["CC"] = true;
	transversionPairs["GG"] = true;
	transversionPairs["TT"] = true;
	transversionPairs["UU"] = true;
	transversionPairs["AG"] = true;
	transversionPairs["GA"] = true;
	transversionPairs["CT"] = true;
	transversionPairs["CU"] = true;
	transversionPairs["TC"] = true;
	transversionPairs["UC"] = true;
	
}






var i = 0;

function timedCount() {
    i = i + 1;
    postMessage(i);
    setTimeout("timedCount()",500);
}

//timedCount();




 WW_JS.rexp = function(rate){
	
	var unif01 = MER_JS.random();
	var exp = -Math.log(unif01) / rate;
	return exp;
	
}


function tagAllObjectsForGeneration(){

	for (var id in HTMLobjects){
		var obj = HTMLobjects[id];
		if (obj == null || obj["needsGenerating"]) continue;
		obj["needsGenerating"] = true;
		if (obj["needsAnimating"] || obj["needsSourceUpdate"] || obj["needsDeleting"]) continue;
		unrenderedObjects.push(obj);
	}

	for (var id in primerSequence){
		var obj = primerSequence[id];
			if (obj == null || obj["needsGenerating"]) continue;
		obj["needsGenerating"] = true;
		if (obj["needsAnimating"] || obj["needsSourceUpdate"] || obj["needsDeleting"]) continue;
		unrenderedObjects.push(obj);
	}

	for (var id in templateSequence){
		var obj = templateSequence[id];
		if (obj == null || obj["needsGenerating"]) continue;
		obj["needsGenerating"] = true;
		if (obj["needsAnimating"] || obj["needsSourceUpdate"] || obj["needsDeleting"]) continue;
		unrenderedObjects.push(obj);
	}

	for (var id in complementSequence){
		var obj = complementSequence[id];
		if (obj == null || obj["needsGenerating"]) continue;
		obj["needsGenerating"] = true;
		if (obj["needsAnimating"] || obj["needsSourceUpdate"] || obj["needsDeleting"]) continue;
		unrenderedObjects.push(obj);
	}


}



 WW_JS.create_HTMLobject_WW = function(id, x, y, width, height, src, zIndex){


	if (zIndex === undefined) zIndex = 1;

	var obj = {id:id, x:x, y:y, width:width, height:height, src: src, needsGenerating:true, needsAnimating:false, needsSourceUpdate:false, needsDeleting:false, dx: 0, dy: 0, animationTime:ANIMATION_TIME, zIndex: zIndex};
	HTMLobjects[id] = obj;
	unrenderedObjects.push(obj);

}

 WW_JS.create_pol_WW = function(x, y, src){


	if (src === undefined) src = "pol";


	var width, height; 
	if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) == "ds"){
		src = "square";
	}

	if (src == "paraPol") {
		width = 448;
		height = 160;
	}
	else {
		width = (PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] * 25 + 75);
		height = 140;
	}

	WW_JS.create_HTMLobject_WW("pol", x, y, width, height, src);

}



 WW_JS.change_src_of_object_WW = function(obj, newSrc){

	obj["src"] = newSrc;
	if (!obj["needsGenerating"] && !obj["needsAnimating"] && !obj["needsSourceUpdate"] && !obj["needsDeleting"]) unrenderedObjects.push(obj);
	obj["needsSourceUpdate"] = true;

}




// Change the src on a nucleotide to represent the object flipping
 WW_JS.flip_base_WW = function(pos, seq, flipTo){


	var nt = null;

	if (seq == "m") nt = primerSequence[pos];
	else if (seq == "g") nt = templateSequence[pos];
	else if (seq == "o") nt = complementSequence[pos];
	if (nt == null) return;

	var newSrc = nt["base"] + flipTo;
	WW_JS.change_src_of_object_WW(nt, newSrc);


}



 WW_JS.create_nucleoprotein_WW = function(id, x, y){
	WW_JS.create_HTMLobject_WW(id, x, y, 6 * 25, 55, "nucleoprotein");
}




 WW_JS.move_obj_absolute = function(id, newX, newY, animationTime) {


	if (animationTime === undefined) animationTime = ANIMATION_TIME;

	var obj = HTMLobjects[id];
	if (obj == null) return;
	var dx = newX - obj["x"];
	var dy = newY - obj["y"];
	WW_JS.move_obj_WW(obj, dx, dy, animationTime)

}



 WW_JS.move_nt_absolute_WW = function(pos, seq, newX, newY, animationTime) {


	if (animationTime === undefined) animationTime = ANIMATION_TIME;

	var nt = null;

	if (seq == "m") nt = primerSequence[pos];
	else if (seq == "g") nt = templateSequence[pos];
	else if (seq == "o") nt = complementSequence[pos];
	if (nt == null) return;

	var dx = newX - nt["x"];
	var dy = newY - nt["y"];

	WW_JS.move_obj_WW(nt, dx, dy, animationTime)


}



 WW_JS.position_bulge_WW = function(startBaseNum, startBaseXVal, bulgeSize, inPrimer, skip){

	if (inPrimer === undefined) inPrimer = true;
	if (skip === undefined) skip = 0;
	
	
	var thisStrandSymbol = inPrimer ? "m" : "g";
	var otherStrandSymbol = inPrimer ? "g" : "m";
	var thisSequenceObject = inPrimer ? primerSequence : templateSequence;
	var yHeight = 155;
	
	

	
	// Flip the bases so that the bulged bases are facing outwards and the pairing bases are facing inwards
	if(skip == 0) WW_JS.flip_base_WW((startBaseNum), thisStrandSymbol, thisStrandSymbol);
	if(skip == 0) WW_JS.flip_base_WW((startBaseNum+bulgeSize+1), thisStrandSymbol, thisStrandSymbol);
	for (var bPos = startBaseNum + 1; bPos <= startBaseNum + bulgeSize; bPos ++){
		WW_JS.flip_base_WW(bPos, thisStrandSymbol, otherStrandSymbol);
	}
	
	
	if(skip == 0) WW_JS.move_nt_absolute_WW(startBaseNum, thisStrandSymbol, startBaseXVal, yHeight);
	else WW_JS.move_nt_absolute_WW(startBaseNum, thisStrandSymbol, startBaseXVal, thisSequenceObject[startBaseNum]["y"]); // Move it to its correct x coordinate but leave at its y one
	
	if(skip == 0) WW_JS.move_nt_absolute_WW(startBaseNum+bulgeSize+1, thisStrandSymbol, startBaseXVal+25, yHeight);
	else WW_JS.move_nt_absolute_WW(startBaseNum+bulgeSize+1, thisStrandSymbol, startBaseXVal+25, thisSequenceObject[startBaseNum+bulgeSize+1]["y"]); // Move it to its correct x coordinate but leave at its y one
	

	// Bulge size 1
	if (bulgeSize == 1){
		WW_JS.move_nt_absolute_WW(startBaseNum+1, thisStrandSymbol, startBaseXVal+13, yHeight + 25);
	}
	
	
	// Bulge size 2
	else if (bulgeSize == 2){
		WW_JS.move_nt_absolute_WW(startBaseNum+1, thisStrandSymbol, startBaseXVal+3, yHeight + 25);
		WW_JS.move_nt_absolute_WW(startBaseNum+2, thisStrandSymbol, startBaseXVal+22, yHeight + 25);
	}
	
	
	// Bulge size 3
	else if (bulgeSize == 3){
		WW_JS.move_nt_absolute_WW(startBaseNum+1, thisStrandSymbol, startBaseXVal+2, yHeight + 25);
		WW_JS.move_nt_absolute_WW(startBaseNum+2, thisStrandSymbol, startBaseXVal+12, yHeight + 50);
		WW_JS.move_nt_absolute_WW(startBaseNum+3, thisStrandSymbol, startBaseXVal+23, yHeight + 25);
	}
	
	
	// Bulge size 4
	else if (bulgeSize == 4){
		WW_JS.move_nt_absolute_WW(startBaseNum+1, thisStrandSymbol, startBaseXVal-5, yHeight + 25);
		WW_JS.move_nt_absolute_WW(startBaseNum+2, thisStrandSymbol, startBaseXVal+2, yHeight + 50);
		WW_JS.move_nt_absolute_WW(startBaseNum+3, thisStrandSymbol, startBaseXVal+23, yHeight + 50);
		WW_JS.move_nt_absolute_WW(startBaseNum+4, thisStrandSymbol, startBaseXVal+30, yHeight + 25);
	}
	
	
	// Bulge size 5
	else if (bulgeSize == 5){
		WW_JS.move_nt_absolute_WW(startBaseNum+1, thisStrandSymbol, startBaseXVal-7, yHeight + 25);
		WW_JS.move_nt_absolute_WW(startBaseNum+2, thisStrandSymbol, startBaseXVal, yHeight + 48);
		WW_JS.move_nt_absolute_WW(startBaseNum+3, thisStrandSymbol, startBaseXVal+12, yHeight + 68);
		WW_JS.move_nt_absolute_WW(startBaseNum+4, thisStrandSymbol, startBaseXVal+25, yHeight + 48);
		WW_JS.move_nt_absolute_WW(startBaseNum+5, thisStrandSymbol, startBaseXVal+32, yHeight + 25);
	}
	
	
	// Bulge size 6
	else if (bulgeSize == 6){
		WW_JS.move_nt_absolute_WW(startBaseNum+1, thisStrandSymbol, startBaseXVal, yHeight + 25);
		WW_JS.move_nt_absolute_WW(startBaseNum+2, thisStrandSymbol, startBaseXVal-7, yHeight + 48);
		WW_JS.move_nt_absolute_WW(startBaseNum+3, thisStrandSymbol, startBaseXVal, yHeight + 68);
		WW_JS.move_nt_absolute_WW(startBaseNum+4, thisStrandSymbol, startBaseXVal+25, yHeight + 68);
		WW_JS.move_nt_absolute_WW(startBaseNum+5, thisStrandSymbol, startBaseXVal+32, yHeight + 48);
		WW_JS.move_nt_absolute_WW(startBaseNum+6, thisStrandSymbol, startBaseXVal+25, yHeight + 25);
	}
	
	
	else if (bulgeSize > 6){
		
		WW_JS.move_nt_absolute_WW(startBaseNum+1, thisStrandSymbol, startBaseXVal, yHeight + 25);
		WW_JS.move_nt_absolute_WW(startBaseNum+bulgeSize, thisStrandSymbol, startBaseXVal+25, yHeight + 25);
		
		for (var i = 1; i < Math.floor((bulgeSize - 1) / 2); i ++){
			WW_JS.move_nt_absolute_WW(startBaseNum+1+i, thisStrandSymbol, startBaseXVal-7, yHeight + 25 + (20*i));
			WW_JS.move_nt_absolute_WW(startBaseNum+bulgeSize-i, thisStrandSymbol, startBaseXVal+32, yHeight + 25 + (20*i));
		}
		
		// Even size
		if (bulgeSize % 2 == 0){
			
			var tipOfBulge = Math.floor((bulgeSize - 1) / 2) + 1;
			WW_JS.move_nt_absolute_WW(startBaseNum+tipOfBulge, thisStrandSymbol, startBaseXVal, yHeight + tipOfBulge*20);
			WW_JS.move_nt_absolute_WW(startBaseNum+tipOfBulge+1, thisStrandSymbol, startBaseXVal+25, yHeight + tipOfBulge*20);
			
			
		}else{ // Odd size
			
			var tipOfBulge = Math.floor((bulgeSize - 1) / 2) + 1;
			WW_JS.move_nt_absolute_WW(startBaseNum+tipOfBulge, thisStrandSymbol, startBaseXVal + 12, yHeight + tipOfBulge*20);
			
		}

		
	}
		
	
}


// Declare which template base the primer base was copied from
 WW_JS.setPrimerSequenceBaseParent = function(nascentBaseID, templateBaseID){

	var nt = primerSequence[nascentBaseID];
	if (nt == null) return;

	nt["copiedFrom"] = templateBaseID;

}


 WW_JS.create_nucleotide_WW = function(id, seq, pos, x, y, base, src, hasTP){

	if (hasTP === undefined) hasTP = false;

	var labelBase = base == "3" || base == "5";
	var width = (labelBase ? 70 : 20);
	var height = 20;
	var nt = {id:id, seq:seq, pos:pos, x:x, y:y, width:width, height:height, base:base, src:src, hasTP:hasTP, needsGenerating:true, needsAnimating:false, needsDeleting:false, needsSourceUpdate: false, dx: 0, dy: 0, animationTime:ANIMATION_TIME, zIndex:3};

	if (seq == "m") primerSequence[pos] = nt;
	else if (seq == "g") templateSequence[pos] = nt;
	else if (seq == "o") complementSequence[pos] = nt;


	unrenderedObjects.push(nt);


}

 WW_JS.delete_HTMLobj_WW = function(id){

	var obj = HTMLobjects[id];
	if (obj == null) return;
	if (!obj["needsGenerating"] && !obj["needsAnimating"] && !obj["needsSourceUpdate"] && !obj["needsDeleting"]) unrenderedObjects.push(obj);
	obj["needsDeleting"] = true;

}


// Remove the nucleotide from the sequence list, and tag it for destruction
 delete_nt_WW = function(pos, seq){

	var nt = null;
	if (seq == "m"){
		nt = primerSequence[pos];
		primerSequence[pos] = null;
	}
	else if (seq == "g"){
		nt = templateSequence[pos];
		templateSequence[pos] = null;
	}
	else if (seq == "o"){
		nt = complementSequence[pos];
		complementSequence[pos] = null;
	}
	if (nt == null) return;


	if (!nt["needsGenerating"] && !nt["needsAnimating"] && !nt["needsSourceUpdate"] && !nt["needsDeleting"]) unrenderedObjects.push(nt);
	nt["needsDeleting"] = true;


}


// Move the HTML object by updating its coordinates and adding to the list of unrendered objects
 WW_JS.move_obj_WW = function(obj, dx, dy, animationTime){


	if (animationTime === undefined) animationTime = ANIMATION_TIME;

	obj["dx"] += dx;
	obj["dy"] += dy;
	obj["x"] += dx;
	obj["y"] += dy;
	obj["animationTime"] = animationTime;

	// Add this object to the unrendered list if it is not already
	if (!obj["needsGenerating"] && !obj["needsAnimating"]  && !obj["needsSourceUpdate"] && !obj["needsDeleting"]) {
		//if (obj["id"] == "pol") unrenderedObjects.unshift(obj);
		//else 
		unrenderedObjects.push(obj);
	}
	obj["needsAnimating"] = true;

}


// Move the object with the specified id
 WW_JS.move_obj_from_id_WW = function(id, dx, dy, animationTime){

	if (animationTime === undefined) animationTime = ANIMATION_TIME;
	var obj = HTMLobjects[id];
	if (obj == null) return;
	WW_JS.move_obj_WW(obj, dx, dy, animationTime)


}

// Move the nucleotide with the specified position in the specified sequence
 WW_JS.move_nt_WW = function(pos, seq, dx, dy, animationTime) {

	if (animationTime === undefined) animationTime = ANIMATION_TIME;
	var nt = null;

	if (seq == "m") nt = primerSequence[pos];
	else if (seq == "g") nt = templateSequence[pos];
	else if (seq == "o") nt = complementSequence[pos];
	if (nt == null) return;


	//console.log("Moving", nt, dx, dy);

	WW_JS.move_obj_WW(nt, dx, dy, animationTime)

}


// If on webworker will send back the list and then clear it.
// if not webworker will send the list back but will not clear it 
 WW_JS.get_unrenderedObjects_WW = function(msgID){

	if (msgID === undefined) msgID = null;

	if (msgID != null){
		//postMessage("MSG:Calling WW_JS.get_unrenderedObjects_WW, returning " + JSON.stringify(unrenderedObjects));

		// Send the list of objects
		postMessage(msgID + "~X~" + JSON.stringify(unrenderedObjects));

		// Remove the render-requirement flags and clear the list of unrendered objects
		while(unrenderedObjects.length > 0){
			var nt = unrenderedObjects.shift();
			if(nt["needsDeleting"]){
				nt["hasTP"] = false
				nt["needsDeleting"] = false;
			}
			nt["needsGenerating"] = false;
			if(nt["needsAnimating"]){
				nt["dx"] = 0;
				nt["dy"] = 0;
				nt["needsAnimating"] = false;		
			} 
			nt["needsSourceUpdate"] = false;
		}
		return;

	}

	// Not WebWorker -> just return the list
	return unrenderedObjects;
}


 WW_JS.get_primerSequence_WW = function(msgID){

	if (msgID === undefined) msgID = null;

	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(primerSequence));
		return;
	}
	return primerSequence;
}



function getComplementSequence_WW(seq, toRNA){

	var complementSeq = "";
	for (var i = 0; i < seq.length; i ++){
		var base = seq[i].toUpperCase();
		var TorU = toRNA ? "U" : "T";
		complementSeq += (base == "G" ? "C" : base == "C" ? "G" : base == "T" ? "A" : base == "U" ? "A" : base == "A" ? TorU : "X");

	}

	return complementSeq;

}


// User inputs their own sequence in the textbox
// Parse newTemplateType \in {"dsDNA", "dsRNA", "ssDNA", "ssRNA"} and primerType \in {"DNA", "RNA"}
 WW_JS.userInputSequence_WW = function(newSeq, newTemplateType, newPrimerType, inputSequenceIsNascent){


	if (msgID === undefined) msgID = null;

	// Store the template sequence not the nascent sequence 
	newSeq = newSeq.trim();
	var goodLength = newSeq.length > PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"];

	if (inputSequenceIsNascent) newSeq = getComplementSequence_WW(newSeq, newPrimerType.substring(2) == "RNA");

	// Only apply changes if there is one
	if (goodLength && sequenceID != newSeq.substring(0, 15) || newSeq != SEQS_JS.all_sequences[sequenceID]["seq"] || newTemplateType != SEQS_JS.all_sequences[sequenceID]["template"] || newPrimerType != SEQS_JS.all_sequences[sequenceID]["primer"]){

	
		if (newPrimerType.substring(2) != SEQS_JS.all_sequences[sequenceID]["primer"].substring(2)) needToRefreshNTPParameters = true;  // Refresh the NTP concentrations if nascent strand changed from DNA to RNA or vice versa

		sequenceID = newSeq.substring(0, 15);
		SEQS_JS.all_sequences[sequenceID] = {};
		SEQS_JS.all_sequences[sequenceID]["seq"] = newSeq;
		SEQS_JS.all_sequences[sequenceID]["template"] = newTemplateType;
		SEQS_JS.all_sequences[sequenceID]["primer"] = newPrimerType;

		// Reset secondary structure calculations
		MFE_JS.MFE_W = {};
		MFE_JS.MFE_V = {};
		
		
		STATE_JS.translocationCacheNeedsUpdating = true;

		PARAMS_JS.setStructuralParameters_WW();

	}
		

	if (msgID != null){
		postMessage(msgID + "~X~" + goodLength);
	}else{
		return goodLength;
	}

}


// User selects sequence from the list of sequences. 
// Parse newTemplateType \in {"dsDNA", "dsRNA", "ssDNA", "ssRNA"} and newPrimerType \in {"RNA", "DNA"}
 WW_JS.userSelectSequence_WW = function(newSequenceID, newTemplateType, newPrimerType, msgID){


	if (msgID === undefined) msgID = null;

	// Only apply change if there is one
	if (newSequenceID != sequenceID ||newTemplateType != SEQS_JS.all_sequences[sequenceID]["template"] || newPrimerType != SEQS_JS.all_sequences[sequenceID]["primer"]){
	
		console.log(newPrimerType == null, newPrimerType, SEQS_JS.all_sequences[sequenceID]["primer"]);
		if (newPrimerType == null && SEQS_JS.all_sequences[newSequenceID]["primer"].substring(2) != SEQS_JS.all_sequences[sequenceID]["primer"].substring(2)) needToRefreshNTPParameters = true; // Refresh the NTP concentrations if nascent strand changed from DNA to RNA or vice versa
		else if (newPrimerType != null && newPrimerType != SEQS_JS.all_sequences[sequenceID]["primer"].substring(2)) needToRefreshNTPParameters = true;
	
		sequenceID = newSequenceID;
		if (newTemplateType != null) SEQS_JS.all_sequences[sequenceID]["template"] = newTemplateType;
		if (newPrimerType != null) SEQS_JS.all_sequences[sequenceID]["primer"] = newPrimerType;

		
		// Reset secondary structure calculations
		MFE_JS.MFE_W = {};
		MFE_JS.MFE_V = {};
		
		
		STATE_JS.translocationCacheNeedsUpdating = true;
		
		PARAMS_JS.setStructuralParameters_WW();

	}


	if (msgID != null){
		postMessage(msgID + "~X~" + "done");
	}else{
		return null;
	}
}



 WW_JS.getBaseInSequenceAtPosition_WW = function(baseID){
	
	var seq = baseID[0];
	var pos = parseFloat(baseID.substring(1));
	if (seq == "g") return templateSequence[pos]["base"];
	if (seq == "m") return primerSequence[pos]["base"];
	if (seq == "o") return complementSequence[pos]["base"];

	return null;

}


 WW_JS.getMisbindMatrix_WW = function(resolve, msgID){


	if (resolve === undefined) resolve = function() {};
	if (msgID === undefined) msgID = null;

	if (msgID != null){
		postMessage( msgID + "~X~" + JSON.stringify(misbindMatrix) );
	}else{
		resolve(misbindMatrix);
	}


}



 WW_JS.sampleBaseToAdd = function(baseToTranscribe){



	// Calculate the 4 nucleotide binding rates
	var bindingRates = [0,0,0,0];
	var bindingRateSum = 0;

	var TorU = SEQS_JS.all_sequences[sequenceID]["primer"].substring(2) == "DNA" ? "T" : "U";
	var bases = ["A", "C", "G", TorU];



	for (var i = 0; i < bindingRates.length; i ++){
		bindingRates[i] = misbindMatrix[baseToTranscribe][bases[i]];
		bindingRateSum += bindingRates[i];
	}

	
	// Generate a random number to select which base to bind
	var randNum = MER_JS.random() * bindingRateSum;
	var accumulativeSum = 0;
	var baseToBind = 0;
	for (baseToBind = 0; baseToBind < bindingRates.length; baseToBind ++){
		accumulativeSum += bindingRates[baseToBind];
		if (randNum < accumulativeSum) break;
	}


	return {base: bases[baseToBind], rate: bindingRates[baseToBind]};


}



 WW_JS.setNextBaseToAdd_WW = function(resolve, msgID){


	if (resolve === undefined) resolve = function() {};
	if (msgID === undefined) msgID = null;

	var NTPtoAddTemp;
	var toTranscribe = WW_JS.currentState["nextBaseToCopy"];
	if (templateSequence[toTranscribe] == null) return;
	var baseToTranscribe = WW_JS.getBaseInSequenceAtPosition_WW("g" + toTranscribe);


	// Sample a base and its rate
	var result = WW_JS.sampleBaseToAdd(baseToTranscribe);


	// Update the gui and state variables so that this base is bound next
	NTPtoAddTemp = result["base"];
	WW_JS.currentState["rateOfBindingNextBase"] = result["rate"];
	if (NTPtoAddTemp == "T" && SEQS_JS.all_sequences[sequenceID]["primer"] == "RNA") NTPtoAddTemp = "U";


	WW_JS.currentState["NTPtoAdd"] = NTPtoAddTemp;
	var result = {NTPtoAdd: NTPtoAddTemp};
	if (msgID != null){
		postMessage( msgID + "~X~" + JSON.stringify(result) );
	}else{
		resolve(result);
	}

	return result;


}

 WW_JS.userSetNextBaseToAdd_WW = function(ntpType, resolve, msgID){

	if (resolve === undefined) resolve = function() {};
	if (msgID === undefined) msgID = null;

	if (ntpType == "T" && SEQS_JS.all_sequences[sequenceID]["primer"].substring(2) == "RNA") ntpType = "U";
	else if (ntpType == "U" && SEQS_JS.all_sequences[sequenceID]["primer"] == "DNA") ntpType = "T";

	WW_JS.currentState["NTPtoAdd"] = ntpType;
	var baseToTranscribe = templateSequence[WW_JS.currentState["nextBaseToCopy"]]["base"];
	WW_JS.currentState["rateOfBindingNextBase"] = misbindMatrix[baseToTranscribe][ntpType];


	if (msgID != null){
		postMessage(msgID + "~X~done");
	}else{
		resolve();
	}
}


 WW_JS.initMisbindingMatrix = function(){


	
	misbindMatrix = {};
	var TorU = SEQS_JS.all_sequences[sequenceID]["template"].substring(2) == "DNA" ? "T" : "U";
	var fromBases = ["A", "C", "G", TorU];
	TorU = SEQS_JS.all_sequences[sequenceID]["primer"].substring(2) == "DNA" ? "T" : "U";
	var toBases = ["A", "C", "G", TorU];

	for (var i = 0; i < 4; i ++){
		var from = fromBases[i];
		misbindMatrix[from] = {};
		for (var j = 0; j < 4; j ++){
			var to = toBases[j];
			misbindMatrix[from][to] = getRateOfBindingXtoY_WW(from, to);
		}
	}






}


function getRateOfBindingXtoY_WW(baseX, baseY){



	var NTPconcID = baseY == "A" ? "ATPconc" : baseY == "T" ? "UTPconc" : baseY == "U" ? "UTPconc" : baseY == "C" ? "CTPconc" : "GTPconc";
	
	var NTPconc = FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["useFourNTPconcentrations"] ? PARAMS_JS.PHYSICAL_PARAMETERS[NTPconcID]["val"] : PARAMS_JS.PHYSICAL_PARAMETERS["NTPconc"]["val"];
	var rateOfBindingNextBaseTemp = 0;


	// If misincorporations are not allowed then return 0
	if (!FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowMisincorporation"] && correctPairs["" + baseX + baseY] == null) return 0;




	var probTransversion = 1 / (2 + PARAMS_JS.PHYSICAL_PARAMETERS["TransitionTransversionRatio"]["val"]);

	// Normal basepairing
	if (correctPairs["" + baseX + baseY] != null) rateOfBindingNextBaseTemp = PARAMS_JS.PHYSICAL_PARAMETERS["RateBind"]["val"] * NTPconc;

	// A mis-binding event which may lead to a transition mutation
	else if (transitionPairs["" + baseX + baseY] != null) rateOfBindingNextBaseTemp = (1 - 2*probTransversion) * NTPconc * PARAMS_JS.PHYSICAL_PARAMETERS["RateMisbind"]["val"];

	// A mis-binding event which may lead to a transversion mutation
	else rateOfBindingNextBaseTemp = probTransversion * NTPconc * PARAMS_JS.PHYSICAL_PARAMETERS["RateMisbind"]["val"];


	return rateOfBindingNextBaseTemp;
	
}



 WW_JS.roundToSF_WW = function(val, sf, ceilOrFloor){

	if (sf === undefined) sf = 2;
	if (ceilOrFloor === undefined) ceilOrFloor = "none";
	
	var magnitude = Math.floor(log_WW(val, 10));
	

	var num = val * Math.pow(10, sf-magnitude);
	if (ceilOrFloor == "ceil") num = Math.ceil(num)
	else if (ceilOrFloor == "floor") num = Math.floor(num)
	else num = Math.round(num);


	num = num * Math.pow(10, magnitude-sf);
	
	// Sometimes this picks up a trailing .00000000001 which we want to remove

	var expectedStringLength = 0;
	if (magnitude >= 0) expectedStringLength = magnitude >= sf ? magnitude+1 : sf+2; // Add 1 for the decimal point
	else expectedStringLength = 2 -magnitude + sf;
	if (num < 0) expectedStringLength++; // Also need the negative symbol


	num = parseFloat(num.toString().substring(0, expectedStringLength+1));

	
	return num;
		
}


function log_WW(num, base){

	if (base === undefined) base = null;

	if (num == 0) return 0;
	if (base == null) return Math.log(Math.abs(num));
	return Math.log(Math.abs(num)) / Math.log(base);
	
}



 WW_JS.changeSpeed_WW = function(speed, resolve, msgID){


	if (resolve === undefined) resolve = function() {};
	if (msgID === undefined) msgID = null;


	// If changing from something to hidden, then switch to render hidden plots during the simulation
	var renderHidden = false;
	if (speed == "hidden" && ANIMATION_TIME_TEMP != 0) renderHidden = true;


	// if changing from hidden then generate all the objects in the #bases panel again
	var generateEverythingAgain = false;
	if (speed != "hidden" && ANIMATION_TIME_TEMP == 0) generateEverythingAgain = true;


	if (speed == "slow") ANIMATION_TIME_TEMP = 200;
	else if (speed == "medium") ANIMATION_TIME_TEMP = 60;
	else if (speed == "fast") ANIMATION_TIME_TEMP = 15;
	else if (speed == "ultrafast") ANIMATION_TIME_TEMP = 1;
	else if (speed == "hidden") ANIMATION_TIME_TEMP = 0;

	if(renderHidden) {
		SIM_JS.renderPlotsHidden();
	}

	if(generateEverythingAgain){
		tagAllObjectsForGeneration();
	}


	// Use the geometric sampling speed up only if the speed is set to hidden, ultrafast or fast.
	FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowGeometricCatalysis"] = speed != "slow";


	if (msgID != null){
		postMessage(msgID + "~X~" + ANIMATION_TIME_TEMP);
	}else{
		resolve(ANIMATION_TIME_TEMP);
	}


}


 WW_JS.getCurrentState_WW = function(resolve, msgID){


	if (resolve === undefined) resolve = function() {};
	if (msgID === undefined) msgID = null;

	var toReturn = {state: WW_JS.currentState, hybridLen: PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"]};
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
	}else{
		resolve(toReturn);
	}


}


WW_JS.getcurrentStateCopy_WW = function(state){

	if (state === undefined) state = WW_JS.currentState;

	return {leftMBase:state["leftMBase"], rightMBase:state["rightMBase"], leftGBase:state["leftGBase"], rightGBase:state["rightGBase"],
		    mRNAPosInActiveSite:state["mRNAPosInActiveSite"], NTPbound:state["NTPbound"], activated:state["activated"], 
		    bulgePos:state["bulgePos"].slice(), bulgedBase:state["bulgedBase"].slice(), bulgeSize:state["bulgeSize"].slice(),
		    partOfBulgeID:state["partOfBulgeID"].slice(), nextBaseToCopy:state["nextBaseToCopy"], nbases:state["nbases"], mRNALength:state["mRNALength"],
		    rateOfBindingNextBase:state["rateOfBindingNextBase"], terminated:state["terminated"], NTPtoAdd:state["NTPtoAdd"]  };

}



 WW_JS.getSaveSessionData_WW = function(resolve, msgID){


	if (resolve === undefined) resolve = function() {};
	if (msgID === undefined) msgID = null;
	
	
	var tempateSeq = "";
	for (var i = 1; i < templateSequence.length; i++){
		tempateSeq += templateSequence[i]["base"];
	}
	
	
	var toReturn = {PHYSICAL_PARAMETERS: PARAMS_JS.PHYSICAL_PARAMETERS, TEMPLATE_SEQUENCE: tempateSeq, ELONGATION_MODEL: FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel], STATE: STATE_JS.convertFullStateToCompactState(WW_JS.currentState)}
	
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
	}else{
		resolve(toReturn);
	}
	
	
	
}





WW_JS.getDateAndTime = function(currentdate){


	if(currentdate == null) currentdate = new Date(); 
	var datetime = 
			currentdate.getFullYear() + "/"
			+ (currentdate.getMonth()+1)  + "/" 
			+ currentdate.getDate() + " "
            + currentdate.getHours() + ":"  
            + currentdate.getMinutes() + ":" 
            + currentdate.getSeconds();

	return datetime;     

}



// Only for node.js
WW_JS.writeLinesToFile = function(fileName, text, append = false){

	var fs = require('fs');

	if (!append){
		fs.writeFile(fileName, text, function(err) {
			if(err) {
			    return console.log(err);
			}
		}); 
	}

	else{

		fs.appendFile(fileName, text, function(err) {
			if(err) {
			    return console.log(err);
			}
		}); 

	}


}





WW_JS.setOutputFolder = function(folderName){

	if (!RUNNING_FROM_COMMAND_LINE) return;
	if (folderName != null && folderName[folderName.length-1] != "/") folderName += "/";
	WW_JS.outputFolder = folderName;


}


WW_JS.loadSessionFromCommandLine = function(XMLdata, runABC, startingTime, nthreads, workerID, resolve = function() { }){


 	if (!RUNNING_FROM_COMMAND_LINE) return;
	
	

	XML_JS.loadSession_WW(XMLdata);
	
	// Initialise the mersenne-twister using the current time and the worker number as the random seed.
	// If you only use the time there is a decent chance of two threads having the same random seed
	MER_JS.init(new Date().getTime() + (workerID == null ? 0 : 100000 * workerID));


	var toDoAfterRefr = function(){

		
		PLOTS_JS.refreshPlotDataSequenceChangeOnly_WW();
		WW_JS.WORKER_ID = workerID;



	

		var exit = function(){
			

			var workerNum = workerID == null ? "" : "Worker " + workerID + " finished. ";
			console.log(workerNum + "Mean velocity: " + WW_JS.roundToSF_WW(PLOTS_JS.velocity) + "bp/s");
			var meanTimePerTemplate = 0;
			for (var i = 0; i < PLOTS_JS.timesSpentOnEachTemplate.length; i ++) meanTimePerTemplate += PLOTS_JS.timesSpentOnEachTemplate[i] / PLOTS_JS.timesSpentOnEachTemplate.length;
			console.log(workerNum + "Mean time to copy template: " + WW_JS.roundToSF_WW(meanTimePerTemplate, 5) + "s");

			resolve();


		}


		// Start the simulations
		if (!runABC) {

			// Split the number of trials evenly among the number of workers
			var nTrialsThisWorker = XML_JS.N;
			if (nthreads > 1){
				var nTrialsThisWorker = Math.floor(XML_JS.N / nthreads);
				var remainingNumberOfTrials = XML_JS.N % nthreads;

				if (workerID <= remainingNumberOfTrials) nTrialsThisWorker++;

				XML_JS.N = nTrialsThisWorker;
				console.log("Running", nTrialsThisWorker, "simulations on worker", workerID);
			}

			else console.log("Running", nTrialsThisWorker, "simulations");


			SIM_JS.startTrials_WW(nTrialsThisWorker, function(){ 

				exit();

			});

		}

		// Start the ABC
		else{

			// Split the number of iterations evenly among the number of workers
			if (nthreads > 1){
				var nIterationsThisWorker = Math.floor(XML_JS.ABC_FORCE_VELOCITIES["ntrials"] / nthreads);
				var remainingNumberOfTrials = XML_JS.ABC_FORCE_VELOCITIES["ntrials"] % nthreads;

				if (workerID <= remainingNumberOfTrials) nIterationsThisWorker++;

				XML_JS.ABC_FORCE_VELOCITIES["ntrials"] = nIterationsThisWorker;
				console.log("Running", nIterationsThisWorker, "ABC iterations on worker", workerID);
			}

			else console.log("Running", XML_JS.ABC_FORCE_VELOCITIES["ntrials"], "ABC iterations");


			ABC_JS.beginABC_WW(XML_JS.ABC_FORCE_VELOCITIES, function(){ 

				exit();

			});


		}

	}


	var refr = () => new Promise((resolve) => WW_JS.refresh_WW(resolve));
	refr().then(() => toDoAfterRefr());


}







onmessage = function(e) {
	
	//if (e.data)

	var dataBits = e.data.split("~X~");
	if (dataBits.length > 0 && dataBits[0].length == 0){
		var fn = dataBits[1];
		eval(fn)();

	}else if (dataBits.length > 0 && dataBits[0].length > 0){
		var id = dataBits[0];
		var fn = dataBits[1];
		eval(fn)();

	}
	
	else{
		var WebWorkerVariables = JSON.parse(e.data);
    	var result = JSON.stringify(sampleAction_WebWorker(WebWorkerVariables));
		postMessage(result);
	}
    //timedCount();
};


if (RUNNING_FROM_COMMAND_LINE){
	module.exports = {
	  	init_WW: WW_JS.init_WW,
	  	loadSessionFromCommandLine: WW_JS.loadSessionFromCommandLine,
	  	getDateAndTime: WW_JS.getDateAndTime,
	  	setOutputFolder: WW_JS.setOutputFolder,
	  	WORKER_ID: WW_JS.WORKER_ID

	}
}