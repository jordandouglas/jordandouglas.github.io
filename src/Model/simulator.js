
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

SIMULATION_VARIABLES = {};
SIMULATION_ACTIONS = [];


function startTrials_WW(n, resolve = function() { }, msgID = null){


	if (!stopRunning_WW) {
		resolve();
		return;
	}


	// If there have been any indels or if there is a bulge then refresh first
	var refreshIfSlippage = function(resolve){
		if (currentState["terminated"] || currentState["rightMBase"] != currentState["rightGBase"] || currentState["leftMBase"] != currentState["leftGBase"]) refresh_WW(); 
		resolve();
	};

	setTimeout(function(){
		var toCall = () => new Promise((resolve) => refreshIfSlippage(resolve));
		toCall().then(() => {
			

			pauseEveryNActions = 300;
			actionsSinceLastPause = pauseEveryNActions;
			renderPlotsEveryMS = 5000; // If in hidden mode, render the plots every few seconds

			SIMULATION_VARIABLES = {baseToAdd: "X", terminated: false};
			
			initTranslocationRateCache();

			var stateC = convertFullStateToCompactState(currentState);
			SIMULATION_ACTIONS = [];
			SIMULATION_ACTIONS.push(function(state, callback) { backward_cWW(state, callback) });
			SIMULATION_ACTIONS.push(function(state, callback) { forward_cWW(state, callback) });
			SIMULATION_ACTIONS.push(function(state, callback) { releaseNTP_cWW(state, callback) });
			SIMULATION_ACTIONS.push(function(state, callback) { bindNTP_cWW(state, callback) });
			SIMULATION_ACTIONS.push(function(state, callback) { activate_cWW(state, callback) });
			SIMULATION_ACTIONS.push(function(state, callback) { deactivate_cWW(state, callback) });



			stopRunning_WW = false;
			simulating = true;
			ANIMATION_TIME = ANIMATION_TIME_TEMP;

			if (ANIMATION_TIME == 0) renderPlotsHidden();

			// Use the geometric sampling speed up only if the speed is not set to slow
			ELONGATION_MODELS[currentElongationModel]["allowGeometricCatalysis"] = ANIMATION_TIME < 200; 


			n_simulations_WW(n, stateC, resolve, msgID);
			


		});

	}, 55);

}



function renderPlotsHidden(){

	if (!isWebWorker || !simulating || ANIMATION_TIME_TEMP > 0) return;


	setTimeout(function(){
		postMessage("_drawPlots()");
		renderPlotsHidden();
	}, renderPlotsEveryMS); // Give it an extra few ms to ensure that action has completed


}





// These functions may be called either directly or through a WebWorker
// Called on stateC, which is a compact state not a full state
function n_simulations_WW(n, stateC, resolve = function() { }, msgID = null){


	// Stop the simulations
	if (n == 0 || stopRunning_WW) {

		ANIMATION_TIME = 200;
		simulating = false;
		stopRunning_WW = true;

		currentState = convertCompactStateToFullState(stateC);
		updateCoordsOfCurrentState();

		if (msgID != null){
			postMessage(msgID + "~X~" + "done");
		}
		else resolve();
		return;
	}



	var initialiseNextSimulation = function(aborted = false){

		// Return
		if (stopRunning_WW) {

			ANIMATION_TIME = 200;
			simulating = false;


			if (msgID != null){
				postMessage(msgID + "~X~" + "done");
			}
			else resolve();
			return;
		}

		// Check if mRNApos <= 1 and the right genome base is beyond the end of the sequence
		if (aborted || SIMULATION_VARIABLES["terminated"] || (stateC[1] <= 1 && stateC[1] + stateC[0] + 1 > currentState["nbases"])) {
			currentState = convertCompactStateToFullState(stateC);
			updateCoordsOfCurrentState();
			plots_complete_simulation_WW();
			terminate_WW();

		}


		SIMULATION_VARIABLES["terminated"] = false;

		// Pause at the end of every run to make sure that everything has loaded and page is responsive during termination
		setTimeout(function(){

			// Refresh the webworker
			var toCall = () => new Promise((resolve) => refresh_WW(resolve));
			toCall().then(() => {
				stateC = convertFullStateToCompactState(currentState);
				setNextBaseToAdd_WW();
				
				n_simulations_WW(n-1, stateC, resolve, msgID);
				
				/*
				toCall = () => new Promise((resolve) => transcribe_WW(2, true, resolve));
				toCall().then(() => {
					n_simulations_WW(n-1, resolve, msgID);
				});
				*/
				
			});


		}, 25);



	};


	var toCall = () => new Promise((resolve) => trial_WW(stateC, resolve, msgID));
	toCall().then((aborted) => initialiseNextSimulation(aborted));



	
}


function trial_WW(stateC, resolve = function() { }, msgID = null){



	ANIMATION_TIME = ANIMATION_TIME_TEMP;



	
	// Stop the simulations or refresh to begin the next trial
	if (stopRunning_WW || SIMULATION_VARIABLES["terminated"] || (stateC[1] <= 1 && stateC[1] + stateC[0] + 1 > currentState["nbases"])) {
		resolve(false);
		return;
	}


	printDateAndTime("Sampling action");
	var result = sampleAction_WW(stateC);

	

	if (result["toDo"].length > 1){
		for (var i = 0; i < result["toDo"].length-1; i ++){
			SIMULATION_ACTIONS[result["toDo"][i]](stateC); // Perform all actions in list except for the last one
		}
		result["toDo"] = result["toDo"][result["toDo"].length-1]; // Last one
	}


	var actionToDo = SIMULATION_ACTIONS[result["toDo"]];
	
	//console.log("Sampled", actionToDo, "state", stateC);

	//printDateAndTime("Updating plots");
	updatePlotData_WW(stateC, result["toDo"], result["time"]);

	
	
	// If we have been pausing too long, then abort
	if (PHYSICAL_PARAMETERS["arrestTimeout"]["val"] > 0 && PHYSICAL_PARAMETERS["arrestTimeout"]["val"] < timeWaitedUntilNextCatalysis){
		resolve(true);
		return;
	}

	

	var prepareForNextTrial = function(){


		printDateAndTime("Perparing for next trial");
		// If this is in animation mode, then this process is synchronous with rendering so we return in between operators
		// THIS BLOCK OF CODE WILL ONLY WORK IF NOT RUNNING AS A WEBWORKER
		if (!isWebWorker){



			currentState = convertCompactStateToFullState(stateC);
			updateCoordsOfCurrentState();
			var toCall = () => new Promise((resolve) => renderObjects(false, resolve));
			toCall().then(() => {
				$("#bases").children().promise().done(function(){
					setNextBaseToAdd_controller();
					drawPlots();
					renderParameters();
					trial_WW(stateC, resolve, msgID);
				});
			});

		}


		// Animation mode but for WebWorker
		else if (isWebWorker && ANIMATION_TIME > 1){
			currentState = convertCompactStateToFullState(stateC);
			updateCoordsOfCurrentState();

			setTimeout(function(){
				trial_WW(stateC, resolve, msgID);
			}, ANIMATION_TIME + 5); // Give it an extra few ms to ensure that action has completed
		}


		// Ultrafast mode (instantaneous for the WebWorker). Running this way without a WebWorker will crash the browser
		else{
			trial_WW(stateC, resolve, msgID);
		}



	};


	printDateAndTime("Executing action");
	// If we are running on ultrafast mode then this fills up the thread. So we should pause every now and then
	// in case the user has another request (eg. stop).
	actionsSinceLastPause--;
	if (isWebWorker && (ANIMATION_TIME == 1 || ANIMATION_TIME == 0) && actionsSinceLastPause <= 0){
		actionsSinceLastPause = pauseEveryNActions;

		//postMessage("MSG: pausing");
		
		if (isWebWorker){
			//postMessage("MSG: yes pause");
		}

		simulationOnPause = true;


		// Ultrafast mode -> render html then continue when its done
		if (ANIMATION_TIME == 1) {

			currentState = convertCompactStateToFullState(stateC);
			updateCoordsOfCurrentState();
			postMessage("_renderHTML()");
		

			resumeSimulation_WW = function(){

				simulationOnPause = false;
				var toCall = (state) => new Promise((resolve) => actionToDo(state, resolve));
				toCall(stateC).then(() => prepareForNextTrial());

			} 
		}

		// Hidden mode -> pause for a fixed period
		else{
			currentState = convertCompactStateToFullState(stateC);
			setTimeout(function(){
				var toCall = (state) => new Promise((resolve) => actionToDo(state, resolve));
				toCall(stateC).then(() => prepareForNextTrial());
			}, 100);


		}



	}else{

		if (isWebWorker){
			//postMessage("MSG: no pause");
		}

		var toCall = (state) => new Promise((resolve) => actionToDo(state, resolve));
		toCall(stateC).then(() => prepareForNextTrial());

	}





}




function sampleAction_WW(stateC){


	// If the polymerase is on the very left then move forward
	//if (currentState["leftGBase"] == 0) return {"toDo": 1, "time": 0};



	// If NTP is not bound retrieve translocation rates from cache
	var kBck = 0;
	var kFwd = 0
	if (!stateC[2]){
		var rateFwdAndBack = getTranslocationRates(stateC);
		kFwd = rateFwdAndBack[1];
		kBck = rateFwdAndBack[0];
		
		if (stateC[3] && stateC[1] == 0 && !ELONGATION_MODELS[currentElongationModel]["allowBacktrackWithoutInactivation"]) kBck = 0; // If state is active but we don't allow backtracking while active then set rate to zero
		
	}
	var kRelease = stateC[2] ? PHYSICAL_PARAMETERS["RateUnbind"]["val"] : 0; // Can only release NTP if it is bound
	var kAct = stateC[3] ? 0 : PHYSICAL_PARAMETERS["kA"]["val"]; // Can only activate if it is deactivated
	var kDeact = stateC[3] && !stateC[2] && ELONGATION_MODELS[currentElongationModel]["allowInactivation"] ? PHYSICAL_PARAMETERS["kU"]["val"] : 0; // Can only deactivate if it is activated, NTP is not bound, and model permits it
	
	//if (kFwd != 0) kFwd = 36.9;
	//if (kBck != 0) kBck = 57.5;

	//console.log("state", stateC, "kbck", kBck);

	//console.log("Rate back old", propSlideBackOLD, "rate back new", propSlideBack);
	//console.log("Rate fwd old", propSlideFwdOLD, "rate fwd new", propSlideFwd);

	//console.log("kRelease", kRelease);


	var toDo = -1;
	var minReactionTime = -1;


	// If ready to bind and the model settings are right, then use the geometric boost
	if (stateC[1] == 1 && !stateC[2] && stateC[3] && ELONGATION_MODELS[currentElongationModel]["allowGeometricCatalysis"] && ELONGATION_MODELS[currentElongationModel]["id"] == "simpleBrownian"){

		//console.log("allowGeometricCatalysis");

		var kcat = PHYSICAL_PARAMETERS["RatePolymerise"]["val"];
		var rateRelCat = kRelease + kcat;

		var baseToTranscribe = getBaseInSequenceAtPosition_WW("g" + (stateC[1] + stateC[0]));
		var result = sampleBaseToAdd(baseToTranscribe);
		var kBind = result["rate"];
		SIMULATION_VARIABLES["baseToAdd"] = result["base"];  // SIMPLIFICATION: the base added is sampled only once. We do not resample the base to add every time 
															 // it is released from the activt site at this position. 

		var rateBindRelease = kBind * kRelease / rateRelCat;
		var rateBindCat =     kBind * kcat / rateRelCat;
		var rate = kBck + kFwd + kRelease + kBind + kAct + kDeact;


		// Keep sampling until it is NOT bind release
		var runif = mersenneTwister.random() * rate;
		minReactionTime = 0;
		while(runif < rateBindRelease){
			minReactionTime += rexp(rate); // Time taken to bind
			minReactionTime += rexp(rateRelCat); // Time taken to release
			runif = mersenneTwister.random() * rate;
		}
		minReactionTime += rexp(rate);


		// Choose next action uniformly
		var rates = [kBck, kFwd, kRelease, rateBindCat, kAct, kDeact];
		var sum = kBck + kFwd + kRelease + rateBindCat + kAct + kDeact;
		runif = mersenneTwister.random() * sum;
		var cumsum = 0;
		for (var i = 0; i < rates.length; i ++){
			cumsum += rates[i];
			if (runif < cumsum) {
				toDo = i;
				break;
			}

		}

		// If next action is bindcat then add the time for catalysis
		if (toDo == 3) {
			minReactionTime += rexp(rateRelCat);
			toDo = [3,3];
		}
		

		

	/*}


	// If using 2 site model then sample this part by ignoring state descriptions and just use simple transition / rate matrices
	else if (currentState["mRNAPosInActiveSite"] == 0 && !currentState["NTPbound"] && currentState["activated"] && ELONGATION_MODELS[currentElongationModel]["allowGeometricCatalysis"] && ELONGATION_MODELS[currentElongationModel]["id"] == "twoSiteBrownian"){

		var stateCopy = getCurrentStateCopy_WW(currentState);

		// Calculate all sliding peaks heights for this copy
		var slidePeaks = update_slidingPeakHeights_WW(stateCopy);
		var slideTroughs = update_slidingTroughHeights_WW(stateCopy);

		var rate0tominus1 = Math.exp(-(slidePeaks[2] - slideTroughs[3])); // Rate of backtracking
		var rate0to1 = propSlideFwd;									  // Rate of going from 0 to 1
		var rate1to0 = Math.exp(-(slidePeaks[3] - slideTroughs[4]));      // Rate of going from 1 to 0
		var rate1to2 = Math.exp(-(slidePeaks[4] - slideTroughs[4]));      // Rate of going from 1 to +2


		var ratePause0 = propPauseFwd;									  // Pause while pretranslocated
		var ratePause1 = propPauseFwd;

		// Bind rate from state 0
		var rate0to0N = propBindFwd;									  // Bind NTP while pretranslocated WHY IS THIS ZERO???



		// Calculate rates from the 0^N state
		bindNTP_WW(stateCopy, false);
		slidePeaks = update_slidingPeakHeights_WW(stateCopy, false);
		slideTroughs = update_slidingTroughHeights_WW(stateCopy, false);
		var bindPeaks = update_bindingPeakHeights_WW(stateCopy);
		var bindTroughs = update_bindingTroughHeights_WW(stateCopy);

		var rate0Nto0 = Math.exp(-(bindPeaks[2] - bindTroughs[3]));		// Release NTP while pretranslocated
		var rate0Nto1N = Math.exp(-(slidePeaks[3] - slideTroughs[3]));	// Slide forward to posttranslocated with NTP bound


		// Calculate rates from the 1^N state
		bindNTP_WW(stateCopy, false);
		slidePeaks = update_slidingPeakHeights_WW(stateCopy, false);
		slideTroughs = update_slidingTroughHeights_WW(stateCopy, false);
		bindPeaks = update_bindingPeakHeights_WW(stateCopy);
		bindTroughs = update_bindingTroughHeights_WW(stateCopy);

		var rate1Nto1 = Math.exp(-(bindPeaks[2] - bindTroughs[3]));		// Release NTP while posttranslocated
		var rate1NtoC = Math.exp(-(bindPeaks[3] - bindTroughs[3]));		// Catalyse NTP
		var rate1Nto0N = Math.exp(-(slidePeaks[2] - slideTroughs[3]));	// Slide backwards to pretranslocated with NTP bound


		// Calculate binding rate from the 0 (posttranslocated) state
		releaseNTP_WW(stateCopy, false);
		bindPeaks = update_bindingPeakHeights_WW(stateCopy);
		bindTroughs = update_bindingTroughHeights_WW(stateCopy);
		var rate1to1N = Math.exp(-(bindPeaks[3] - bindTroughs[3]));	


		// Build the rate matrix. index 0 = 0, 1 = 1, 2 = 0N, 3 = 1N, 4 = 0pause, 5 = 1pause, 6 = backtracked, 7 = hypertranslocated, 8 = catalysed
		// 4-8 are absorbing states
		var rateMatrix = [[], [], [], []];
		rateMatrix[0] = [0, rate0to1, rate0to0N, 0, ratePause0, 0, rate0tominus1, 0, 0]; // From pretranslocated state
		rateMatrix[1] = [rate1to0, 0, 0, rate1to1N, 0, ratePause1, 0, rate1to2, 0]; 	 // From posttranslocated state
		rateMatrix[2] = [rate0Nto0, 0, 0, rate0Nto1N, 0, 0, 0, 0, 0];					 // From pretranslocated-NTP state
		rateMatrix[3] = [0, rate1Nto1, rate1Nto1, 0, 0, 0, 0, 0, rate1NtoC];			 // From posttranslocated-NTP state



		// Convert the rate matrix into a probability matrix, and build a rate vector (the rate to sample with in each state)
		var probMatrix = [[], [], [], []];
		var rateVector = [0,0,0,0];
		for (var row = 0; row < 4; row++){
			var rowSum = 0;
			for (var col = 0; col < rateMatrix[row].length; col++)  rowSum += rateMatrix[row][col];
			for (var col = 0; col < rateMatrix[row].length; col++){
				probMatrix[row][col] = rateMatrix[row][col] / rowSum;
				rateVector[row] += probMatrix[row][col];
			}

		}

		console.log("Sampling from rateMatrix", rateMatrix);


		// Simulate the matrix until it reaches an absorbing state
		var result = simulateMatrix_WW(0, rateVector, probMatrix, 4);
		minReactionTime = result["time"];
		switch(result["state"]){
			case 4:
				toDo = 5;
				break
			case 5:
				toDo = [1,5];
				break
			case 6:
				toDo = 0;
				break
			case 7:
				toDo = [1,1];
				break
			case 8:
				toDo = [3,1,3];
				break
		}

		console.log("Sampled todo", toDo);


		*/
	} else {



		var kBindOrCat = 0; // Sample binding or catalysis rate
		if (stateC[1] == 1 && stateC[3]){
			if (stateC[2]) kBindOrCat = PHYSICAL_PARAMETERS["RatePolymerise"]["val"]; // If NTP bound then use rate of catalysis

			// Otherwise sample which NTP to bind and then use its rate
			else{
				var baseToTranscribe = getBaseInSequenceAtPosition_WW("g" + (stateC[1] + stateC[0]));
				var result = sampleBaseToAdd(baseToTranscribe);
				kBindOrCat = result["rate"];
				SIMULATION_VARIABLES["baseToAdd"] = result["base"];
			}
		}


		// Sample 1 random from exp(rateSum) where rateSum is the sum of all rates
		var rates = [kBck, kFwd, kRelease, kBindOrCat, kAct, kDeact];
		var rateSum = 0;
		for (var i = 0; i < rates.length; i++) rateSum += rates[i];
		minReactionTime =  rexp(rateSum);

		// Select which reaction just occurred by sampling proportional to their rates
		var runif = mersenneTwister.random() * rateSum;
		var cumsum = 0;
		for (var i = 0; i < rates.length; i ++){
			cumsum += rates[i];
			if (runif < cumsum) {
				toDo = i;
				break;
			}

		}


	}


	return {"toDo": toDo, "time": minReactionTime};
	
	
	
}


function simulateMatrix_WW(s, rateVector, probMatrix, numTransientStates){


	var time = 0;
	while(true){

		if (s >= numTransientStates) return {state: s, time: time}; // Return if this is an absorbing state


		// Sample reaction time
		time += rexp(rateVector[s]);

		// Sample next state
		var runif = mersenneTwister.random();
		var cumsum = 0;
		for (var i = 0; i < probMatrix[s].length; i ++){
			cumsum += probMatrix[s][i];
			if (runif < cumsum) {
				s = i;
				break;
			}

		}

	}


}




function printDateAndTime(msg){
	return;
	var currentdate = new Date(); 
	var datetime = currentdate.getHours() + ":"  
			+ currentdate.getMinutes() + ":" 
			+ currentdate.getSeconds() + ":"
			+ currentdate.getMilliseconds();

	console.log(datetime + " -> " + msg);

}


function getGlobalVariableDictionary(){

	return {leftMBase:leftMBase, rightMBase:rightMBase, leftGBase:leftGBase, rightGBase:rightGBase, mRNAPosInActiveSite:mRNAPosInActiveSite, NTPbound:NTPbound, activated:activated, bulgePos:bulgePos.slice(), bulgedBase:bulgedBase.slice(), bulgeSize:bulgeSize.slice(), partOfBulgeID:partOfBulgeID.slice(), nextBaseToCopy:nextBaseToCopy};
	
}





function update_slippingPeakHeights(S = 0){
	
	
	if (true || terminated) return [maxHeight,maxHeight,maxHeight,maxHeight,maxHeight,maxHeight];
	
	slippingPeakHeightsTemp = [PHYSICAL_PARAMETERS["GDaggerDiffuse"]["val"],PHYSICAL_PARAMETERS["GDaggerDiffuse"]["val"],PHYSICAL_PARAMETERS["GDaggerDiffuse"]["val"],PHYSICAL_PARAMETERS["GDaggerDiffuse"]["val"],PHYSICAL_PARAMETERS["GDaggerDiffuse"]["val"],PHYSICAL_PARAMETERS["GDaggerDiffuse"]["val"]];

	// Slip left
	var locals = getGlobalVariableDictionary();
	for (var pos = 2; pos >= 0; pos --){
			var localsPreOperation = copyVariableDictionary(locals);
			var startedOutWithNoBulge = locals["bulgePos"][S] == 0;
			var possibleOperation = slip_left(S, locals);
			
			// Prevent forming bulge while backtracked
			if (startedOutWithNoBulge && localsPreOperation["mRNAPosInActiveSite"] <= -2) possibleOperation = false;
			
			if (!possibleOperation) {
				slippingPeakHeightsTemp[pos] = maxHeight;
				break;
			}
			
			slippingPeakHeightsTemp[pos] += getFreeEnergyOfIntermediateState(localsPreOperation, locals);
			if (startedOutWithNoBulge || locals["bulgePos"][S] > 0 || localsPreOperation["bulgePos"][S] > 0 || locals["partOfBulgeID"][S] != S || localsPreOperation["partOfBulgeID"][S] != S) slippingPeakHeightsTemp[pos] += slipHtrough;
			
			if ( (startedOutWithNoBulge && locals["bulgePos"][S] > 0) || (!startedOutWithNoBulge && locals["bulgePos"][S] == 0)) slippingPeakHeightsTemp[pos] += slipHForm;
			
			
	}
	
	
	// Slip right
	locals = getGlobalVariableDictionary();
	for (var pos = 4; pos <= 6; pos ++){
			var localsPreOperation = copyVariableDictionary(locals);
			var startedOutWithNoBulge = locals["bulgePos"][S] == 0;
			var possibleOperation = slip_right(S, locals);
			if (!possibleOperation) {
				slippingPeakHeightsTemp[pos-1] = maxHeight;
				break;
			}
			slippingPeakHeightsTemp[pos-1] += getFreeEnergyOfIntermediateState(localsPreOperation, locals);
			if (startedOutWithNoBulge || locals["bulgePos"][S] > 0 || localsPreOperation["bulgePos"][S] > 0 || locals["partOfBulgeID"][S] != S || localsPreOperation["partOfBulgeID"][S] != S) slippingPeakHeightsTemp[pos-1] += slipHtrough;
			
			
			if ( (startedOutWithNoBulge && locals["bulgePos"][S] > 0) || (!startedOutWithNoBulge && locals["bulgePos"][S] == 0)) slippingPeakHeightsTemp[pos-1] += slipHForm;
			
	}
	
	return slippingPeakHeightsTemp;
	

	
}


function update_slippingTroughHeights(S = 0){
	
	
	if (terminated || true) return [dftTrough,dftTrough,dftTrough,dftTrough,dftTrough,dftTrough];
	
	var slippingTroughHeightsTemp = [dftTrough,dftTrough,dftTrough,dftTrough,dftTrough,dftTrough,dftTrough];
	
	var locals = getGlobalVariableDictionary();
	
	slippingTroughHeightsTemp[3] = getFreeEnergyOfState(locals, [TbulgePos]);
	if (bulgePos[S] > 0) slippingTroughHeightsTemp[3] += slipHtrough;

	
	// Slip left
	for (var pos = 2; pos >= 0; pos --){
		slip_left(S, locals);
		var startedOutWithNoBulge = locals["bulgePos"][S] == 0;
		slippingTroughHeightsTemp[pos] = getFreeEnergyOfState(locals, [TbulgePos]);
		if (startedOutWithNoBulge || locals["bulgePos"][S] > 0 || locals["partOfBulgeID"][S] != S) slippingTroughHeightsTemp[pos] += slipHtrough;
	}
	
	// Slip right
	locals = getGlobalVariableDictionary();
	
	for (var pos = 4; pos <= 6; pos ++){
		var startedOutWithNoBulge = locals["bulgePos"][S] == 0;
		slip_right(S, locals);
		slippingTroughHeightsTemp[pos] = getFreeEnergyOfState(locals, [TbulgePos]);
		if (startedOutWithNoBulge || locals["bulgePos"][S] > 0 || locals["partOfBulgeID"][S] != S) slippingTroughHeightsTemp[pos] += slipHtrough;
	}
	
	return slippingTroughHeightsTemp;
	
	
	
	
}



