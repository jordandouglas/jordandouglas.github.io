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


OPS_JS = {};


OPS_JS.transcribe_WW = function(nbasesToTranscribe, fastMode = false, resolve = function() {}, msgID = null){


	if (!simulating && !WW_JS.stopRunning_WW) return;


	if (resolve == null) resolve = function() {};
	
	ANIMATION_TIME = ANIMATION_TIME_TEMP;
	if (fastMode) {
		ANIMATION_TIME = 1;
	}
	WW_JS.stopRunning_WW = false;
	//update_parameters();

	var actions = [];
	

	if (!WW_JS.currentState["activated"]) actions.push(function() {  OPS_JS.activate_WW(null, true) });

	if (WW_JS.currentState["NTPbound"]) actions.push(function() {  OPS_JS.releaseNTP_WW(null, true) });

	
	for (var i = WW_JS.currentState["mRNAPosInActiveSite"]; i < 1; i ++){
		actions.push(function() {  OPS_JS.forward_WW(null, true) });
	}
	for (var i = WW_JS.currentState["mRNAPosInActiveSite"]; i > 1; i --){
		actions.push(function() {  OPS_JS.backwards_WW(null, true) });
	}
	

	for (var i = 0; i < nbasesToTranscribe; i ++){
		actions.push(function() { OPS_JS.bindNTP_WW(null, true) });
		actions.push(function() { OPS_JS.bindNTP_WW(null, true) });
		actions.push(function() { OPS_JS.activate_WW(null, true) })
		actions.push(function() { OPS_JS.forward_WW(null, true) });
	}


	OPS_JS.applyActions(actions, fastMode, resolve, msgID);
	
	


}



 OPS_JS.stutter_WW = function(nbasesToStutter, fastMode = false, resolve = function() {}, msgID = null){



	if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) == "ds") return; // Cannot stutter if nascent is double stranded

	if (!simulating && !WW_JS.stopRunning_WW) return;
	
	ANIMATION_TIME = ANIMATION_TIME_TEMP;
	if (fastMode) {
		ANIMATION_TIME = 1;
	}
	WW_JS.stopRunning_WW = false;
	//update_parameters();
	
	if (resolve == null) resolve = function() {};
	
	var actions = [];


	if (!WW_JS.currentState["activated"]) actions.push(function() {  OPS_JS.activate_WW(null, true) });
	if (WW_JS.currentState["NTPbound"]) actions.push(function() { OPS_JS.releaseNTP_WW(null, true) });
	
	for (var i = WW_JS.currentState["bulgePos"]; i < PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] && i > 0; i ++){
		actions.push(function() { OPS_JS.slip_left_WW(null, true) });
	}
	
	for (var i = WW_JS.currentState["mRNAPosInActiveSite"]; i < 0; i ++){
		actions.push(function() { OPS_JS.forward_WW(null, true) });
	}
	for (var i = WW_JS.currentState["mRNAPosInActiveSite"]; i > 0; i --){
		actions.push(function() { OPS_JS.backwards_WW(null, true) });
	}
	

	
	
	for (var i = 0; i < nbasesToStutter; i ++){

		actions.push(function() { OPS_JS.slip_left_WW(null, true) });
		actions.push(function() { OPS_JS.slip_left_WW(null, true) });
		actions.push(function() { OPS_JS.bindNTP_WW(null, true) });
		actions.push(function() { OPS_JS.bindNTP_WW(null, true) });

		for (var j = 0; j < PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 3; j ++) actions.push(function() { OPS_JS.slip_left_WW(null, true) });
	}


	OPS_JS.applyActions(actions, fastMode, resolve, msgID);


}






OPS_JS.applyActions = function(actions, fastMode, resolve, msgID){


	ANIMATION_TIME = ANIMATION_TIME_TEMP;

	//console.log(ANIMATION_TIME, "WW_JS.currentState", WW_JS.currentState, "actions", actions);
	
	
	if (actions.length == 0 || WW_JS.stopRunning_WW || WW_JS.currentState["terminated"]){


		if (!simulating) WW_JS.stopRunning_WW = true;

		ANIMATION_TIME = 200;

		// When we are done we send back the message/apply the resolve function
		if (msgID != null){
			postMessage(msgID + "~X~" + "done" );
		}

		resolve();
		

		return;
	}
	
	action = actions.shift();
	var successfulOp = action();


	// If this is in animation mode, then this process is synchronous with rendering so we return in between operators
	// This block of code below will only work if this is not a WebWorker. 
	if (!fastMode && !WW_JS.isWebWorker && !RUNNING_FROM_COMMAND_LINE && ANIMATION_TIME > 1){
		
		var toCall = () => new Promise((resolve) => renderObjects(false, resolve));
		toCall().then(() => {
			$("#bases").children().promise().done(function(){
				WW_JS.setNextBaseToAdd_WW();
				OPS_JS.applyActions(actions, fastMode, resolve, msgID);
			});
		});

	}

	// Same as above but for webworker only
	else if (!fastMode && WW_JS.isWebWorker && ANIMATION_TIME > 1){
		setTimeout(function(){
			OPS_JS.applyActions(actions, fastMode, resolve, msgID);
		}, ANIMATION_TIME);
	}

	// If it is in asynchronous or hidden mode or running from command line, then we keep going until the end
	else{
		OPS_JS.applyActions(actions, fastMode, resolve, msgID);
	}

	/*

	// Instant updates
	if (ANIMATION_TIME == 1){
		prepareForNextAction(actions);
	}

	// Slow animation
	else{
		window.requestAnimationFrame(function(){
			$("#bases").children().promise().done(function() {
				prepareForNextAction(actions);
			});
		});
	}
	*/
	
	
}







// Update the state variables associated with moving the polymerase forward
OPS_JS.forward_WW = function(state = null, UPDATE_COORDS, resolve = function(_DOMupdates) { }, msgID = null){

	//if (state == null) console.log("OPS_JS.forward_WW");
	
	if (state == null) state = WW_JS.currentState;

	var successfulOp = false;
	var DOMupdates = {where_to_create_new_slipping_landscape: [], landscapes_to_reset: [], landscapes_to_delete: []};


	//console.log("Translocation seq", primerSequence);

	//if (state["mRNAPosInActiveSite"] >= 7 || state["rightGBase"] >= nbases - 1) return false;

	// Move the polymerase
	if (UPDATE_COORDS) WW_JS.move_obj_from_id_WW("pol", 25, 0);
	

	// If bulge will move too far to the left then absorb it
	for (var s = 0; state["partOfBulgeID"][s] == s && s < state["bulgePos"].length; s++){
		if (state["bulgePos"][s] > 0 && state["bulgePos"][s] == PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 1) OPS_JS.absorb_WW(state, UPDATE_COORDS, s, false, true, DOMupdates);
		if (state["bulgePos"][s] > 0) state["bulgePos"][s]++;
	}
	
	//if (TbulgePos == PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 1) absorb_T(false);
	//if (TbulgePos > 0) TbulgePos++;


	// Move genome bases
	if (UPDATE_COORDS){
		var shiftMutBaseBy = -52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1);
		//if (templateSequence[state["leftGBase"] - (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1) + 1] != null && templateSequence[state["leftGBase"] - (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1) + 1]["mut"] != null) shiftMutBaseBy += 15; 
		for (i = state["leftGBase"]; i > state["leftGBase"] - (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1) && i >= 0; i--) {
			if (templateSequence[i] == null) break;
			if (i == state["leftGBase"] - (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1) + 1){
				if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) != "ds") WW_JS.move_nt_WW(i, "g", 0, shiftMutBaseBy);
				if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) != "ds") WW_JS.move_nt_WW(i, "o", 0, -shiftMutBaseBy/2);
			}
			else {
				if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) != "ds") WW_JS.move_nt_WW(i, "g", 0, -52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1));
				if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) != "ds") WW_JS.move_nt_WW(i, "o", 0, +26/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1));
			}
		
			if (i > 0 && SEQS_JS.all_sequences[sequenceID]["template"].substring(0,2) == "ds") {
				if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) != "ds") WW_JS.flip_base_WW(i, "g", "m"); 
				
			}
		}
	

		shiftMutBaseBy = 52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1);

		//if (templateSequence[state["rightGBase"] + (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1)] != null && templateSequence[state["rightGBase"] + (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1)]["mut"] != null) shiftMutBaseBy -= 15; 
		for (i = state["rightGBase"] + 1; i < state["rightGBase"] + (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1) + 1; i++) {
			if (templateSequence[i] == null) break;

			if (i == state["rightGBase"] + (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1)) {
				WW_JS.move_nt_WW(i, "g", 0, shiftMutBaseBy);
				WW_JS.move_nt_WW(i, "o", 0, -shiftMutBaseBy/2);
			}
			else {
				WW_JS.move_nt_WW(i, "g", 0, +52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1));
				WW_JS.move_nt_WW(i, "o", 0, -26/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1));
			}
		
			if (i > 0 && SEQS_JS.all_sequences[sequenceID]["template"].substring(0,2) == "ds") {
				WW_JS.flip_base_WW(i, "g", "g"); 
				if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) == "ds") WW_JS.flip_base_WW(i, "o", "m"); 
			}
		}
	}
	
	
	state["leftGBase"] ++;
	state["rightGBase"] ++;
	


	// Move mRNA bases
	if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) != "ds") for (i = state["leftMBase"]; UPDATE_COORDS && i > state["leftMBase"] - (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1) && i >= 0; i--) WW_JS.move_nt_WW(i, "m", 0, +52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1));
	for (i = state["rightMBase"] + 1; UPDATE_COORDS && i < state["rightMBase"] + (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1) + 1; i++) WW_JS.move_nt_WW(i, "m", 0, -52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1));
	
	state["leftMBase"] ++;
	state["rightMBase"] ++;
	

	// Remove NTP if single-binding site model, or if double-binding site model and transition is NOT from 0 to 1
	if (state["NTPbound"]){
		if (! (FE_JS.currentElongationModel == "twoSiteBrownian" && state["mRNAPosInActiveSite"] == 0)){
			if (UPDATE_COORDS) delete_nt_WW(state["mRNALength"], "m");
			state["NTPbound"] = false;
		}else{
			if (UPDATE_COORDS){
				WW_JS.move_nt_WW(state["mRNALength"], "m", 0, 52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1))
			}
		}
	}


	
	// If pol moves into special site then change its picture
	if (nucleoproteinPhase == -1 && UPDATE_COORDS && state["rightGBase"] == specialSite-1){
		//TODO: pause state image  polMol = document.getElementById('pol');
		//polMol.setAttribute('src', "src/Images/polS.png");
	}
	else if (nucleoproteinPhase == -1 && UPDATE_COORDS && state["rightGBase"] == specialSite){
		//polMol = document.getElementById('pol');
		//polMol.setAttribute('src', "src/Images/pol.png");
	}
	
	
	
	// Dislocate a nucleoprotein
	if (UPDATE_COORDS && nucleoproteinPhase != -1){
		//console.log(state["rightGBase"] + templateEntryChannelLength, (state["rightGBase"] + templateEntryChannelLength) % 6, nucleoproteinPhase, state["rightGBase"] + templateEntryChannelLength % 6 - nucleoproteinPhase);
		if ((state["rightGBase"] + templateEntryChannelLength - 2 + nucleoproteinPhase) % 6 == 0){
			var NTPoMoveUp = Math.ceil((state["rightGBase"] + templateEntryChannelLength + nucleoproteinPhase) / 6);
			if (nucleoproteinPhase == 6) NTPoMoveUp++;
			WW_JS.move_obj_from_id_WW("NP" + NTPoMoveUp, 0, -50)
		}
		
		if ((state["leftGBase"] - templateExitChannelLength - 2 + nucleoproteinPhase) % 6 == 0){
			var NTPoMoveDown = Math.ceil((state["leftGBase"] - templateExitChannelLength - nucleoproteinPhase) / 6);
			if (nucleoproteinPhase > 3) NTPoMoveDown++;
			WW_JS.move_obj_from_id_WW("NP" + NTPoMoveDown, 0, 50)
		}
	
	}

	
	
	// If we are now terminated, then send the mRNA out of the exit channel (irreversibly). 
	var totalBulgeSize = 0;
	for (var s = 0; s < state["bulgeSize"].length; s++) totalBulgeSize += state["bulgeSize"][s];
	if (UPDATE_COORDS && state["leftMBase"] >= state["mRNALength"] - totalBulgeSize) OPS_JS.terminate_WW();
	
	
	state["mRNAPosInActiveSite"]++;
	
			
		
	// Move bead to the right
	if (UPDATE_COORDS && PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"] != 0){
		WW_JS.move_obj_from_id_WW("rightBead", 25, 0);
		WW_JS.move_obj_from_id_WW("tweezer", 25, 0);
		WW_JS.move_obj_from_id_WW("forceArrow1", 25, 0);
		WW_JS.move_obj_from_id_WW("forceArrow2", 25, 0);
	}
		

	successfulOp = true;

	DOMupdates["successfulOp"] = successfulOp;
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(DOMupdates) );
	}else{
		resolve(DOMupdates);
	}

	return successfulOp;

}



// Update the state variables associated with moving the polymerase backwards
 OPS_JS.backwards_WW = function(state = null, UPDATE_COORDS, resolve = function(_DOMupdates) { }, msgID = null){


	//if (state == null) console.log("OPS_JS.backwards_WW");

	if (state == null) state = WW_JS.currentState;

	var successfulOp = false;
	var DOMupdates = {where_to_create_new_slipping_landscape: [], landscapes_to_reset: [], landscapes_to_delete: []};

	if (state["leftGBase"] > 1 && state["leftGBase"] - PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"] -1 > 2){


		// If bulge will move too far to the left then absorb it
		for (var s = 0; state["partOfBulgeID"][s] == s && s < state["bulgePos"].length; s++){

			
			if (state["bulgedBase"][s] == state["rightMBase"] - 1) OPS_JS.absorb_WW(state, UPDATE_COORDS, s, true, true, DOMupdates);
			if (state["bulgePos"][s] > 0) state["bulgePos"][s]--;
			
		}
		
		//if (TbulgePos == 1) absorb_T(true);
		//if (TbulgePos > 0) TbulgePos--;

		// Move the polymerase
		if (UPDATE_COORDS) WW_JS.move_obj_from_id_WW("pol", -25, 0);

		// Move genome bases
		if (UPDATE_COORDS){
			
			var shiftMutBaseBy = 52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1);

			//if (templateSequence[state["leftGBase"] - (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1)] != null && templateSequence[state["leftGBase"] - (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1)]["mut"] != null) shiftMutBaseBy -= 15; 
			for (i = state["leftGBase"] - 1; i > state["leftGBase"] - (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1) - 1 && i >= 0; i--) {
				if (templateSequence[i] == null) break;

				if (i == state["leftGBase"] - (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1)) {
					if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) != "ds") WW_JS.move_nt_WW(i, "g", 0, shiftMutBaseBy);
					if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) != "ds") WW_JS.move_nt_WW(i, "o", 0, -shiftMutBaseBy/2);
				}
				else {
					if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) != "ds") WW_JS.move_nt_WW(i, "g", 0, +52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1));
					if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) != "ds") WW_JS.move_nt_WW(i, "o", 0, -26/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1));
				}
					
		
				if (i > 0 && SEQS_JS.all_sequences[sequenceID]["template"].substring(0,2) == "ds") {
					if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) != "ds") WW_JS.flip_base_WW(i, "g", "g"); 
				}
			}
		
		
			
			shiftMutBaseBy = -52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1);
			//if (templateSequence[state["rightGBase"] + (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1) - 1] != null && templateSequence[state["rightGBase"] + (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1) - 1]["mut"] != null) shiftMutBaseBy += 15; 
			for (i = state["rightGBase"]; i < state["rightGBase"] + (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1); i++) {
				if (templateSequence[i] == null) break;

				if (i == state["rightGBase"] + (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1) - 1) {
					WW_JS.move_nt_WW(i, "g", 0, shiftMutBaseBy);
					WW_JS.move_nt_WW(i, "o", 0, -shiftMutBaseBy/2);
				}
				else {
					WW_JS.move_nt_WW(i, "g", 0, -52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1));
					WW_JS.move_nt_WW(i, "o", 0, +26/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1));
				}
		
				if (i > 0 && SEQS_JS.all_sequences[sequenceID]["template"].substring(0,2) == "ds") {
					WW_JS.flip_base_WW(i, "g", "m"); 
					if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) == "ds") WW_JS.flip_base_WW(i, "o", "g"); 
				}
			}
		
		}

		state["leftGBase"] --;
		state["rightGBase"] --;

		// Move mRNA bases
		if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) != "ds") for (i = state["leftMBase"] - 1; UPDATE_COORDS &&  i > state["leftMBase"] - (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1) - 1 && i >= 0; i--) WW_JS.move_nt_WW(i, "m", 0, -52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1));
		for (i = state["rightMBase"]; UPDATE_COORDS && i < state["rightMBase"] + (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1); i++) WW_JS.move_nt_WW(i, "m", 0, +52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1));
		state["leftMBase"] --;
		state["rightMBase"] --;



		// Remove NTP if single-binding site model, or if double-binding site model and transition is NOT from 1 to 0
		if (state["NTPbound"]){
			if (!(FE_JS.currentElongationModel == "twoSiteBrownian" && state["mRNAPosInActiveSite"] == 1)){
				if (UPDATE_COORDS) delete_nt_WW(state["mRNALength"], "m");
				state["NTPbound"] = false;
			}else{
				if (UPDATE_COORDS){
					WW_JS.move_nt_WW(state["mRNALength"], "m", 0, -52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1))
				}
			}
		}
		
		
		
		// If pol moves into special site then change its picture
		if (nucleoproteinPhase == -1 && UPDATE_COORDS && state["rightGBase"] == specialSite-1){
			//TODO: polMol = document.getElementById('pol');
			//polMol.setAttribute('src', "src/Images/polS.png");
		}
		else if (nucleoproteinPhase == -1 && UPDATE_COORDS && state["rightGBase"] == specialSite-2){
			//polMol = document.getElementById('pol');
			//polMol.setAttribute('src', "src/Images/pol.png");
		}
		state["mRNAPosInActiveSite"]--;
		
		
		
			
		// Dislocate a nucleoprotein
		if (UPDATE_COORDS && nucleoproteinPhase != -1){
			//console.log(state["rightGBase"] + templateEntryChannelLength, (state["rightGBase"] + templateEntryChannelLength) % 6, nucleoproteinPhase, state["rightGBase"] + templateEntryChannelLength % 6 - nucleoproteinPhase);
			if ((state["rightGBase"] + 1 + templateEntryChannelLength - 2 + nucleoproteinPhase) % 6 == 0){
				var NPToMoveUp = Math.ceil((state["rightGBase"] + templateEntryChannelLength + nucleoproteinPhase) / 6);
				if (nucleoproteinPhase == 6) NPToMoveUp++;
				WW_JS.move_obj_from_id_WW("NP" + NPToMoveUp, 0, 50)
			}
			
			if ((state["leftGBase"] + 1 - templateExitChannelLength - 2 + nucleoproteinPhase) % 6 == 0){
				var NPToMoveDown = Math.ceil((state["leftGBase"] - templateExitChannelLength - nucleoproteinPhase) / 6);
				if (nucleoproteinPhase > 3) NPToMoveDown++;
				WW_JS.move_obj_from_id_WW("NP" + NPToMoveDown, 0, -50)
			}

		}
		
		
		// Move bead to the left
		if (UPDATE_COORDS && PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"] != 0){
			WW_JS.move_obj_from_id_WW("rightBead", -25, 0);
			WW_JS.move_obj_from_id_WW("tweezer", -25, 0);
			WW_JS.move_obj_from_id_WW("forceArrow1", -25, 0);
			WW_JS.move_obj_from_id_WW("forceArrow2", -25, 0);
		}
		

		successfulOp = true;
		

	}

	DOMupdates["successfulOp"] = successfulOp;
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(DOMupdates) );
	}else{
		resolve(DOMupdates);
	}


	return successfulOp;


}



OPS_JS.terminate_WW = function(){

	if (WW_JS.currentState["terminated"]) return;
	WW_JS.currentState["terminated"] = true;

	var primerSeq = "";
	var insertPositions = [];
	for (var i = 1; i <= primerSequence.length - 1; i ++) {
		if (primerSequence[i] == null) continue;
		primerSeq += primerSequence[i]["base"];
		//if(primerSequence[i]["copiedFrom"] != i - insertPositions.length) insertPositions.push(i);
	}


	if (WW_JS.isWebWorker && !RUNNING_FROM_COMMAND_LINE && !ABC_JS.ABC_simulating){
		postMessage("_renderTermination(" + JSON.stringify({primerSeq: primerSeq, insertPositions: insertPositions}) + ")" );
	}else if(!RUNNING_FROM_COMMAND_LINE && !ABC_JS.ABC_simulating){
		renderTermination({primerSeq: primerSeq, insertPositions: insertPositions});
	}

	for (var i = 1; i <= primerSequence.length - 1; i ++){
		delete_nt_WW(i, "m");
	}



	
}


 OPS_JS.bindNTP_WW = function(state = null, UPDATE_COORDS, resolve = function() { }, msgID = null){
	

	//if (state == null) console.log("OPS_JS.bindNTP_WW");

	if (state == null) state = WW_JS.currentState;


	var successfulOp = false;
	var NTPbindingSite1Open = state["mRNAPosInActiveSite"] == 1 && !state["NTPbound"];
	var NTPbindingSite2Open = FE_JS.currentElongationModel == "twoSiteBrownian" && state["mRNAPosInActiveSite"] == 0 && !state["NTPbound"] && templateSequence[state["rightGBase"]+1] != null; // Secondary binding site

	if (state["activated"] && (NTPbindingSite1Open || NTPbindingSite2Open) && !state["terminated"] && state["rightGBase"] < templateSequence.length){

		
		var xCoord = NTPbindingSite1Open ? templateSequence[state["rightGBase"]]["x"] + 10 : templateSequence[state["rightGBase"]+1]["x"] + 10;
		var yCoord = 165;
		if (UPDATE_COORDS) {
			WW_JS.create_nucleotide_WW("m" + state["mRNALength"], "m", state["mRNALength"], xCoord, yCoord, state["NTPtoAdd"], state["NTPtoAdd"] + "m", true);
			WW_JS.setPrimerSequenceBaseParent(state["mRNALength"], state["rightGBase"]);
		}
		
		state["NTPbound"] = true;
		successfulOp = true;
		
	}

	else if (state["NTPbound"] && state["mRNAPosInActiveSite"] == 1) return OPS_JS.elongate_WW(state, UPDATE_COORDS, resolve, msgID);


	if (msgID != null){
		postMessage(msgID + "~X~" + "done" );
	}else{
		resolve(true);
	}

	return successfulOp;
	
}


 OPS_JS.releaseNTP_WW = function(state = null, UPDATE_COORDS, resolve = function() { }, msgID = null){

	//if (state == null) console.log("OPS_JS.releaseNTP_WW");

	if (state == null) state = WW_JS.currentState;

	var successfulOp = false;
	if (state["NTPbound"] && !state["terminated"]){


		//Remove the nucleotide and the triphosphate
		if (UPDATE_COORDS) delete_nt_WW(state["mRNALength"], "m");
		state["NTPbound"] = false;
		successfulOp = true;
		
	}else 

	return OPS_JS.decay_WW(state, UPDATE_COORDS, resolve, msgID);



	if (msgID != null){
		postMessage(msgID + "~X~" + "done" );
	}else{
		resolve(true);
	}

	return successfulOp;
	
}

OPS_JS.set_TP_state_WW = function(pos, seq, addTP){

	var nt = null;
	if (seq == "m") nt = primerSequence[pos];
	else if (seq == "g") nt = templateSequence[pos];
	else if (seq == "o") nt = complementSequence[pos];
	if (nt == null) return;



	if (nt["hasTP"] != addTP && !nt["needsGenerating"] && !nt["needsAnimating"]  && !nt["needsSourceUpdate"] && !nt["needsDeleting"]) {
		nt["needsAnimating"] = true;
		unrenderedObjects.push(nt);
	}



	nt["hasTP"] = addTP


}

 OPS_JS.elongate_WW = function(state = null, UPDATE_COORDS, resolve = function() { }, msgID = null){



	if (state == null) state = WW_JS.currentState;

	var successfulOp = false;
 	if (state["activated"] && state["NTPbound"] && state["mRNAPosInActiveSite"] == 1 && !state["terminated"]){

		if(UPDATE_COORDS){
			 WW_JS.move_nt_WW(state["mRNALength"], "m", -10, -10)
			 OPS_JS.set_TP_state_WW(state["mRNALength"], "m", false);
		}

		state["mRNALength"]++;
		state["mRNAPosInActiveSite"] = 0;
		state["NTPbound"] = false;
		state["nextBaseToCopy"]++;

		if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) == "ds") PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"]++;


		// Deactivate upon misincorporation if the model demands it
		if (FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["deactivateUponMisincorporation"]){

			var baseJustCopied = templateSequence[WW_JS.currentState["rightGBase"]]["base"];
			var baseJustAdded = primerSequence[WW_JS.currentState["rightMBase"]]["base"];
			if(correctPairs["" + baseJustCopied + baseJustAdded] == null) OPS_JS.deactivate_WW(state, UPDATE_COORDS);
		}

		WW_JS.setNextBaseToAdd_WW();
		successfulOp = true;



	}
	
	if (msgID != null){
		postMessage(msgID + "~X~" + "done" );
	}else{
		resolve(true);
	}

	return successfulOp;

}

OPS_JS.decay_WW = function(state = null, UPDATE_COORDS, resolve = function() { }, msgID = null){


	if (state == null) state = WW_JS.currentState;
	var successfulOp = false;


	if (state["activated"] && !state["NTPbound"] && state["mRNALength"] > PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] && state["mRNAPosInActiveSite"] == 0 && !state["terminated"]){


		// Add the triphosphate
		if (UPDATE_COORDS){
			OPS_JS.set_TP_state_WW(state["mRNALength"]-1, "m", true);
			WW_JS.move_nt_WW(state["mRNALength"]-1, "m", 10, 10)


		}
		state["mRNALength"] --;
		state["mRNAPosInActiveSite"] = 1;
		state["NTPbound"] = true;
		state["nextBaseToCopy"] --;

		if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) == "ds") PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"]--;
		
		WW_JS.setNextBaseToAdd_WW();

		successfulOp = true;
	}
	
	if (msgID != null){
		postMessage(msgID + "~X~" + "done" );
	}else{
		resolve(true);
	}

	return successfulOp;

}



OPS_JS.activate_WW = function(state = null, UPDATE_COORDS, resolve = function() { }, msgID = null){


	if (state == null) state = WW_JS.currentState;
	var successfulOp = false;
	if (!state["activated"]){
		

		state["activated"] = true;
		
		
		// Change the pol picture back to the default pol
		if (UPDATE_COORDS){

			var pol = HTMLobjects["pol"];
			var newSrc = pol["src"].split("_")[0];
			if (newSrc != null) WW_JS.change_src_of_object_WW(pol, newSrc);
			WW_JS.move_obj_from_id_WW("pol", 0, 0);
			
		}

		successfulOp = true;

	}

	if (msgID != null){
		postMessage(msgID + "~X~" + "done" );
	}else{
		resolve(true);
	}

	return successfulOp;
	
	
}

OPS_JS.deactivate_WW = function(state = null, UPDATE_COORDS, resolve = function() { }, msgID = null){


	if (state == null) state = WW_JS.currentState;
	var successfulOp = false;


	if (state["activated"] && !state["NTPbound"]){

		state["activated"] = false;
		//if (state["NTPbound"]) OPS_JS.releaseNTP_WW(state, UPDATE_COORDS); // This gives a very different model when kRelease is low
		state["NTPbound"] = false;
		
		
		// Change the pol picture to the paused one
		if (UPDATE_COORDS){

			var pol = HTMLobjects["pol"];
			var newSrc = pol["src"] + "_U";
			if (newSrc != null) WW_JS.change_src_of_object_WW(pol, newSrc);
			WW_JS.move_obj_from_id_WW("pol", 0, 0);
			
		}

		successfulOp = true;

	}

	if (msgID != null){
		postMessage(msgID + "~X~" + "done" );
	}else{
		resolve(true);
	}

	return successfulOp;
	
}



OPS_JS.slip_left_WW = function(state = null, UPDATE_COORDS, S = 0, resolve = function(x) { }, msgID = null){


	if (state == null) state = WW_JS.currentState;

	var DOMupdates = {where_to_create_new_slipping_landscape: [], landscapes_to_reset: [], landscapes_to_delete: []};


	if (!state["terminated"] && !(PARAMS_JS.PHYSICAL_PARAMETERS["allowMultipleBulges"]["val"] &&  state["partOfBulgeID"][S] != S && state["bulgePos"][ state["partOfBulgeID"][S] ] == PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 1)) {
		


		// If this is part of a larger bulge, then split one base off to the left and leave the rest as it is (fissure). Do Not Return. It will be followed up by a 2nd operation.
		if (PARAMS_JS.PHYSICAL_PARAMETERS["allowMultipleBulges"]["val"] && state["bulgePos"][S] != PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 1 && state["partOfBulgeID"][S] != S) {
			OPS_JS.fissureBulgeLeft_WW(state, UPDATE_COORDS, S, DOMupdates);
		}
		

		var fuseWith = state["bulgePos"].indexOf(Math.max(state["mRNAPosInActiveSite"] + 1, 1));
		if (fuseWith == -1)	fuseWith = state["bulgePos"].indexOf(Math.max(state["mRNAPosInActiveSite"] + 2, 2));


		// If there is another bulge 1 to the left then we fuse the two together
		if (PARAMS_JS.PHYSICAL_PARAMETERS["allowMultipleBulges"]["val"] && state["bulgePos"][S] > 0 && state["bulgePos"].indexOf(state["bulgePos"][S] + 1) != -1) OPS_JS.fuseBulgeLeft_WW(state, UPDATE_COORDS, S, DOMupdates);
		else if (PARAMS_JS.PHYSICAL_PARAMETERS["allowMultipleBulges"]["val"] && state["bulgePos"][S] == 0 && fuseWith != -1) OPS_JS.fuseBulgeLeft_WW(state, UPDATE_COORDS, S, DOMupdates);
		else if (state["bulgePos"][S] > 0 && state["bulgePos"][S] < PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 1) OPS_JS.diffuse_left_WW(state, UPDATE_COORDS, S, DOMupdates);
		else if (!state["NTPbound"] && state["bulgePos"][S] == 0 && state["mRNAPosInActiveSite"] < PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 2) OPS_JS.form_bulge_WW(state, UPDATE_COORDS, S, true, DOMupdates)
		else if (state["bulgePos"][S] != 0 && state["bulgePos"][S] == PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 1) OPS_JS.absorb_WW(state, UPDATE_COORDS, S, false, false, DOMupdates);



	}


	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(DOMupdates));
	}else{
		resolve(DOMupdates);
	}




}






OPS_JS.slip_right_WW = function(state = null, UPDATE_COORDS, S = 0, resolve = function(x) { }, msgID = null){


	if (state == null) state = WW_JS.currentState;

	var DOMupdates = {where_to_create_new_slipping_landscape: [], landscapes_to_reset: [], landscapes_to_delete: []};


	var allowBulgeToFormRight = true;//UPDATE_COORDS;

	if (!state["terminated"] && !(PARAMS_JS.PHYSICAL_PARAMETERS["allowMultipleBulges"]["val"] && state["partOfBulgeID"][S] != S && state["bulgePos"][ state["partOfBulgeID"][S] ] - Math.max(0, state["mRNAPosInActiveSite"]) == 1)) {
		

		// Absorb bulge
		if (!state["NTPbound"] && state["partOfBulgeID"][S] == S && state["bulgePos"][S] - Math.max(0, state["mRNAPosInActiveSite"]) == 1) callBackFn = OPS_JS.absorb_WW(state, UPDATE_COORDS, S, true, false, DOMupdates);

		else{
		
			// If this is part of a larger bulge, then split one base off to the right and leave the rest as it is (fissure). Do Not Return. It will be followed up by a 2nd operation.
			if (PARAMS_JS.PHYSICAL_PARAMETERS["allowMultipleBulges"]["val"] && state["bulgePos"][S] - Math.max(0, state["mRNAPosInActiveSite"]) != 1 && state["partOfBulgeID"][S] != S) {
				OPS_JS.fissureBulgeRight_WW(state, UPDATE_COORDS, S, DOMupdates);
			}
			
			
			var canFuseWith = state["bulgePos"].indexOf(PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 1);
			if (canFuseWith == -1)	canFuseWith = state["bulgePos"].indexOf(PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 2);
			

			// If there is another bulge 1 to the right then we fuse the two together
			if (PARAMS_JS.PHYSICAL_PARAMETERS["allowMultipleBulges"]["val"] &&  state["bulgePos"][S] > 0 && state["bulgePos"].indexOf(state["bulgePos"][S] - 1) != -1) OPS_JS.fuseBulgeRight_WW(state, UPDATE_COORDS, S, DOMupdates);
			else if (allowBulgeToFormRight && state["leftMBase"] > 1 && PARAMS_JS.PHYSICAL_PARAMETERS["allowMultipleBulges"]["val"] && state["bulgePos"][S] == 0 && canFuseWith != -1 && state["bulgePos"].indexOf( state["bulgePos"][canFuseWith] - 1) != -1)OPS_JS.fuseBulgeRight_WW(state, UPDATE_COORDS, S, DOMupdates);
			else if (state["bulgePos"][S] < PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] && state["bulgePos"][S] > 1 && state["bulgePos"][S] - Math.max(0, state["mRNAPosInActiveSite"]) != 1) OPS_JS.diffuse_right_WW(state, UPDATE_COORDS, S, DOMupdates);
			else if (allowBulgeToFormRight && state["bulgePos"][S] == 0 && state["leftMBase"] > 1) OPS_JS.form_bulge_WW(state, UPDATE_COORDS, S, false, DOMupdates);
		}

	}


	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(DOMupdates));
	}else{
		resolve(DOMupdates);
	}




}

	
OPS_JS.form_bulge_WW = function(state = null, UPDATE_COORDS, S = 0, form_left = true, DOMupdates){


	if (state == null) state = WW_JS.currentState;

	//console.log("forming", state, S);
	if (form_left && !state["NTPbound"] &&  state["bulgePos"][S] == 0 && state["mRNAPosInActiveSite"] < PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 2){
		

		// Move 2nd last base to between the 2nd and 3rd to last positions, and last base into 2nd last position
		if (state["NTPbound"]){
			if (UPDATE_COORDS) WW_JS.delete_HTMLobj_WW("m" + state["mRNALength"]);
			if (UPDATE_COORDS) delete_TP(state["mRNALength"], "m");
			state["NTPbound"] = false;
		}


		state["bulgedBase"][S] = state["rightMBase"];
		if (state["mRNAPosInActiveSite"] >= 0) {
			state["bulgedBase"][S] -= state["mRNAPosInActiveSite"] + 1;
			state["bulgePos"][S] = 2 + state["mRNAPosInActiveSite"];
		}

		if (state["mRNAPosInActiveSite"] < 0){
			state["bulgePos"][S] = 1;
		}
		
		state["bulgeSize"][S] = 1;


		var leftBoundary = state["bulgedBase"][S] - state["bulgeSize"][S];
		if (UPDATE_COORDS) WW_JS.position_bulge_WW(leftBoundary, primerSequence[leftBoundary]["x"], 1);
		
		for (i = state["bulgedBase"][S] + 2; UPDATE_COORDS && i < state["mRNALength"]; i ++){
			if (i > state["rightMBase"] && i-state["rightMBase"] <= (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1)) WW_JS.move_nt_WW(i, "m", -25, -52/(1+PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]));
			else WW_JS.move_nt_WW(i, "m", -25, 0);
		}
		

		
		state["rightMBase"]++;
		state["mRNAPosInActiveSite"]++;
		
		state["nextBaseToCopy"] --;
		if (UPDATE_COORDS) WW_JS.setNextBaseToAdd_WW();


		if (PARAMS_JS.PHYSICAL_PARAMETERS["allowMultipleBulges"]["val"]) {
			var graphID = OPS_JS.create_new_slipping_params_WW(state);
			DOMupdates["where_to_create_new_slipping_landscape"].push(graphID);
		}
		

		return true;

		
	}
	
	else if (!form_left && state["mRNAPosInActiveSite"] <= 5 && state["bulgePos"][S] == 0 && state["leftMBase"] > 1) {
		

		state["bulgedBase"][S] = SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) == "ss" ? state["leftMBase"] : 2;
		state["bulgeSize"][S] = 1;



		var leftBoundary = state["bulgedBase"][S] - 1;
		if (UPDATE_COORDS) WW_JS.position_bulge_WW(leftBoundary, primerSequence[state["bulgedBase"][S]]["x"], 1);
		if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) == "ss"){
			for (i = state["bulgedBase"][S] - 2; UPDATE_COORDS && i >= 0; i --){
				if (state["bulgedBase"][S]-i <= PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1) WW_JS.move_nt_WW(i, "m", 25, -52/(1+PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]));
				else WW_JS.move_nt_WW(i, "m", 25, 0);
			}
		}else{
			WW_JS.move_nt_WW(0, "m", 25, 0);
			PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"]--;
		}

		state["bulgePos"][S] = PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 1;
		state["leftMBase"] --;

		if (PARAMS_JS.PHYSICAL_PARAMETERS["allowMultipleBulges"]["val"]) {
			var graphID = OPS_JS.create_new_slipping_params_WW(state);
			DOMupdates["where_to_create_new_slipping_landscape"].push(graphID);
		}
		

		return true;
	}
	


	return false;


}



OPS_JS.diffuse_left_WW = function(state = null, UPDATE_COORDS, S = 0, DOMupdates){


	if (state == null) state = WW_JS.currentState;


	//console.log("diff left", state, S);
	if (state["bulgePos"][S] > 0 && state["bulgePos"][S] < PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 1){
		
	    var leftBoundary = state["bulgedBase"][S] - state["bulgeSize"][S] - 1;
		if (UPDATE_COORDS) WW_JS.position_bulge_WW(leftBoundary, primerSequence[leftBoundary]["x"], state["bulgeSize"][S]);

		state["bulgePos"][S] ++;
		state["bulgedBase"][S] --;

		return true;
		
	}
	
	
	return false;

}



 OPS_JS.diffuse_right_WW = function(state = null, UPDATE_COORDS, S = 0, DOMupdates){


	if (state == null) state = WW_JS.currentState;

	if (state["bulgePos"][S] < PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] && state["bulgePos"][S] > 1 && state["bulgePos"][S] - Math.max(0, state["mRNAPosInActiveSite"]) != 1){



		state["bulgePos"][S] --;
		state["bulgedBase"][S] ++;
		
		var leftBoundary = state["bulgedBase"][S] - state["bulgeSize"][S];
		if (UPDATE_COORDS) WW_JS.position_bulge_WW(leftBoundary, primerSequence[leftBoundary + state["bulgeSize"][S]]["x"], state["bulgeSize"][S]);

		if (state["NTPbound"] && state["bulgePos"][S] == 1){
			if (UPDATE_COORDS) WW_JS.delete_HTMLobj_WW("m" + state["mRNALength"]);
			if (UPDATE_COORDS) delete_TP(state["mRNALength"], "m");
			state["NTPbound"] = false;
		}
		

		return true;

	}
	
	return false;

}






 OPS_JS.absorb_WW = function(state = null, UPDATE_COORDS, S = 0, absorb_right = false, destroy_entire_bulge = false, DOMupdates){

	//console.log("absorbing", state, S);

	if (!absorb_right && state["bulgeSize"][S] > 0 && state["bulgePos"][S] == PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 1){
		
		


		state["leftMBase"] ++;
		var leftBoundary = state["bulgedBase"][S] - state["bulgeSize"][S] + 1;
		if (UPDATE_COORDS) WW_JS.position_bulge_WW(leftBoundary, primerSequence[leftBoundary-1]["x"], state["bulgeSize"][S]-1);

		if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) == "ss"){
			for (i = state["leftMBase"] - 1; UPDATE_COORDS && i >= 0; i --){
				if (state["leftMBase"] - i <= (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1)) WW_JS.move_nt_WW(i, "m", -25, 52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1));
				else WW_JS.move_nt_WW(i, "m", -25, 0);
			}		
		}else{
			WW_JS.move_nt_WW(1, "m", -25, 0);
			WW_JS.move_nt_WW(0, "m", -25, 0);
			PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"]++;
		}

		state["bulgeSize"][S] --;
		if (state["bulgeSize"][S] == 0){
			if (state["bulgePos"].indexOf(0) != -1)	{
				var toDelete = OPS_JS.delete_slipping_params_WW(state, S); // If there is already a form/absorb landscape then we can delete this one
				DOMupdates["landscapes_to_delete"].push(toDelete);
			}
			else {
				OPS_JS.reset_slipping_params_WW(state, S);
				DOMupdates["landscapes_to_reset"].push(S);
			}
		}
		
		else if (state["bulgeSize"][S] == 1){ // If the bulge went from size 2 to size 1, we find and delete its fissure landscape
			var bulgeIDOfDonorFissure = OPS_JS.get_fissure_landscape_of_WW(state, S);
			var toDelete = OPS_JS.delete_slipping_params_WW(state, bulgeIDOfDonorFissure);
			DOMupdates["landscapes_to_delete"].push(toDelete);
		}


		
		if (destroy_entire_bulge){
			OPS_JS.absorb_WW(state, UPDATE_COORDS, S, absorb_right, destroy_entire_bulge, DOMupdates);
		}
		
		return true;
	
	}


	// If backtracked, then bulge is absorbed when at position 1
	// If not backtracked, then bulge is absorbed when at position 2
	else if (absorb_right && !state["NTPbound"] && state["bulgeSize"][S] > 0 && state["bulgePos"][S] - Math.max(0, state["mRNAPosInActiveSite"]) == 1 && !(state["bulgePos"][S] == 2 && state["NTPbound"])){
		
		

		var leftBoundary = state["bulgedBase"][S] - state["bulgeSize"][S];
		if (UPDATE_COORDS) WW_JS.position_bulge_WW(leftBoundary, primerSequence[leftBoundary]["x"], state["bulgeSize"][S] - 1);
		
		// Shift every rightward base 1 to the right
		for (i = leftBoundary + state["bulgeSize"][S] + 1; UPDATE_COORDS && i < state["mRNALength"]; i ++){
			if (i >= state["rightMBase"] && i-(leftBoundary + state["bulgeSize"][S]) <= (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]+1)) WW_JS.move_nt_WW(i, "m", 25, 52/(1+PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"]));
			else WW_JS.move_nt_WW(i, "m", 25, 0);
		}	
		
		
		state["bulgeSize"][S] --;
		state["bulgedBase"][S] --;
		state["mRNAPosInActiveSite"] --;
		state["rightMBase"] --;
		
		state["nextBaseToCopy"] ++;
		
		if (UPDATE_COORDS) WW_JS.setNextBaseToAdd_WW();


		if (state["bulgeSize"][S] == 0){
			if (state["bulgePos"].indexOf(0) != -1)	{
				var toDelete = OPS_JS.delete_slipping_params_WW(state, S); // If there is already a form/absorb landscape then we can delete this one
				DOMupdates["landscapes_to_delete"].push(toDelete);
			}
			else {
				OPS_JS.reset_slipping_params_WW(state, S);
				DOMupdates["landscapes_to_reset"].push(S);
			}
		}
		
		else if (state["bulgeSize"][S] == 1){ // If the bulge went from size 2 to size 1, we find and delete its fissure landscape
			var bulgeIDOfDonorFissure = OPS_JS.get_fissure_landscape_of_WW(state, S);
			var toDelete = OPS_JS.delete_slipping_params_WW(state, bulgeIDOfDonorFissure);
			DOMupdates["landscapes_to_delete"].push(toDelete);
		}
		
	

			
		if (destroy_entire_bulge){ // Recursively destroy bulges until there are none left
			OPS_JS.absorb_WW(state, UPDATE_COORDS, S, absorb_right, destroy_entire_bulge, DOMupdates);
		}
		
		return true;
			

		
	}
	
	return false;

}





 OPS_JS.fuseBulgeLeft_WW = function(state = null, UPDATE_COORDS, S = 0, DOMupdates){



	if (state == null) state = WW_JS.currentState;

	
	//console.log("fuse left", state, S);
	if (state["bulgePos"][S] == 0 && (state["bulgePos"].indexOf(Math.max(state["mRNAPosInActiveSite"] + 1, 1)) != -1 || state["bulgePos"].indexOf(Math.max(state["mRNAPosInActiveSite"] + 2, 2)) != -1)) { // Form bulge first and then fuse them
		
		
	
		var fuseWith = state["bulgePos"].indexOf(Math.max(state["mRNAPosInActiveSite"] + 1, 1));
		if (fuseWith == -1)	fuseWith = state["bulgePos"].indexOf(Math.max(state["mRNAPosInActiveSite"] + 2, 2));
		
		
		// If there is a bulge 1 to the left of the bulge we will fuse into, then declare this operation impossible
		if (state["mRNAPosInActiveSite"] >= 0 && state["bulgePos"].indexOf( state["bulgePos"][fuseWith] +1 ) != -1) return function(){};
		if ( state["bulgeSize"].indexOf( state["bulgePos"][fuseWith] ) >= 6 ) return function(){};
		
		
		//console.log("Creating and fusing bulge", S, "with bulge", fuseWith, "at pos", state["bulgePos"][fuseWith], "mRNAPosInActiveSite=", mRNAPosInActiveSite);
		
		
		if (state["NTPbound"]){
			if (UPDATE_COORDS) WW_JS.delete_HTMLobj_WW("m" + state["mRNALength"]);
			if (UPDATE_COORDS) delete_TP(state["mRNALength"], "m");
			state["NTPbound"] = false;
		}
		

		// bulgePos and bulgedBase are the rightmost positions in the bulge
		state["bulgeSize"][fuseWith] ++;
		if ( (state["mRNAPosInActiveSite"] >= 0 && state["bulgePos"][fuseWith] == state["mRNAPosInActiveSite"] + 2 ) || (state["mRNAPosInActiveSite"] < 0)) state["bulgedBase"][fuseWith] ++;
		if ( state["mRNAPosInActiveSite"] >= 0 && state["bulgePos"][fuseWith] != state["mRNAPosInActiveSite"] + 2 ) state["bulgePos"][fuseWith] ++;
		
		var leftBoundary = state["bulgedBase"][fuseWith] - state["bulgeSize"][fuseWith];
		
		if (UPDATE_COORDS) WW_JS.position_bulge_WW(leftBoundary, primerSequence[leftBoundary]["x"], state["bulgeSize"][fuseWith]);

		if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(0,2) == "ss"){
			for (var i = leftBoundary + state["bulgeSize"][fuseWith] + 2; UPDATE_COORDS && i < state["mRNALength"]; i ++){
				if (i>state["rightMBase"] && i-state["rightMBase"] <= hillLengthRight) WW_JS.move_nt_WW(i, "m", -25, -52/hillLengthRight);
				else WW_JS.move_nt_WW(i, "m", -25, 0);
			}
		}
		
		state["rightMBase"] ++;
		state["mRNAPosInActiveSite"]++;
		
		
		state["nextBaseToCopy"] --;
		if (UPDATE_COORDS) WW_JS.setNextBaseToAdd_WW();
		
		OPS_JS.reset_slipping_params_WW(state, S);
		DOMupdates["landscapes_to_reset"].push(S);
		if (state["bulgeSize"][fuseWith] <= 2) {
			var graphID = OPS_JS.create_new_slipping_params_WW(state);
			DOMupdates["where_to_create_new_slipping_landscape"].push(graphID);
			state["partOfBulgeID"][S] = fuseWith;
		}
		


		return true;
		
	}
	

	else if (state["bulgePos"][S] > 0 && state["bulgePos"].indexOf(state["bulgePos"][S] + 1) != -1){ // Fuse the 2 bulges
			
			
		var fuseWith = state["bulgePos"].indexOf(state["bulgePos"][S] + 1);
		
		state["bulgeSize"][fuseWith] ++; // bulgePos and bulgedBase are the rightmost positions in the bulge
		state["bulgedBase"][fuseWith] ++;

		var leftBoundary = state["bulgedBase"][fuseWith] - state["bulgeSize"][fuseWith];
		if (UPDATE_COORDS) WW_JS.position_bulge_WW(leftBoundary, primerSequence[leftBoundary]["x"], state["bulgeSize"][fuseWith]);

		
		state["bulgeSize"][S] --;
		if (state["bulgeSize"][S] == 0) {
			OPS_JS.reset_slipping_params_WW(state, S);
			DOMupdates["landscapes_to_reset"].push(S);
		}
		else if (state["bulgeSize"][S] > 0){
			leftBoundary = state["bulgedBase"][S] - state["bulgeSize"][S];
			if (UPDATE_COORDS) WW_JS.position_bulge_WW(leftBoundary, primerSequence[leftBoundary]["x"], state["bulgeSize"][S]);
		}
		
		// If we fused together 2 bulges of size 1, we simply turn the donor's diffusion landscape into the acceptor's fission landscape
		if (state["bulgeSize"][S] == 0 && state["bulgeSize"][fuseWith] == 2) {
			state["partOfBulgeID"][S] = fuseWith;
		}

		// If this created a bulge of size 2 and the donor bulge was of size > 1, then create a fissure landscape
		else if (state["bulgeSize"][S] > 0 && state["bulgeSize"][fuseWith] == 2) {
			var graphID = OPS_JS.create_new_slipping_params_WW(state);
			DOMupdates["where_to_create_new_slipping_landscape"].push(graphID);
			state["partOfBulgeID"][state["bulgePos"].length-1] = fuseWith; 
		}
		
		// If the donor bulge has been destroyed, but the acceptor bulge is still large, then simply destroy this diffusion landscape
		else if (state["bulgeSize"][S] == 0 && state["bulgeSize"][fuseWith] > 2) {
			var toDelete = OPS_JS.delete_slipping_params_WW(state, S);
			DOMupdates["landscapes_to_delete"].push(toDelete);
		}
		
		// If the donor bulge went from size 2 down to 1, then we need to delete its fissure landscape
		if (DOMupdates["landscapes_to_delete"].length == 0 && state["bulgeSize"][S] == 1) {
			var bulgeIDOfDonorFissure = OPS_JS.get_fissure_landscape_of_WW(state, S);
			var toDelete = OPS_JS.delete_slipping_params_WW(state, bulgeIDOfDonorFissure);
			DOMupdates["landscapes_to_delete"].push(toDelete);
		}


		return true;

	}
	
	return false;
	
}




OPS_JS.fuseBulgeRight_WW = function(state = null, UPDATE_COORDS, S = 0, DOMupdates){


	if (state == null) state = WW_JS.currentState;

	
	//console.log("fuse right", state, S);
	if (state["leftMBase"] > 1 && state["bulgePos"][S] == 0 && ((state["bulgePos"].indexOf(PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 1) != -1) || state["bulgePos"].indexOf(PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 2) != -1)) { // Form bulge first and then fuse them
		
		
		
		var fuseWith = state["bulgePos"].indexOf(PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 1);
		if (fuseWith == -1)	fuseWith = state["bulgePos"].indexOf(PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 2);
		
		if (state["bulgeSize"].indexOf( state["bulgePos"][fuseWith] ) >= 6 ) return function(){};
		
		
		if (state["NTPbound"]){
			if (UPDATE_COORDS) delete_HTMLobj_controller("m" + state["mRNALength"]);
			if (UPDATE_COORDS) delete_TP(state["mRNALength"], "m");
			state["NTPbound"] = false;
		}
		

		state["bulgeSize"][fuseWith] ++;
		state["leftMBase"] --;
		
		
		var leftBoundary = state["bulgedBase"][fuseWith] - state["bulgeSize"][fuseWith];
		if (UPDATE_COORDS) WW_JS.position_bulge_WW(leftBoundary, primerSequence[leftBoundary+1]["x"], state["bulgeSize"][fuseWith]);
		for (i = leftBoundary - 1; UPDATE_COORDS && i >= 0; i --){
			if (i > state["leftMBase"] - hillLengthLeft) move_nt_controller(i, "m", 25, -52/hillLengthLeft);
			else move_nt_controller(i, "m", 25, 0);
		}
		
		
		OPS_JS.reset_slipping_params_WW(state, S);
		DOMupdates["landscapes_to_reset"].push(S);
		if (state["bulgeSize"][fuseWith] <= 2) {
			var graphID = OPS_JS.create_new_slipping_params_WW(state);
			DOMupdates["where_to_create_new_slipping_landscape"].push(graphID);
			state["partOfBulgeID"][S] = fuseWith;
		}
		

		

	}
	
		

	else if (state["bulgePos"][S] > 0 && state["bulgePos"].indexOf(state["bulgePos"][S] - 1) != -1){ // Fuse the 2 bulges
		
		
			
		var fuseWith = state["bulgePos"].indexOf(state["bulgePos"][S] - 1);
		

		state["bulgeSize"][fuseWith] ++; // bulgePos and bulgedBase are the rightmost positions in the bulge

		var leftBoundary = state["bulgedBase"][fuseWith] - state["bulgeSize"][fuseWith];
		if (UPDATE_COORDS) WW_JS.position_bulge_WW(leftBoundary, primerSequence[leftBoundary+1]["x"], state["bulgeSize"][fuseWith]);
		
		
		state["bulgeSize"][S] --;
		if (state["bulgeSize"][S] == 0){
	 		OPS_JS.reset_slipping_params_WW(state, S);
			DOMupdates["landscapes_to_reset"].push(S);
		}

		else if (state["bulgeSize"][S] > 0){ 
			state["bulgedBase"][S] --;
			leftBoundary = state["bulgedBase"][S] - state["bulgeSize"][S];
			if (UPDATE_COORDS) WW_JS.position_bulge_WW(leftBoundary, primerSequence[leftBoundary+1]["x"], state["bulgeSize"][S]);
		}


		// If we fused together 2 bulges of size 1, we simply turn the donor's diffusion landscape into the acceptor's fission landscape
		if (state["bulgeSize"][S] == 0 && state["bulgeSize"][fuseWith] == 2) {
			state["partOfBulgeID"][S] = fuseWith;
		}

		// If this created a bulge of size 2 and the donor bulge was of size > 1, then create a fissure landscape
		else if (state["bulgeSize"][S] > 0 && state["bulgeSize"][fuseWith] == 2) {
			var graphID = OPS_JS.create_new_slipping_params_WW(state);
			DOMupdates["where_to_create_new_slipping_landscape"].push(graphID);
			state["partOfBulgeID"][state["bulgePos"].length-1] = fuseWith;
		}
		
		// If the donor bulge has been destroyed, but the acceptor bulge is still large, then simply destroy this diffusion landscape
		else if (state["bulgeSize"][S] == 0 && state["bulgeSize"][fuseWith] > 2) {
			var toDelete = OPS_JS.delete_slipping_params_WW(state, S);
			DOMupdates["landscapes_to_delete"].push(toDelete);
		}
		
		
		// If the donor bulge went from size 2 down to 1, then we need to delete its fissure landscape
		if (DOMupdates["landscapes_to_delete"].length == 0 && state["bulgeSize"][S] == 1) {
			var bulgeIDOfDonorFissure = get_fissure_landscape_of(state, S);
			var toDelete = OPS_JS.delete_slipping_params_WW(state, bulgeIDOfDonorFissure);
			DOMupdates["landscapes_to_delete"].push(toDelete);
		}

	}
	
	return false;
	
}



 OPS_JS.fissureBulgeLeft_WW = function(state = null, UPDATE_COORDS, S = 0, DOMupdates){


	if (state == null) state = WW_JS.currentState;
	
	//console.log("fiss left", state, S);
	if (state["bulgePos"][S] != PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"] - 1 && state["partOfBulgeID"][S] != S){
	
		
		var fissureFrom = state["partOfBulgeID"][S];
		
		
		// Change the parameters of the base being moved
		
		// If there will still be a bulge, then create a new landscape for diffusing the new bulge
		state["bulgePos"][S] = state["bulgePos"][fissureFrom];
		state["bulgedBase"][S] = state["bulgedBase"][fissureFrom] - state["bulgeSize"][fissureFrom] + 1;
		state["bulgeSize"][S] = 1;
		state["partOfBulgeID"][S] = S;
		
		// Create a new landscape to continue fission, if there is still a bulge
		if (state["bulgeSize"][fissureFrom] > 2){
			var graphID = OPS_JS.create_new_slipping_params_WW(state);
			DOMupdates["where_to_create_new_slipping_landscape"].push(graphID);
			var newIndex = state["bulgePos"].length - 1;
			state["partOfBulgeID"][newIndex] = fissureFrom;
		}
		
		
		// Reduce the visual size of the bulge
		state["bulgeSize"][fissureFrom]--;
		var leftBoundary = state["bulgedBase"][fissureFrom] - state["bulgeSize"][fissureFrom];
		if (UPDATE_COORDS) WW_JS.position_bulge_WW(leftBoundary, primerSequence[leftBoundary-1]["x"], state["bulgeSize"][fissureFrom], true, -1);

		// Then exit. This action may be followed by a diffuse left or a fuse left.
		return true;
		
	}
	
	return false;
	
}





 OPS_JS.fissureBulgeRight_WW = function(state = null, UPDATE_COORDS, S = 0, DOMupdates){


	if (state == null) state = WW_JS.currentState;
	
	if (state["bulgePos"][S] - Math.max(0, state["mRNAPosInActiveSite"]) != 1 && state["partOfBulgeID"][S] != S){
		
		
		var fissureFrom = state["partOfBulgeID"][S];
		

		// Change the parameters of the base being moved
		state["bulgePos"][S] = state["bulgePos"][fissureFrom];
		state["bulgedBase"][S] = state["bulgedBase"][fissureFrom];
		state["bulgeSize"][S] = 1;
		state["partOfBulgeID"][S] = S;
		
		
		// Create a new landscape to continue fission, if there is still a bulge
		if (state["bulgeSize"][fissureFrom] > 2){
			var graphID = OPS_JS.create_new_slipping_params_WW(state);
			DOMupdates["where_to_create_new_slipping_landscape"].push(graphID);
			var newIndex = state["bulgePos"].length - 1;
			state["partOfBulgeID"][newIndex] = fissureFrom;
		}
		
		// Reduce the visual size of the bulge
		state["bulgedBase"][fissureFrom]--;
		state["bulgeSize"][fissureFrom]--;
		var leftBoundary = state["bulgedBase"][fissureFrom] - state["bulgeSize"][fissureFrom];
		if (UPDATE_COORDS) WW_JS.position_bulge_WW(leftBoundary, primerSequence[leftBoundary]["x"], state["bulgeSize"][fissureFrom], true, +1);
		

		// Then exit. This action may be followed by a diffuse left or a fuse left.
		return true;
		
	}
	
	
	return false;
	
}






 OPS_JS.create_new_slipping_params_WW = function(state){
	
	if (!PARAMS_JS.PHYSICAL_PARAMETERS["allowMultipleBulges"]["val"]) return null;
	
	var graphID = state["bulgePos"].length;
	
	// Create new elements in the lists
	state["bulgePos"].push(0);
	state["bulgedBase"].push(-1);
	state["bulgeSize"].push(0);
	state["partOfBulgeID"].push(graphID);


	return graphID;
	
	//return function() { create_new_slipping_landscape(graphID); };
	
}


 OPS_JS.reset_slipping_params_WW = function(state, S){
		
	state["bulgePos"][S] = 0;
	state["bulgedBase"][S] = -1
	state["bulgeSize"][S] = 0;
	state["partOfBulgeID"][S] = S;

	
}


 OPS_JS.delete_slipping_params_WW = function(state, S = 0){
	
	if (!PARAMS_JS.PHYSICAL_PARAMETERS["allowMultipleBulges"]["val"]) return;
	
	// Delete this element from all slippage related lists
	state["bulgePos"].splice(S, 1);
	state["bulgedBase"].splice(S, 1);
	state["bulgeSize"].splice(S, 1);
	state["partOfBulgeID"].splice(S, 1);
	
	
	// Pull down the indices where applicable
	for (var s = 0; s < state["bulgePos"].length; s++){
		if (state["partOfBulgeID"][s] > S) {
			//console.log("Changing bulgeID of", s , "wrt", S," from",state["partOfBulgeID"][s], "to", state["partOfBulgeID"][s]-1);
			state["partOfBulgeID"][s]--;
		}
	}

	return state["bulgePos"].length;

	
	
}



// Returns the index of the fissure landscape which applies to bulge index S
 OPS_JS.get_fissure_landscape_of_WW = function(state, S){
	
	for (var s = 0; s < state["bulgePos"].length; s++){
		if (s == S) continue;
		if (state["partOfBulgeID"][s] == S) return s;
	}
	return -1;
}








if (RUNNING_FROM_COMMAND_LINE){


	module.exports = {
		transcribe_WW: OPS_JS.transcribe_WW,
		stutter_WW: OPS_JS.stutter_WW,
		applyActions: OPS_JS.applyActions,
		forward_WW: OPS_JS.forward_WW,
		backwards_WW: OPS_JS.backwards_WW,
		terminate_WW: OPS_JS.terminate_WW,
		bindNTP_WW: OPS_JS.bindNTP_WW,
		releaseNTP_WW: OPS_JS.releaseNTP_WW,
		set_TP_state_WW: OPS_JS.set_TP_state_WW,
		elongate_WW: OPS_JS.elongate_WW,
		decay_WW: OPS_JS.decay_WW,
		activate_WW: OPS_JS.activate_WW,
		deactivate_WW: OPS_JS.deactivate_WW,
		slip_left_WW: OPS_JS.slip_left_WW,
		slip_right_WW: OPS_JS.slip_right_WW,
		form_bulge_WW: OPS_JS.form_bulge_WW,
		diffuse_left_WW: OPS_JS.diffuse_left_WW,
		diffuse_right_WW: OPS_JS.diffuse_right_WW,
		absorb_WW: OPS_JS.absorb_WW,
		fuseBulgeLeft_WW: OPS_JS.fuseBulgeLeft_WW,
		fuseBulgeRight_WW: OPS_JS.fuseBulgeRight_WW,
		fissureBulgeLeft_WW: OPS_JS.fissureBulgeLeft_WW,
		fissureBulgeRight_WW: OPS_JS.fissureBulgeRight_WW,
		create_new_slipping_params_WW: OPS_JS.create_new_slipping_params_WW,
		reset_slipping_params_WW: OPS_JS.reset_slipping_params_WW,
		delete_slipping_params_WW: OPS_JS.delete_slipping_params_WW,
		get_fissure_landscape_of_WW: OPS_JS.get_fissure_landscape_of_WW

	}

}
