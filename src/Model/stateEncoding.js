
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


STATE_JS = {};

STATE_JS.translocationCacheNeedsUpdating = true;
STATE_JS.TRANSLOCATION_RATES = null;
STATE_JS.BACKTRACKING_RATES = null;



STATE_JS.initTranslocationRateCache = function(){
	
	
	if (!STATE_JS.translocationCacheNeedsUpdating) return;

	STATE_JS.TRANSLOCATION_RATES = STATE_JS.buildTranslocationRateTable();
	STATE_JS.BACKTRACKING_RATES = STATE_JS.buildBacktrackRateTable();

	
	
	//console.log("STATE_JS.TRANSLOCATION_RATES", STATE_JS.TRANSLOCATION_RATES);
	//console.log("STATE_JS.BACKTRACKING_RATES", STATE_JS.BACKTRACKING_RATES);
	
	
	STATE_JS.translocationCacheNeedsUpdating = false;
	
}




 STATE_JS.updateCoordsOfcurrentState = function(){


 	if (RUNNING_FROM_COMMAND_LINE) return;


	// Coordinates of pol
	var h = PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"];
	var polX = 165 + 25 * (WW_JS.currentState["rightMBase"] - h + 1);
	var polY = 81;
	WW_JS.move_obj_absolute("pol", polX, polY, 1);
	WW_JS.change_src_of_object_WW(HTMLobjects["pol"], WW_JS.currentState["activated"] ? "pol" : "pol_U"); // Activated or deactivated?



	// Coordinates of all bases
	var dy = 0;
	for (var i = 0; i < primerSequence.length; i ++){


		var ntX = 200 + 25*i;
		if (i == 0) ntX = 150;

		// Y value determined by whether it is part of hybrid, bubble or on the bottom

		var ntY = 207;
		if (i <= WW_JS.currentState["leftMBase"] &&  i > WW_JS.currentState["leftMBase"]  - (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1) && i >= 0) dy += -52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1)
		if (i > WW_JS.currentState["rightMBase"] && i < WW_JS.currentState["rightMBase"] + (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1) + 1) dy += 52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1)

		//if (SEQS_JS.all_sequences[sequenceID]["primer"] != "dsRNA") 
		//for (i = state["leftMBase"] - 1; UPDATE_COORDS &&  i > state["leftMBase"] - (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1) - 1 && i >= 0; i--) WW_JS.move_nt_WW(i, "m", 0, -52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1));


		// Is NTP bound?
		if (i == primerSequence.length-1 && WW_JS.currentState["NTPbound"]){
			ntX += 10;
			ntY += 10;
		}
		else OPS_JS.set_TP_state_WW(i, "m", false);
		
		WW_JS.move_nt_absolute_WW(i, "m", ntX, ntY + dy, 1); 


	}

	dy = 0;
	for (var i = 0; i < templateSequence.length; i ++){

		var ntX = 200 + 25*i;
		if (i == 0) ntX = 150;

		// Y value determined by whether it is part of hybrid, bubble or on the bottom

		var ntY = 78;
		if (i <= WW_JS.currentState["leftGBase"] &&  i > WW_JS.currentState["leftGBase"]  - (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1) && i >= 0) dy += 52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1)
		if (i > WW_JS.currentState["rightGBase"] && i < WW_JS.currentState["rightGBase"] + (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1) + 1) dy += -52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1)

		//if (SEQS_JS.all_sequences[sequenceID]["primer"] != "dsRNA") 
		//for (i = state["leftMBase"] - 1; UPDATE_COORDS &&  i > state["leftMBase"] - (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1) - 1 && i >= 0; i--) WW_JS.move_nt_WW(i, "m", 0, -52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1));

		 WW_JS.move_nt_absolute_WW(i, "g", ntX, ntY + dy, 1); 


		 // Orientation
		 if (i > 0 && i <= WW_JS.currentState["rightGBase"] + PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"] && i >= WW_JS.currentState["leftGBase"]) WW_JS.flip_base_WW(i, "g", "g"); 
		 else if (i > 0) WW_JS.flip_base_WW(i, "g", "m"); 

		 // Complementary strand
		 if (SEQS_JS.all_sequences[sequenceID]["template"].substring(0,2) == "ds"){
		 	ntY = 53;
		 	WW_JS.move_nt_absolute_WW(i, "o", ntX, ntY - dy/2, 1); 

		 } 


	}



	// Force beads
	PARAMS_JS.remove_force_equipment_WW();
	if (PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"] != 0) PARAMS_JS.add_force_equipment_WW(PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"]);


}



// Slippage states reset
 STATE_JS.convertCompactStateToFullState = function(compactState){
	
	//console.log("Input compact", compactState);
	
	var rightHybridBase = compactState[1] + compactState[0];
	var leftHybridBase = rightHybridBase + 1 - PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"];
	
	var fullState = { leftGBase: leftHybridBase, rightGBase: rightHybridBase, leftMBase: leftHybridBase, rightMBase: rightHybridBase, NTPtoAdd: "X",
					 mRNAPosInActiveSite: compactState[1], NTPbound: compactState[2], nbases: WW_JS.currentState["nbases"], mRNALength: compactState[0]+1, activated:compactState[3], rateOfBindingNextBase:0,
					 bulgePos: [0], bulgedBase: [-1], bulgeSize: [0], partOfBulgeID: [0], nextBaseToCopy: compactState[0]+1, terminated: false };
	
	


	//console.log("Output full", fullState);
	return fullState;
	
	
}





// Slippage states will not be encoded
 STATE_JS.convertFullStateToCompactState = function(fullState){
	
	//console.log("Input full", fullState);
	
	// Compact state = [length of nascent strand, position of activte site, bool NTP bound, bool activated]
	var compactState = [fullState["mRNALength"]-1, fullState["mRNAPosInActiveSite"], fullState["NTPbound"], fullState["activated"]];

	return compactState;
	
	
}




 STATE_JS.getTranslocationRates = function(compactState){
	
	
	var h = PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"];
	
	//console.log("State", compactState, "tables", STATE_JS.TRANSLOCATION_RATES, STATE_JS.BACKTRACKING_RATES);
	
	
	// Polymerase is not backtracked. Use regular translocation table
	if (compactState[1] > -2){
		
		
		var rowNum = compactState[0] - (h-1);
		var colNum = compactState[1] + 1;
		
		
		var rates = STATE_JS.TRANSLOCATION_RATES[rowNum][colNum];
		var forceGradient = Math.exp((-PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"] * 1e-12 * 3.4e-10) / (2 * 1.380649e-23 * 310));
		var GDagRateModifier = Math.exp(-PARAMS_JS.PHYSICAL_PARAMETERS["GDagSlide"]["val"]);

		if (rates != false) {
			return [rates[0] * GDagRateModifier * forceGradient, rates[1] * GDagRateModifier / forceGradient];
		}

		
		// Temporarily set state to inactive so it lets us backtrack
		var temp = compactState[3];
		compactState[3] = false;
		
		// If rates are not in table then add them and return them
		var thisFullState = STATE_JS.convertCompactStateToFullState(compactState);
		var slidingPeakHeights = FE_JS.update_slidingPeakHeights_WW(thisFullState, false, false);
		var slidingTroughHeights = FE_JS.update_slidingTroughHeights_WW(thisFullState, false, false);
		compactState[3] = temp;
		
		//console.log("compactState", compactState, "slidingPeakHeights", slidingPeakHeights);

		

		// Have not added in GdagSlide or Fassist yet, so need to multiply it in later
		var kbck = 0;
		var kfwd = 0;
		if (slidingPeakHeights[2] != maxHeight) kbck = Math.exp(-(slidingPeakHeights[2] - slidingTroughHeights[3])) * 1e6;
		if (slidingPeakHeights[3] != maxHeight)	kfwd = Math.exp(-(slidingPeakHeights[3] - slidingTroughHeights[3])) * 1e6;


		STATE_JS.TRANSLOCATION_RATES[rowNum][colNum] = [kbck, kfwd];

		return [kbck * GDagRateModifier * forceGradient, kfwd * GDagRateModifier / forceGradient];
		
		
		
	}
	
	
	// Polymerase is backtracked. Use backtracking table
	else{
		
		
		
		
		var rightHybridBase = compactState[1] + compactState[0];
		var leftHybridBase = rightHybridBase + 1 - h;
		var indexNum = leftHybridBase - 1;

		var rates = STATE_JS.BACKTRACKING_RATES[indexNum];
		var forceGradient = Math.exp((-PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"] * 1e-12 * 3.4e-10) / (2 * 1.380649e-23 * 310));
		var GDagRateModifier = Math.exp(-PARAMS_JS.PHYSICAL_PARAMETERS["GDagSlide"]["val"]);

		if (rates != false) {
			return [rates[0] * GDagRateModifier * forceGradient, rates[1] * GDagRateModifier / forceGradient];
		}
		
		
		// If rates are not in table then add them and return them
		var thisFullState = STATE_JS.convertCompactStateToFullState(compactState);
		var slidingPeakHeights = FE_JS.update_slidingPeakHeights_WW(thisFullState,false, false);
		var slidingTroughHeights = FE_JS.update_slidingTroughHeights_WW(thisFullState, false, false);


		// Have not added in GdagSlide or Fassist yet, so need to multiply it in later
		var kbck = 0;
		var kfwd = 0;
		if (slidingPeakHeights[2] != maxHeight) kbck = Math.exp(-(slidingPeakHeights[2] - slidingTroughHeights[3])) * 1e6;
		if (slidingPeakHeights[3] != maxHeight)	kfwd = Math.exp(-(slidingPeakHeights[3] - slidingTroughHeights[3])) * 1e6;

		STATE_JS.BACKTRACKING_RATES[indexNum] = [kbck, kfwd];

		return [kbck * GDagRateModifier * forceGradient, kfwd * GDagRateModifier / forceGradient];
	
		
		
	}
	

	
}



 STATE_JS.buildBacktrackRateTable = function(){
	
	
	// Once the polymerase has entered state -2 (ie backtracked by 2 positions) then all backtracking rates 
	// are the same per position across different nascent strand lengths. The bases added onto the nascent strand
	// which are coming out of the NTP pore don't matter. This assumption would no longer hold if we started
	// folding the 3' end of the nascent strand
	
	
	var h = PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"];
	if (WW_JS.currentState["nbases"] - h - 1 < 0) return null;
	var backtrackRates = Array(WW_JS.currentState["nbases"] - h - 1);
	
	
	for (var leftHybridBase = 1; leftHybridBase <= WW_JS.currentState["nbases"] - h - 1; leftHybridBase ++){
		var indexNum = leftHybridBase - 1;
		backtrackRates[indexNum] = false; // Will leave it empty and add values only as they are needed
	}
	
	
	return backtrackRates;
	
	
	
	
}



 STATE_JS.buildTranslocationRateTable = function(){
	

	
	// Don't calculate all at once, only calculating for active site positions 0 and 1. Simulation caches hypertranslocated rates as it goes. 
	// Most states are never sampled. Otherwise far too slow to load for n > 300
	
	// Rows are the lengths of the mRNA and cols are the position of the active site (minimum value -1, maximum value h-1). Backtracking rates are found in the backtracking table
	// Each entry is a tuple (kbck, kfwd)
	// There are n - h rows (n is total number of bases, h is hybrid length)
	// There are l + 1 entries in each row, where l is the length of the nascent strand in the row
	var h = PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"];
	var nLengths = WW_JS.currentState["nbases"] - h;
	var nPositions = h + 1; 
	
	
	if (nLengths < 0) return null;
	
	var translocationRates = Array(nLengths);
	for(var nascentLen = h-1; nascentLen <= WW_JS.currentState["nbases"]; nascentLen ++){
		
		var rowNum = nascentLen - (h-1);
		
		translocationRates[rowNum] = Array(nPositions).fill(false);

		
		for (var activeSitePos = -1; activeSitePos <= h-1; activeSitePos ++){
			
			var colNum = activeSitePos + 1;
			
			translocationRates[rowNum][colNum] = false; // Will leave it empty and add values only as they are needed

			
			
		}
		
	}
	
	
	
	

	return translocationRates;
	
	
	
	
}


 STATE_JS.forward_cWW = function(state, resolve = function() { }){
	if (!state[2]) state[1]++;
	if (state[1] > PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 1) SIM_JS.SIMULATION_VARIABLES["terminated"] = true; // Terminate if too hypertranslocated
	resolve();
}

 STATE_JS.backward_cWW = function(state, resolve = function() { }){
	if (!state[2]) state[1]--;
	resolve();
}

 STATE_JS.bindNTP_cWW = function(state, resolve = function() { }){
	if (state[3] && !state[2] && state[1] == 1) {
		state[2] = true; // Bind NTP
		WW_JS.create_nucleotide_WW("m" + (state[0]+1), "m", state[0]+1, 0, 0, SIM_JS.SIMULATION_VARIABLES["baseToAdd"] , SIM_JS.SIMULATION_VARIABLES["baseToAdd"]  + "m", true);
	}
	else if (state[3] && state[2] && state[1] == 1) { // Elongate
		state[2] = false;
		state[0]++;
		state[1] = 0;
	}
	resolve();
}

 STATE_JS.releaseNTP_cWW = function(state, resolve = function() { }){
	if (state[2]) {
		delete_nt_WW(state[0]+1, "m");
		state[2] = false;
	}
	resolve();
}

 STATE_JS.activate_cWW = function(state, resolve = function() { }){
	if (!state[3]) state[3] = true;
	resolve();
}

 STATE_JS.deactivate_cWW = function(state, resolve = function() { }){
	if (state[3] && !state[2]) state[3] = false;
	resolve();
}








if (RUNNING_FROM_COMMAND_LINE){


	module.exports = {
		translocationCacheNeedsUpdating: STATE_JS.translocationCacheNeedsUpdating,
		TRANSLOCATION_RATES: STATE_JS.TRANSLOCATION_RATES,
		BACKTRACKING_RATES: STATE_JS.BACKTRACKING_RATES,
		initTranslocationRateCache: STATE_JS.initTranslocationRateCache,
		updateCoordsOfcurrentState: STATE_JS.updateCoordsOfcurrentState,
		convertCompactStateToFullState: STATE_JS.convertCompactStateToFullState,
		convertFullStateToCompactState: STATE_JS.convertFullStateToCompactState,
		getTranslocationRates: STATE_JS.getTranslocationRates,
		buildBacktrackRateTable: STATE_JS.buildBacktrackRateTable,
		buildTranslocationRateTable: STATE_JS.buildTranslocationRateTable,
		forward_cWW: STATE_JS.forward_cWW,
		backward_cWW: STATE_JS.backward_cWW,
		bindNTP_cWW: STATE_JS.bindNTP_cWW,
		releaseNTP_cWW: STATE_JS.releaseNTP_cWW,
		activate_cWW: STATE_JS.activate_cWW,
		deactivate_cWW: STATE_JS.deactivate_cWW
	}

}



