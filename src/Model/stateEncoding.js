
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

translocationCacheNeedsUpdating = true;
TRANSLOCATION_RATES = null;
BACKTRACKING_RATES = null;


function initTranslocationRateCache(){
	
	
	if (!translocationCacheNeedsUpdating) return;

	TRANSLOCATION_RATES = buildTranslocationRateTable();
	BACKTRACKING_RATES = buildBacktrackRateTable();
	
	
	//console.log("TRANSLOCATION_RATES", TRANSLOCATION_RATES);
	//console.log("BACKTRACKING_RATES", BACKTRACKING_RATES);
	
	
	translocationCacheNeedsUpdating = false;
	
}




function updateCoordsOfCurrentState(){

	// Coordinates of pol
	var h = PHYSICAL_PARAMETERS["hybridLen"]["val"];
	var polX = 165 + 25 * (currentState["rightMBase"] - h + 1);
	var polY = 81;
	move_obj_absolute("pol", polX, polY, 1);
	change_src_of_object_WW(HTMLobjects["pol"], currentState["activated"] ? "pol" : "pol_U"); // Activated or deactivated?



	// Coordinates of all bases
	var dy = 0;
	for (var i = 0; i < primerSequence.length; i ++){


		var ntX = 200 + 25*i;
		if (i == 0) ntX = 150;

		// Y value determined by whether it is part of hybrid, bubble or on the bottom

		var ntY = 207;
		if (i <= currentState["leftMBase"] &&  i > currentState["leftMBase"]  - (PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1) && i >= 0) dy += -52/(PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1)
		if (i > currentState["rightMBase"] && i < currentState["rightMBase"] + (PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1) + 1) dy += 52/(PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1)

		//if (all_sequences[sequenceID]["primer"] != "dsRNA") 
		//for (i = state["leftMBase"] - 1; UPDATE_COORDS &&  i > state["leftMBase"] - (PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1) - 1 && i >= 0; i--) move_nt_WW(i, "m", 0, -52/(PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1));


		// Is NTP bound?
		if (i == primerSequence.length-1 && currentState["NTPbound"]){
			ntX += 10;
			ntY += 10;
		}
		else set_TP_state_WW(i, "m", false);
		
		move_nt_absolute_WW(i, "m", ntX, ntY + dy, 1); 


	}

	dy = 0;
	for (var i = 0; i < templateSequence.length; i ++){

		var ntX = 200 + 25*i;
		if (i == 0) ntX = 150;

		// Y value determined by whether it is part of hybrid, bubble or on the bottom

		var ntY = 78;
		if (i <= currentState["leftGBase"] &&  i > currentState["leftGBase"]  - (PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1) && i >= 0) dy += 52/(PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1)
		if (i > currentState["rightGBase"] && i < currentState["rightGBase"] + (PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1) + 1) dy += -52/(PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1)

		//if (all_sequences[sequenceID]["primer"] != "dsRNA") 
		//for (i = state["leftMBase"] - 1; UPDATE_COORDS &&  i > state["leftMBase"] - (PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1) - 1 && i >= 0; i--) move_nt_WW(i, "m", 0, -52/(PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1));

		 move_nt_absolute_WW(i, "g", ntX, ntY + dy, 1); 


		 // Orientation
		 if (i > 0 && i <= currentState["rightGBase"] + PHYSICAL_PARAMETERS["bubbleRight"]["val"] && i >= currentState["leftGBase"]) flip_base_WW(i, "g", "g"); 
		 else if (i > 0) flip_base_WW(i, "g", "m"); 

		 // Complementary strand
		 if (all_sequences[sequenceID]["template"].substring(0,2) == "ds"){
		 	ntY = 53;
		 	move_nt_absolute_WW(i, "o", ntX, ntY - dy/2, 1); 

		 } 


	}



	// Force beads
	remove_force_equipment_WW();
	if (PHYSICAL_PARAMETERS["FAssist"]["val"] != 0) add_force_equipment_WW(PHYSICAL_PARAMETERS["FAssist"]["val"]);


}



// Slippage states reset
function convertCompactStateToFullState(compactState){
	
	//console.log("Input compact", compactState);
	
	var rightHybridBase = compactState[1] + compactState[0];
	var leftHybridBase = rightHybridBase + 1 - PHYSICAL_PARAMETERS["hybridLen"]["val"];
	
	var fullState = { leftGBase: leftHybridBase, rightGBase: rightHybridBase, leftMBase: leftHybridBase, rightMBase: rightHybridBase, NTPtoAdd: "X",
					 mRNAPosInActiveSite: compactState[1], NTPbound: compactState[2], nbases: currentState["nbases"], mRNALength: compactState[0]+1, activated:compactState[3], rateOfBindingNextBase:0,
					 bulgePos: [0], bulgedBase: [-1], bulgeSize: [0], partOfBulgeID: [0], nextBaseToCopy: compactState[0]+1, terminated: false };
	
	


	//console.log("Output full", fullState);
	return fullState;
	
	
}



// Slippage states will not be encoded
function convertFullStateToCompactState(fullState){
	
	//console.log("Input full", fullState);
	
	// Compact state = [length of nascent strand, position of activte site, bool NTP bound, bool activated]
	var compactState = [fullState["mRNALength"]-1, fullState["mRNAPosInActiveSite"], fullState["NTPbound"], fullState["activated"]];

	return compactState;
	
	
}




function getTranslocationRates(compactState){
	
	
	var h = PHYSICAL_PARAMETERS["hybridLen"]["val"];
	
	//console.log("State", compactState, "tables", TRANSLOCATION_RATES, BACKTRACKING_RATES);
	
	
	// Polymerase is not backtracked. Use regular translocation table
	if (compactState[1] > -2){
		
		
		var rowNum = compactState[0] - (h-1);
		var colNum = compactState[1] + 1;
		
		
		var rates = TRANSLOCATION_RATES[rowNum][colNum];

		if (rates != false) return rates;

		
		// Temporarily set state to inactive so it lets us backtrack
		var temp = compactState[3];
		compactState[3] = false;
		
		// If rates are not in table then add them and return them
		var thisFullState = convertCompactStateToFullState(compactState);
		var slidingPeakHeights = update_slidingPeakHeights_WW(thisFullState, false);
		var slidingTroughHeights = update_slidingTroughHeights_WW(thisFullState, false);
		compactState[3] = temp;
		
		//console.log("compactState", compactState, "slidingPeakHeights", slidingPeakHeights);

		


		var kbck = 0;
		var kfwd = 0;
		if (slidingPeakHeights[2] != maxHeight) kbck = Math.exp(-(slidingPeakHeights[2] - slidingTroughHeights[3])) * 1e6;
		if (slidingPeakHeights[3] != maxHeight)	kfwd = Math.exp(-(slidingPeakHeights[3] - slidingTroughHeights[3])) * 1e6;


		TRANSLOCATION_RATES[rowNum][colNum] = [kbck, kfwd];

		return [kbck, kfwd];
		
		
		
	}
	
	
	// Polymerase is backtracked. Use backtracking table
	else{
		
		
		
		
		var rightHybridBase = compactState[1] + compactState[0];
		var leftHybridBase = rightHybridBase + 1 - h;
		var indexNum = leftHybridBase - 1;

		var rates = BACKTRACKING_RATES[indexNum];

		if (rates != false) return rates;
		
		
		// If rates are not in table then add them and return them
		var thisFullState = convertCompactStateToFullState(compactState);
		var slidingPeakHeights = update_slidingPeakHeights_WW(thisFullState, false);
		var slidingTroughHeights = update_slidingTroughHeights_WW(thisFullState, false);

		var kbck = 0;
		var kfwd = 0;
		if (slidingPeakHeights[2] != maxHeight) kbck = Math.exp(-(slidingPeakHeights[2] - slidingTroughHeights[3])) * 1e6;
		if (slidingPeakHeights[3] != maxHeight)	kfwd = Math.exp(-(slidingPeakHeights[3] - slidingTroughHeights[3])) * 1e6;

		BACKTRACKING_RATES[indexNum] = [kbck, kfwd];

		return [kbck, kfwd];
	
		
		
	}
	

	
}



function buildBacktrackRateTable(){
	
	
	// Once the polymerase has entered state -2 (ie backtracked by 2 positions) then all backtracking rates 
	// are the same per position across different nascent strand lengths. The bases added onto the nascent strand
	// which are coming out of the NTP pore don't matter. This assumption would no longer hold if we started
	// folding the 3' end of the nascent strand
	
	
	var h = PHYSICAL_PARAMETERS["hybridLen"]["val"];
	if (currentState["nbases"] - h - 1 < 0) return null;
	var backtrackRates = Array(currentState["nbases"] - h - 1);
	
	
	for (var leftHybridBase = 1; leftHybridBase <= currentState["nbases"] - h - 1; leftHybridBase ++){
		var indexNum = leftHybridBase - 1;
		backtrackRates[indexNum] = false; // Will leave it empty and add values only as they are needed
	}
	
	
	return backtrackRates;
	
	
	
	
}



function buildTranslocationRateTable(){
	

	
	// Don't calculate all at once, only calculating for active site positions 0 and 1. Simulation caches hypertranslocated rates as it goes. 
	// Most states are never sampled. Otherwise far too slow to load for n > 300
	
	// Rows are the lengths of the mRNA and cols are the position of the active site (minimum value -1, maximum value h-1). Backtracking rates are found in the backtracking table
	// Each entry is a tuple (kbck, kfwd)
	// There are n - h rows (n is total number of bases, h is hybrid length)
	// There are l + 1 entries in each row, where l is the length of the nascent strand in the row
	var h = PHYSICAL_PARAMETERS["hybridLen"]["val"];
	var nLengths = currentState["nbases"] - h;
	var nPositions = h + 1; 
	
	
	if (nLengths < 0) return null;
	
	var translocationRates = Array(nLengths);
	for(var nascentLen = h-1; nascentLen <= currentState["nbases"]; nascentLen ++){
		
		var rowNum = nascentLen - (h-1);
		
		translocationRates[rowNum] = Array(nPositions).fill(false);

		
		for (var activeSitePos = -1; activeSitePos <= h-1; activeSitePos ++){
			
			var colNum = activeSitePos + 1;
			
			translocationRates[rowNum][colNum] = false; // Will leave it empty and add values only as they are needed

			
			
		}
		
	}
	
	
	
	

	return translocationRates;
	
	
	
	
}


function forward_cWW(state, resolve = function() { }){
	if (!state[2]) state[1]++;
	if (state[1] > PHYSICAL_PARAMETERS["hybridLen"]["val"] - 1) SIMULATION_VARIABLES["terminated"] = true; // Terminate if too hypertranslocated
	resolve();
}

function backward_cWW(state, resolve = function() { }){
	if (!state[2]) state[1]--;
	resolve();
}

function bindNTP_cWW(state, resolve = function() { }){
	if (state[3] && !state[2] && state[1] == 1) {
		state[2] = true; // Bind NTP
		create_nucleotide_WW("m" + (state[0]+1), "m", state[0]+1, 0, 0, SIMULATION_VARIABLES["baseToAdd"] , SIMULATION_VARIABLES["baseToAdd"]  + "m", true);
	}
	else if (state[3] && state[2] && state[1] == 1) { // Elongate
		state[2] = false;
		state[0]++;
		state[1] = 0;
	}
	resolve();
}

function releaseNTP_cWW(state, resolve = function() { }){
	if (state[2]) {
		delete_nt_WW(state[0]+1, "m");
		state[2] = false;
	}
	resolve();
}

function activate_cWW(state, resolve = function() { }){
	if (!state[3]) state[3] = true;
	resolve();
}

function deactivate_cWW(state, resolve = function() { }){
	if (state[3] && !state[2]) state[3] = false;
	resolve();
}










