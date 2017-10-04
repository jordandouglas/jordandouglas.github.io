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

isWebWorker = false;

function init_WW(isWW){

	isWebWorker = isWW;
	

	if (isWebWorker){
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
		self.importScripts('../Resources/jstat.min.js');
		self.importScripts('../Resources/mersenne-twister.js');
		self.importScripts('../Resources/xml_for_script-3.1/jsXMLParser/xmlsax.js');
		mersenneTwister = new MersenneTwister();
	}


	needToRefreshNTPParameters = true;
	for (sequenceID in all_sequences){ break }; // Set the current sequence to the first sequence in the dict
	init_misincorporation_pairs();
	initFreeEnergy_WW();
	initParameters_WW();


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

	
	stopRunning_WW = true;
	simulating = false;
	simulationOnPause = false;
	ANIMATION_TIME_TEMP = 100; // TODO: sync with DOM



	//refresh_WW();

	console.log("ww connected");

}





function refresh_WW(resolve = function() {}, msgID = null){



	// Which sequence are we using
	sample_parameters_WW();
	templateEntryChannelLength = 6;
	templateExitChannelLength = 5;
	specialSite = -1;

	// Initial state
	currentState = { leftGBase: 0, rightGBase: PHYSICAL_PARAMETERS["hybridLength"]["val"]-1, leftMBase: 0, rightMBase: PHYSICAL_PARAMETERS["hybridLength"]["val"]-1, NTPtoAdd: "X",
					 mRNAPosInActiveSite: 0, NTPbound: false, nbases: 0, mRNALength: PHYSICAL_PARAMETERS["hybridLength"]["val"], activated:true, rateOfBindingNextBase:0,
					 bulgePos: [0], bulgedBase: [-1], bulgeSize: [0], partOfBulgeID: [0], nextBaseToCopy: PHYSICAL_PARAMETERS["hybridLength"]["val"], terminated: false };
	


	//currentState = convertCompactStateToFullState(convertFullStateToCompactState(currentState));

	
	add_pairs_WW();
	calculateAllBarrierHeights_WW();

	refreshPlotData();
	//if (!simulating) transcribe_WW(2, true);
	
	// Update the force diagram
	updateForce_WW();

	setNextBaseToAdd_WW();
	transcribe_WW(2 + Math.max(2, PHYSICAL_PARAMETERS["bubbleSizeLeft"]["val"]+2), true); // Keep moving right until transcription bubble is sealed


	initTranslocationRateCache();



	if (msgID != null){
		postMessage(msgID + "~X~" + "done");
	}else{
		resolve(true);
	}



}



function add_pairs_WW(msgID = null){

	
	var bases = all_sequences[sequenceID]["seq"].toUpperCase();


	if (isWebWorker){
		//postMessage("MSG:Adding pairs " + bases);
	}

	
	startX = 225;
	startY = 3 + 75;
	index = 1;

	HTMLobjects = [];
	unrenderedObjects = [{id: "clear"}];
	templateSequence = [];
	primerSequence = [];
	complementSequence = [];
	
	nucleoproteinPhase = -1;
	if (sequenceID != "$user" && all_sequences[sequenceID]["nucleoproteinPhase"] != null){
		nucleoproteinPhase = all_sequences[sequenceID]["nucleoproteinPhase"];
		
		for (var i = 0; i < Math.floor(bases.length / 6) + 1; i++) {
			var xPos = startX + 6 * 25 * (i-1) + (6-nucleoproteinPhase+1) * 25;
			var yPos = startY - 18;
			if (i == 0) {
				create_nucleoprotein_WW("NP" + (i+1), xPos, yPos -50);
			}
			else if (PHYSICAL_PARAMETERS["hybridLength"]["val"] + nucleoproteinPhase > i * 6 ) {
				create_nucleoprotein_WW("NP" + (i+1), xPos, yPos -50);
			}
			else if (templateEntryChannelLength + PHYSICAL_PARAMETERS["hybridLength"]["val"] - 2 + nucleoproteinPhase > i * 6) {
				create_nucleoprotein_WW("NP" + (i+1), xPos, yPos -50);
			}
			else{
				create_nucleoprotein_WW("NP" + (i+1), xPos, yPos);
			}
			
		}
	}
	
	
	
	if (sequenceID == "$user" || nucleoproteinPhase == -1) create_pol_WW(165, 81);
	else create_pol_WW(75, 70, "paraPol");
	
	if (all_sequences[sequenceID]["template"].substring(0,2) == "ds")  {
		if (all_sequences[sequenceID]["template"] == "dsRNA") create_nucleotide_WW("o0", "o", 0, startX-75, startY - 25 - 26, "5", "5RNA");
		else create_nucleotide_WW("o0", "o", 0, startX-75, startY - 25 - 26, "5", "5DNA");
	}

	if (all_sequences[sequenceID]["template"].substring(2,5) == "RNA") create_nucleotide_WW("g0", "g", 0, startX-75, startY + 52, "3", "3RNA");
	else create_nucleotide_WW("g0", "g", 0, startX-75, startY + 52, "3", "3DNA");
	
	if (all_sequences[sequenceID]["primer"].substring(2) == "RNA") create_nucleotide_WW("m0", "m", 0, startX-75, startY + 77, "5", "5RNA");
	else create_nucleotide_WW("m0", "m", 0, startX-75, startY + 77, "5", "5DNA");
	
	for (i = 0; i < bases.length; i++) {
		
		var baseToAdd = bases[i];
		if (baseToAdd != "A" && baseToAdd != "C" && baseToAdd != "G" && baseToAdd != "T" && baseToAdd != "U") baseToAdd = "X";
		if ((all_sequences[sequenceID]["template"] == "ssRNA" || all_sequences[sequenceID]["template"] == "dsRNA") && baseToAdd == "T") baseToAdd = "U";
		if ((all_sequences[sequenceID]["template"] == "ssDNA" || all_sequences[sequenceID]["template"] == "dsDNA") && baseToAdd == "U") baseToAdd = "T";
		



		
		
		if (index < PHYSICAL_PARAMETERS["hybridLength"]["val"]){
			
			create_nucleotide_WW("g" + index, "g", index, startX, startY + 52, baseToAdd, baseToAdd + "g");
			oppositeCol = baseToAdd == "G" ? "C" : baseToAdd == "C" ? "G" : baseToAdd == "A" ? "U" : baseToAdd == "U" ? "A" : baseToAdd == "T" ? "A" : "X";

			if ((all_sequences[sequenceID]["primer"].substring(2) == "RNA") && oppositeCol == "T") oppositeCol = "U";
			if ((all_sequences[sequenceID]["primer"].substring(2) == "DNA") && oppositeCol == "U") oppositeCol = "T";

			create_nucleotide_WW("m" + index, "m", index, startX, startY + 77, oppositeCol, oppositeCol + "m");
			setPrimerSequenceBaseParent(index, index);


			// The strand complementary to the template (if ds)
			if (all_sequences[sequenceID]["template"] == "dsRNA"){
				oppositeCol = baseToAdd == "G" ? "C" : baseToAdd == "C" ? "G" : baseToAdd == "A" ? "U" : baseToAdd == "U" ? "A" : "X";
				if (all_sequences[sequenceID]["primer"].substring(0,2) != "ds") create_nucleotide_WW("o" + index, "o", index, startX, startY - 25 - 26, oppositeCol, oppositeCol + "g");
				else create_nucleotide_WW("o" + index, "o", index, startX, startY - 25 - 26, oppositeCol, oppositeCol + "m");
				
			}
			if (all_sequences[sequenceID]["template"] == "dsDNA"){
				oppositeCol = baseToAdd == "G" ? "C" : baseToAdd == "C" ? "G" : baseToAdd == "A" ? "T" : baseToAdd == "T" ? "A" : "X";
				if (all_sequences[sequenceID]["primer"].substring(0,2) != "ds") create_nucleotide_WW("o" + index, "o", index, startX, startY - 25 - 26, oppositeCol, oppositeCol + "g");
				else create_nucleotide_WW("o" + index, "o", index, startX, startY - 25 - 26, oppositeCol, oppositeCol + "m");
			}


		}else{
			dy = 52 - Math.min(52, (index - (PHYSICAL_PARAMETERS["hybridLength"]["val"]-1)) * 52/(PHYSICAL_PARAMETERS["bubbleSizeRight"]["val"]+1));
			if (all_sequences[sequenceID]["template"].substring(0,2) == "ds") {
				create_nucleotide_WW("g" + index, "g", index, startX, startY + dy, baseToAdd, baseToAdd + "m");
			}
			else {
				create_nucleotide_WW("g" + index, "g", index, startX, startY + dy, baseToAdd, baseToAdd + "g");
			}


			// The strand complementary to the template (if ds)
			if (all_sequences[sequenceID]["template"] == "dsRNA"){
				oppositeCol = baseToAdd == "G" ? "C" : baseToAdd == "C" ? "G" : baseToAdd == "A" ? "U" : baseToAdd == "U" ? "A" : "X";
				create_nucleotide_WW("o" + index, "o", index, startX, startY - 25 - dy/2, oppositeCol, oppositeCol + "g");
			}
			if (all_sequences[sequenceID]["template"] == "dsDNA"){
				oppositeCol = baseToAdd == "G" ? "C" : baseToAdd == "C" ? "G" : baseToAdd == "A" ? "T" : baseToAdd == "T" ? "A" : "X";
				create_nucleotide_WW("o" + index, "o", index, startX, startY - 25 - dy/2, oppositeCol, oppositeCol + "g");
			}


		}

		startX = startX + 25;
		index = index + 1;
	}
		
	currentState["nbases"] = index;

	if (isWebWorker){
		//postMessage("MSG:unrenderedObjects" + JSON.stringify(unrenderedObjects));
	}
	
	//window.requestAnimationFrame(function(){
		//callbackFn();
	//});
	if (msgID != null){
		postMessage(msgID + "~X~done");

	}
	

}



function stop_WW(resolve = function() { }, msgID = null){

	simulating = false;
	stopRunning_WW = true;
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




function rexp(rate){
	
	var unif01 = mersenneTwister.random();
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



function create_HTMLobject_WW(id, x, y, width, height, src, zIndex = 1){

	var obj = {id:id, x:x, y:y, width:width, height:height, src: src, needsGenerating:true, needsAnimating:false, needsSourceUpdate:false, needsDeleting:false, dx: 0, dy: 0, animationTime:ANIMATION_TIME, zIndex: zIndex};
	HTMLobjects[id] = obj;
	unrenderedObjects.push(obj);

}

function create_pol_WW(x, y, src = "pol"){


	var width, height; 
	if (all_sequences[sequenceID]["primer"].substring(0,2) == "ds"){
		src = "square";
	}

	if (src == "paraPol") {
		width = 448;
		height = 160;
	}
	else {
		width = (PHYSICAL_PARAMETERS["hybridLength"]["val"] * 25 + 75);
		height = 140;
	}

	create_HTMLobject_WW("pol", x, y, width, height, src);

}



function change_src_of_object_WW(obj, newSrc){

	obj["src"] = newSrc;
	if (!obj["needsGenerating"] && !obj["needsAnimating"] && !obj["needsSourceUpdate"] && !obj["needsDeleting"]) unrenderedObjects.push(obj);
	obj["needsSourceUpdate"] = true;

}




// Change the src on a nucleotide to represent the object flipping
function flip_base_WW(pos, seq, flipTo){


	var nt = null;

	if (seq == "m") nt = primerSequence[pos];
	else if (seq == "g") nt = templateSequence[pos];
	else if (seq == "o") nt = complementSequence[pos];
	if (nt == null) return;

	var newSrc = nt["base"] + flipTo;
	change_src_of_object_WW(nt, newSrc);


}



function create_nucleoprotein_WW(id, x, y){
	create_HTMLobject_WW(id, x, y, 6 * 25, 55, "nucleoprotein");
}




function move_obj_absolute(id, newX, newY, animationTime = ANIMATION_TIME) {

	var obj = HTMLobjects[id];
	if (obj == null) return;
	var dx = newX - obj["x"];
	var dy = newY - obj["y"];
	move_obj_WW(obj, dx, dy, animationTime)

}



function move_nt_absolute_WW(pos, seq, newX, newY, animationTime = ANIMATION_TIME) {

	var nt = null;

	if (seq == "m") nt = primerSequence[pos];
	else if (seq == "g") nt = templateSequence[pos];
	else if (seq == "o") nt = complementSequence[pos];
	if (nt == null) return;

	var dx = newX - nt["x"];
	var dy = newY - nt["y"];

	move_obj_WW(nt, dx, dy, animationTime)


}



function position_bulge_WW(startBaseNum, startBaseXVal, bulgeSize, inPrimer = true, skip = 0){
	
	
	var thisStrandSymbol = inPrimer ? "m" : "g";
	var otherStrandSymbol = inPrimer ? "g" : "m";
	var thisSequenceObject = inPrimer ? primerSequence : templateSequence;
	var yHeight = 155;
	
	

	
	// Flip the bases so that the bulged bases are facing outwards and the pairing bases are facing inwards
	if(skip == 0) flip_base_WW((startBaseNum), thisStrandSymbol, thisStrandSymbol);
	if(skip == 0) flip_base_WW((startBaseNum+bulgeSize+1), thisStrandSymbol, thisStrandSymbol);
	for (var bPos = startBaseNum + 1; bPos <= startBaseNum + bulgeSize; bPos ++){
		flip_base_WW(bPos, thisStrandSymbol, otherStrandSymbol);
	}
	
	
	if(skip == 0) move_nt_absolute_WW(startBaseNum, thisStrandSymbol, startBaseXVal, yHeight);
	else move_nt_absolute_WW(startBaseNum, thisStrandSymbol, startBaseXVal, thisSequenceObject[startBaseNum]["y"]); // Move it to its correct x coordinate but leave at its y one
	
	if(skip == 0) move_nt_absolute_WW(startBaseNum+bulgeSize+1, thisStrandSymbol, startBaseXVal+25, yHeight);
	else move_nt_absolute_WW(startBaseNum+bulgeSize+1, thisStrandSymbol, startBaseXVal+25, thisSequenceObject[startBaseNum+bulgeSize+1]["y"]); // Move it to its correct x coordinate but leave at its y one
	

	// Bulge size 1
	if (bulgeSize == 1){
		move_nt_absolute_WW(startBaseNum+1, thisStrandSymbol, startBaseXVal+13, yHeight + 25);
	}
	
	
	// Bulge size 2
	else if (bulgeSize == 2){
		move_nt_absolute_WW(startBaseNum+1, thisStrandSymbol, startBaseXVal+3, yHeight + 25);
		move_nt_absolute_WW(startBaseNum+2, thisStrandSymbol, startBaseXVal+22, yHeight + 25);
	}
	
	
	// Bulge size 3
	else if (bulgeSize == 3){
		move_nt_absolute_WW(startBaseNum+1, thisStrandSymbol, startBaseXVal+2, yHeight + 25);
		move_nt_absolute_WW(startBaseNum+2, thisStrandSymbol, startBaseXVal+12, yHeight + 50);
		move_nt_absolute_WW(startBaseNum+3, thisStrandSymbol, startBaseXVal+23, yHeight + 25);
	}
	
	
	// Bulge size 4
	else if (bulgeSize == 4){
		move_nt_absolute_WW(startBaseNum+1, thisStrandSymbol, startBaseXVal-5, yHeight + 25);
		move_nt_absolute_WW(startBaseNum+2, thisStrandSymbol, startBaseXVal+2, yHeight + 50);
		move_nt_absolute_WW(startBaseNum+3, thisStrandSymbol, startBaseXVal+23, yHeight + 50);
		move_nt_absolute_WW(startBaseNum+4, thisStrandSymbol, startBaseXVal+30, yHeight + 25);
	}
	
	
	// Bulge size 5
	else if (bulgeSize == 5){
		move_nt_absolute_WW(startBaseNum+1, thisStrandSymbol, startBaseXVal-7, yHeight + 25);
		move_nt_absolute_WW(startBaseNum+2, thisStrandSymbol, startBaseXVal, yHeight + 48);
		move_nt_absolute_WW(startBaseNum+3, thisStrandSymbol, startBaseXVal+12, yHeight + 68);
		move_nt_absolute_WW(startBaseNum+4, thisStrandSymbol, startBaseXVal+25, yHeight + 48);
		move_nt_absolute_WW(startBaseNum+5, thisStrandSymbol, startBaseXVal+32, yHeight + 25);
	}
	
	
	// Bulge size 6
	else if (bulgeSize == 6){
		move_nt_absolute_WW(startBaseNum+1, thisStrandSymbol, startBaseXVal, yHeight + 25);
		move_nt_absolute_WW(startBaseNum+2, thisStrandSymbol, startBaseXVal-7, yHeight + 48);
		move_nt_absolute_WW(startBaseNum+3, thisStrandSymbol, startBaseXVal, yHeight + 68);
		move_nt_absolute_WW(startBaseNum+4, thisStrandSymbol, startBaseXVal+25, yHeight + 68);
		move_nt_absolute_WW(startBaseNum+5, thisStrandSymbol, startBaseXVal+32, yHeight + 48);
		move_nt_absolute_WW(startBaseNum+6, thisStrandSymbol, startBaseXVal+25, yHeight + 25);
	}
	
	
	else if (bulgeSize > 6){
		
		move_nt_absolute_WW(startBaseNum+1, thisStrandSymbol, startBaseXVal, yHeight + 25);
		move_nt_absolute_WW(startBaseNum+bulgeSize, thisStrandSymbol, startBaseXVal+25, yHeight + 25);
		
		for (var i = 1; i < Math.floor((bulgeSize - 1) / 2); i ++){
			move_nt_absolute_WW(startBaseNum+1+i, thisStrandSymbol, startBaseXVal-7, yHeight + 25 + (20*i));
			move_nt_absolute_WW(startBaseNum+bulgeSize-i, thisStrandSymbol, startBaseXVal+32, yHeight + 25 + (20*i));
		}
		
		// Even size
		if (bulgeSize % 2 == 0){
			
			var tipOfBulge = Math.floor((bulgeSize - 1) / 2) + 1;
			move_nt_absolute_WW(startBaseNum+tipOfBulge, thisStrandSymbol, startBaseXVal, yHeight + tipOfBulge*20);
			move_nt_absolute_WW(startBaseNum+tipOfBulge+1, thisStrandSymbol, startBaseXVal+25, yHeight + tipOfBulge*20);
			
			
		}else{ // Odd size
			
			var tipOfBulge = Math.floor((bulgeSize - 1) / 2) + 1;
			move_nt_absolute_WW(startBaseNum+tipOfBulge, thisStrandSymbol, startBaseXVal + 12, yHeight + tipOfBulge*20);
			
		}

		
	}
		
	
}


// Declare which template base the primer base was copied from
function setPrimerSequenceBaseParent(nascentBaseID, templateBaseID){

	var nt = primerSequence[nascentBaseID];
	if (nt == null) return;

	nt["copiedFrom"] = templateBaseID;

}


function create_nucleotide_WW(id, seq, pos, x, y, base, src, hasTP = false){

	if (isWebWorker){
		//postMessage("MSG:Calling create_nucleotide_WW, id = " + id);
	}

	var labelBase = base == "3" || base == "5";
	var width = (labelBase ? 70 : 20);
	var height = 20;
	var nt = {id:id, seq:seq, pos:pos, x:x, y:y, width:width, height:height, base:base, src:src, hasTP:hasTP, needsGenerating:true, needsAnimating:false, needsDeleting:false, needsSourceUpdate: false, dx: 0, dy: 0, animationTime:ANIMATION_TIME, zIndex:3};

	if (seq == "m") primerSequence[pos] = nt;
	else if (seq == "g") templateSequence[pos] = nt;
	else if (seq == "o") complementSequence[pos] = nt;


	unrenderedObjects.push(nt);


}

function delete_HTMLobj_WW(id){

	var obj = HTMLobjects[id];
	if (obj == null) return;
	if (!obj["needsGenerating"] && !obj["needsAnimating"] && !obj["needsSourceUpdate"] && !obj["needsDeleting"]) unrenderedObjects.push(obj);
	obj["needsDeleting"] = true;

}


// Remove the nucleotide from the sequence list, and tag it for destruction
function delete_nt_WW(pos, seq){

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
function move_obj_WW(obj, dx, dy, animationTime = ANIMATION_TIME){

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
function move_obj_from_id_WW(id, dx, dy, animationTime = ANIMATION_TIME){


	var obj = HTMLobjects[id];
	if (obj == null) return;
	move_obj_WW(obj, dx, dy, animationTime)


}

// Move the nucleotide with the specified position in the specified sequence
function move_nt_WW(pos, seq, dx, dy, animationTime = ANIMATION_TIME) {


	var nt = null;

	if (seq == "m") nt = primerSequence[pos];
	else if (seq == "g") nt = templateSequence[pos];
	else if (seq == "o") nt = complementSequence[pos];
	if (nt == null) return;


	//console.log("Moving", nt, dx, dy);

	move_obj_WW(nt, dx, dy, animationTime)

}


// If on webworker will send back the list and then clear it.
// if not webworker will send the list back but will not clear it 
function get_unrenderedObjects_WW(msgID = null){
	if (msgID != null){
		//postMessage("MSG:Calling get_unrenderedObjects_WW, returning " + JSON.stringify(unrenderedObjects));

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


function get_primerSequence_WW(msgID = null){
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
function userInputSequence_WW(newSeq, newTemplateType, newPrimerType, inputSequenceIsNascent, msgID = null){

	// Store the template sequence not the nascent sequence 
	newSeq = newSeq.trim();
	var goodLength = newSeq.length > PHYSICAL_PARAMETERS["hybridLength"]["val"];

	if (inputSequenceIsNascent) newSeq = getComplementSequence_WW(newSeq, newPrimerType.substring(2) == "RNA");

	// Only apply changes if there is one
	if (goodLength && sequenceID != newSeq.substring(0, 15) || newSeq != all_sequences[sequenceID]["seq"] || newTemplateType != all_sequences[sequenceID]["template"] || newPrimerType != all_sequences[sequenceID]["primer"]){

	
		if (newPrimerType.substring(2) != all_sequences[sequenceID]["primer"].substring(2)) needToRefreshNTPParameters = true;  // Refresh the NTP concentrations if nascent strand changed from DNA to RNA or vice versa

		sequenceID = newSeq.substring(0, 15);
		all_sequences[sequenceID] = {};
		all_sequences[sequenceID]["seq"] = newSeq;
		all_sequences[sequenceID]["template"] = newTemplateType;
		all_sequences[sequenceID]["primer"] = newPrimerType;

		// Reset secondary structure calculations
		MFE_W = {};
		MFE_V = {};
		
		
		translocationCacheNeedsUpdating = true;

		setStructuralParameters_WW();

	}
		

	if (msgID != null){
		postMessage(msgID + "~X~" + goodLength);
	}else{
		return goodLength;
	}

}


// User selects sequence from the list of sequences. 
// Parse newTemplateType \in {"dsDNA", "dsRNA", "ssDNA", "ssRNA"} and newPrimerType \in {"RNA", "DNA"}
function userSelectSequence_WW(newSequenceID, newTemplateType, newPrimerType, msgID = null){

	// Only apply change if there is one
	if (newSequenceID != sequenceID ||newTemplateType != all_sequences[sequenceID]["template"] || newPrimerType != all_sequences[sequenceID]["primer"]){
	
		console.log(newPrimerType == null, newPrimerType, all_sequences[sequenceID]["primer"]);
		if (newPrimerType == null && all_sequences[newSequenceID]["primer"].substring(2) != all_sequences[sequenceID]["primer"].substring(2)) needToRefreshNTPParameters = true; // Refresh the NTP concentrations if nascent strand changed from DNA to RNA or vice versa
		else if (newPrimerType != null && newPrimerType != all_sequences[sequenceID]["primer"].substring(2)) needToRefreshNTPParameters = true;
	
		sequenceID = newSequenceID;
		if (newTemplateType != null) all_sequences[sequenceID]["template"] = newTemplateType;
		if (newPrimerType != null) all_sequences[sequenceID]["primer"] = newPrimerType;

		
		// Reset secondary structure calculations
		MFE_W = {};
		MFE_V = {};
		
		
		translocationCacheNeedsUpdating = true;
		
		setStructuralParameters_WW();

	}


	if (msgID != null){
		postMessage(msgID + "~X~" + "done");
	}else{
		return null;
	}
}



function getBaseInSequenceAtPosition_WW(baseID){
	
	var seq = baseID[0];
	var pos = parseFloat(baseID.substring(1));
	if (seq == "g") return templateSequence[pos]["base"];
	if (seq == "m") return primerSequence[pos]["base"];
	if (seq == "o") return complementSequence[pos]["base"];

	return null;

}


function getMisbindMatrix_WW(resolve = function(x) { }, msgID = null){

	if (msgID != null){
		postMessage( msgID + "~X~" + JSON.stringify(misbindMatrix) );
	}else{
		resolve(misbindMatrix);
	}


}



function sampleBaseToAdd(baseToTranscribe){



	// Calculate the 4 nucleotide binding rates
	var bindingRates = [0,0,0,0];
	var bindingRateSum = 0;

	var TorU = all_sequences[sequenceID]["primer"].substring(2) == "DNA" ? "T" : "U";
	var bases = ["A", "C", "G", TorU];



	for (var i = 0; i < bindingRates.length; i ++){
		bindingRates[i] = misbindMatrix[baseToTranscribe][bases[i]];
		bindingRateSum += bindingRates[i];
	}

	
	// Generate a random number to select which base to bind
	var randNum = mersenneTwister.random() * bindingRateSum;
	var accumulativeSum = 0;
	var baseToBind = 0;
	for (baseToBind = 0; baseToBind < bindingRates.length; baseToBind ++){
		accumulativeSum += bindingRates[baseToBind];
		if (randNum < accumulativeSum) break;
	}


	return {base: bases[baseToBind], rate: bindingRates[baseToBind]};


}



function setNextBaseToAdd_WW(resolve = function() { }, msgID = null){


	var NTPtoAddTemp;
	var toTranscribe = currentState["nextBaseToCopy"];
	if (templateSequence[toTranscribe] == null) return;
	var baseToTranscribe = getBaseInSequenceAtPosition_WW("g" + toTranscribe);


	// Sample a base and its rate
	var result = sampleBaseToAdd(baseToTranscribe);


	// Update the gui and state variables so that this base is bound next
	NTPtoAddTemp = result["base"];
	currentState["rateOfBindingNextBase"] = result["rate"];
	if (NTPtoAddTemp == "T" && all_sequences[sequenceID]["primer"] == "RNA") NTPtoAddTemp = "U";


	currentState["NTPtoAdd"] = NTPtoAddTemp;
	var result = {NTPtoAdd: NTPtoAddTemp};
	if (msgID != null){
		postMessage( msgID + "~X~" + JSON.stringify(result) );
	}else{
		resolve(result);
	}

	return result;


}

function userSetNextBaseToAdd_WW(ntpType, resolve = function() { }, msgID = null){

	if (ntpType == "T" && all_sequences[sequenceID]["primer"].substring(2) == "RNA") ntpType = "U";
	else if (ntpType == "U" && all_sequences[sequenceID]["primer"] == "DNA") ntpType = "T";

	currentState["NTPtoAdd"] = ntpType;
	var baseToTranscribe = templateSequence[currentState["nextBaseToCopy"]]["base"];
	currentState["rateOfBindingNextBase"] = misbindMatrix[baseToTranscribe][ntpType];


	if (msgID != null){
		postMessage(msgID + "~X~done");
	}else{
		resolve();
	}
}


function initMisbindingMatrix(){


	
	misbindMatrix = {};
	var TorU = all_sequences[sequenceID]["template"].substring(2) == "DNA" ? "T" : "U";
	var fromBases = ["A", "C", "G", TorU];
	TorU = all_sequences[sequenceID]["primer"].substring(2) == "DNA" ? "T" : "U";
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
	
	var NTPconc = ELONGATION_MODELS[currentElongationModel]["useFourNTPconcentrations"] ? PHYSICAL_PARAMETERS[NTPconcID]["val"] : PHYSICAL_PARAMETERS["NTPconc"]["val"];
	var rateOfBindingNextBaseTemp = 0;


	// If misincorporations are not allowed then return 0
	if (!ELONGATION_MODELS[currentElongationModel]["allowMisincorporation"] && correctPairs["" + baseX + baseY] == null) return 0;




	var probTransversion = 1 / (2 + PHYSICAL_PARAMETERS["TransitionTransversionRatio"]["val"]);

	// Normal basepairing
	if (correctPairs["" + baseX + baseY] != null) rateOfBindingNextBaseTemp = PHYSICAL_PARAMETERS["RateBind"]["val"] * NTPconc;

	// A mis-binding event which may lead to a transition mutation
	else if (transitionPairs["" + baseX + baseY] != null) rateOfBindingNextBaseTemp = (1 - 2*probTransversion) * NTPconc * PHYSICAL_PARAMETERS["RateMisbind"]["val"];

	// A mis-binding event which may lead to a transversion mutation
	else rateOfBindingNextBaseTemp = probTransversion * NTPconc * PHYSICAL_PARAMETERS["RateMisbind"]["val"];


	return rateOfBindingNextBaseTemp;
	
}


function changeSpeed_WW(speed, resolve = function() { }, msgID = null){


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
		renderPlotsHidden();
	}

	if(generateEverythingAgain){
		tagAllObjectsForGeneration();
	}


	// Use the geometric sampling speed up only if the speed is set to hidden, ultrafast or fast.
	ELONGATION_MODELS[currentElongationModel]["allowGeometricCatalysis"] = speed != "slow";


	if (msgID != null){
		postMessage(msgID + "~X~" + ANIMATION_TIME_TEMP);
	}else{
		resolve(ANIMATION_TIME_TEMP);
	}


}


function getCurrentState_WW(resolve = function() {}, msgID = null){

	var toReturn = {state: currentState, hybridLength: PHYSICAL_PARAMETERS["hybridLength"]["val"]};
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
	}else{
		resolve(toReturn);
	}


}


function getCurrentStateCopy_WW(state = currentState){

	return {leftMBase:state["leftMBase"], rightMBase:state["rightMBase"], leftGBase:state["leftGBase"], rightGBase:state["rightGBase"],
		    mRNAPosInActiveSite:state["mRNAPosInActiveSite"], NTPbound:state["NTPbound"], activated:state["activated"], 
		    bulgePos:state["bulgePos"].slice(), bulgedBase:state["bulgedBase"].slice(), bulgeSize:state["bulgeSize"].slice(),
		    partOfBulgeID:state["partOfBulgeID"].slice(), nextBaseToCopy:state["nextBaseToCopy"], nbases:state["nbases"], mRNALength:state["mRNALength"],
		    rateOfBindingNextBase:state["rateOfBindingNextBase"], terminated:state["terminated"], NTPtoAdd:state["NTPtoAdd"]  };

}



function getSaveSessionData_WW(resolve = function() { }, msgID = null){
	
	
	var tempateSeq = "";
	for (var i = 1; i < templateSequence.length; i++){
		tempateSeq += templateSequence[i]["base"];
	}
	
	
	var toReturn = {PHYSICAL_PARAMETERS: PHYSICAL_PARAMETERS, TEMPLATE_SEQUENCE: tempateSeq, ELONGATION_MODEL: ELONGATION_MODELS[currentElongationModel], STATE: convertFullStateToCompactState(currentState)}
	
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
	}else{
		resolve(toReturn);
	}
	
	
	
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



