
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

SIM_JS = {};
SIM_JS.SIMULATION_VARIABLES = {};
SIM_JS.SIMULATION_ACTIONS = [];
SIM_JS.renderPlotsEveryMS = 5000; // If in hidden mode, render the plots every few seconds


 SIM_JS.startTrials_WW = function(n, resolve = function() { }, msgID = null){

	
	if (!WW_JS.stopRunning_WW && !ABC_JS.ABC_simulating) { // If ABC is running then allow this to proceed 
		if (msgID != null){
			postMessage(msgID + "~X~" + "done");
		}else{
			resolve();
		}
		return;
	}


	// If there have been any indels or if there is a bulge then refresh first
	var refreshIfSlippage = function(resolve){
		if (WW_JS.currentState["terminated"] || WW_JS.currentState["rightMBase"] != WW_JS.currentState["rightGBase"] || WW_JS.currentState["leftMBase"] != WW_JS.currentState["leftGBase"]) WW_JS.refresh_WW(); 
		resolve();
	};

	setTimeout(function(){
		var toCall = () => new Promise((resolve) => refreshIfSlippage(resolve));
		toCall().then(() => {
			

			pauseEveryNActions = 300;
			actionsSinceLastPause = pauseEveryNActions;


			SIM_JS.SIMULATION_VARIABLES = {baseToAdd: "X", terminated: false};
			
			STATE_JS.initTranslocationRateCache();

			var stateC = STATE_JS.convertFullStateToCompactState(WW_JS.currentState);
			SIM_JS.SIMULATION_ACTIONS = [];
			SIM_JS.SIMULATION_ACTIONS.push(function(state, callback) { STATE_JS.backward_cWW(state, callback) });
			SIM_JS.SIMULATION_ACTIONS.push(function(state, callback) { STATE_JS.forward_cWW(state, callback) });
			SIM_JS.SIMULATION_ACTIONS.push(function(state, callback) { STATE_JS.releaseNTP_cWW(state, callback) });
			SIM_JS.SIMULATION_ACTIONS.push(function(state, callback) { STATE_JS.bindNTP_cWW(state, callback) });
			SIM_JS.SIMULATION_ACTIONS.push(function(state, callback) { STATE_JS.activate_cWW(state, callback) });
			SIM_JS.SIMULATION_ACTIONS.push(function(state, callback) { STATE_JS.deactivate_cWW(state, callback) });



			if (!ABC_JS.ABC_simulating) WW_JS.stopRunning_WW = false; // Do not modify this variable if the simulation was called by ABC
			simulating = true;
			ANIMATION_TIME = ANIMATION_TIME_TEMP;

			if (ANIMATION_TIME == 0 && !ABC_JS.ABC_simulating) SIM_JS.renderPlotsHidden(1000);

			// Use the geometric sampling speed up only if the speed is not set to slow/medium
			FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowGeometricCatalysis"] = ANIMATION_TIME < 60; 

			SIM_JS.n_simulations_WW(n, stateC, resolve, msgID);
			


		});

	}, 55);

}



 SIM_JS.renderPlotsHidden = function(timeToTake = SIM_JS.renderPlotsEveryMS){

	if (!WW_JS.isWebWorker || RUNNING_FROM_COMMAND_LINE || (!simulating && !ABC_JS.ABC_simulating) || ANIMATION_TIME_TEMP > 0) return;

	setTimeout(function(){

		if (!WW_JS.isWebWorker || RUNNING_FROM_COMMAND_LINE || (!simulating && !ABC_JS.ABC_simulating) || ANIMATION_TIME_TEMP > 0) return;
		postMessage("_renderHTML_hidden()");
		SIM_JS.renderPlotsHidden(SIM_JS.renderPlotsEveryMS);

	}, timeToTake); // Give it an extra few ms to ensure that action has completed


}





// These functions may be called either directly or through a WebWorker
// Called on stateC, which is a compact state not a full state
 SIM_JS.n_simulations_WW = function(n, stateC, resolve = function() { }, msgID = null){


 	// Print out every 20th simulation when calling from command line
 	if (!ABC_JS.ABC_simulating && RUNNING_FROM_COMMAND_LINE && (n == 1 || n == XML_JS.N || (XML_JS.N - n + 1) % 20 == 0)){

 		if (WW_JS.WORKER_ID == null) console.log("Sim", (XML_JS.N - n + 1), "/", XML_JS.N);

 		else console.log("Worker", WW_JS.WORKER_ID, "Sim", (XML_JS.N - n + 1), "/", XML_JS.N);
 	}



	// Stop the simulations
	if (n == 0 || WW_JS.stopRunning_WW) {

		ANIMATION_TIME = 200;
		simulating = false;
		if(!ABC_JS.ABC_simulating) WW_JS.stopRunning_WW = true; // Do not modify this variable if the simulation was called by ABC

		if (!RUNNING_FROM_COMMAND_LINE){
			WW_JS.currentState = STATE_JS.convertCompactStateToFullState(stateC);
			STATE_JS.updateCoordsOfcurrentState();
		}

		if (msgID != null){
			postMessage(msgID + "~X~" + "done");
		}
		else resolve();
		return;
	}




	var initialiseNextSimulation = function(aborted = false){


		// Return
		if (WW_JS.stopRunning_WW) {

			ANIMATION_TIME = 200;
			simulating = false;


			if (msgID != null){
				postMessage(msgID + "~X~" + "done");
			}
			else resolve();
			return;
		}

		// Check if mRNApos <= 1 and the right genome base is beyond the end of the sequence
		if (aborted || SIM_JS.SIMULATION_VARIABLES["terminated"] || (stateC[1] <= 1 && stateC[1] + stateC[0] + 1 > WW_JS.currentState["nbases"])) {

			//if (!RUNNING_FROM_COMMAND_LINE){
				WW_JS.currentState = STATE_JS.convertCompactStateToFullState(stateC);
				STATE_JS.updateCoordsOfcurrentState();
			//}

			PLOTS_JS.plots_complete_simulation_WW();
			OPS_JS.terminate_WW();


		}


		SIM_JS.SIMULATION_VARIABLES["terminated"] = false;

		// Pause at the end of every run to make sure that everything has loaded and page is responsive during termination
		setTimeout(function(){

			// Refresh the webworker
			var toCall = () => new Promise((resolve) => WW_JS.refresh_WW(resolve));
			toCall().then(() => {
				stateC = STATE_JS.convertFullStateToCompactState(WW_JS.currentState);
				WW_JS.setNextBaseToAdd_WW();
				
				SIM_JS.n_simulations_WW(n-1, stateC, resolve, msgID);
				
				/*
				toCall = () => new Promise((resolve) => OPS_JS.transcribe_WW(2, true, resolve));
				toCall().then(() => {
					SIM_JS.n_simulations_WW(n-1, resolve, msgID);
				});
				*/
				
			});


		}, 25);



	};


	var toCall = () => new Promise((resolve) => SIM_JS.trial_WW(stateC, resolve, msgID));
	toCall().then((aborted) => initialiseNextSimulation(aborted));



	
}


SIM_JS.trial_WW = function(stateC, resolve = function() { }, msgID = null){

	
	ANIMATION_TIME = ANIMATION_TIME_TEMP;
	
	
	// Stop the simulations or refresh to begin the next trial
	if (WW_JS.stopRunning_WW || SIM_JS.SIMULATION_VARIABLES["terminated"] || (stateC[1] <= 1 && stateC[1] + stateC[0] + 1 > WW_JS.currentState["nbases"])) {
		resolve(false);
		return;
	}


	printDateAndTime("Sampling action");
	var result = SIM_JS.sampleAction_WW(stateC);

	

	if (result["toDo"].length > 1){
		for (var i = 0; i < result["toDo"].length-1; i ++){
			SIM_JS.SIMULATION_ACTIONS[result["toDo"][i]](stateC); // Perform all actions in list except for the last one
		}
		//result["toDo"] = result["toDo"][result["toDo"].length-1]; // Last one
	}


	var actionToDo = SIM_JS.SIMULATION_ACTIONS[result["toDo"][result["toDo"].length-1]];

	if (actionToDo == null){
		resolve(true);
		return;
	}
	
	//console.log("Sampled", actionToDo, "state", stateC);

	//printDateAndTime("Updating plots");
	PLOTS_JS.updatePlotData_WW(stateC, result["toDo"], result["time"]);

	
	
	// If we have been pausing too long, then abort
	if (PLOTS_JS.arrestTimeoutReached){
		resolve(true);
		PLOTS_JS.arrestTimeoutReached = false;
		return;
	}

	

	var prepareForNextTrial = function(){


		printDateAndTime("Perparing for next trial");
		// If this is in animation mode, then this process is synchronous with rendering so we return in between operators
		// THIS BLOCK OF CODE WILL ONLY WORK IF NOT RUNNING AS A WEBWORKER
		if (!WW_JS.isWebWorker && !RUNNING_FROM_COMMAND_LINE){


			if (!RUNNING_FROM_COMMAND_LINE){
				WW_JS.currentState = STATE_JS.convertCompactStateToFullState(stateC);
				STATE_JS.updateCoordsOfcurrentState();
			}

			var toCall = () => new Promise((resolve) => renderObjects(false, resolve));
			toCall().then(() => {
				$("#bases").children().promise().done(function(){
					setNextBaseToAdd_controller();
					drawPlots();
					renderParameters();
					SIM_JS.trial_WW(stateC, resolve, msgID);
				});
			});

		}


		// Animation mode but for WebWorker
		else if (WW_JS.isWebWorker && ANIMATION_TIME > 1){
			WW_JS.currentState = STATE_JS.convertCompactStateToFullState(stateC);
			STATE_JS.updateCoordsOfcurrentState();

			setTimeout(function(){
				SIM_JS.trial_WW(stateC, resolve, msgID);
			}, ANIMATION_TIME + 5); // Give it an extra few ms to ensure that action has completed
		}


		// Ultrafast mode (instantaneous for the WebWorker), or command line mode. Running this way without a WebWorker will crash the browser
		else{
			SIM_JS.trial_WW(stateC, resolve, msgID);
		}



	};


	printDateAndTime("Executing action");
	// If we are running on ultrafast mode then this fills up the thread. So we should pause every now and then
	// in case the user has another request (eg. stop).
	actionsSinceLastPause--;
	if (WW_JS.isWebWorker && (ANIMATION_TIME == 1 || ANIMATION_TIME == 0) && actionsSinceLastPause <= 0){
		actionsSinceLastPause = pauseEveryNActions;

		//console.log("Pausing");
		
		if (WW_JS.isWebWorker){
			//postMessage("MSG: yes pause");
		}

		simulationOnPause = true;


		// Ultrafast mode -> render html then continue when its done
		if (ANIMATION_TIME == 1) {

			WW_JS.currentState = STATE_JS.convertCompactStateToFullState(stateC);
			STATE_JS.updateCoordsOfcurrentState();
			postMessage("_renderHTML_ultrafast()");
		

			resumeSimulation_WW = function(){

				simulationOnPause = false;
				var toCall = (state) => new Promise((resolve) => actionToDo(state, resolve));
				toCall(stateC).then(() => prepareForNextTrial());

			} 
		}

		// Hidden mode
		else{
			if (!RUNNING_FROM_COMMAND_LINE) WW_JS.currentState = STATE_JS.convertCompactStateToFullState(stateC);
			var toCall = (state) => new Promise((resolve) => actionToDo(state, resolve));
			toCall(stateC).then(() => prepareForNextTrial());

		}



	}else{



		var toCall = (state) => new Promise((resolve) => actionToDo(state, resolve));
		toCall(stateC).then(() => prepareForNextTrial());

	}





}




SIM_JS.sampleAction_WW = function(stateC){


	// If the polymerase is on the very left then move forward
	//if (WW_JS.currentState["leftGBase"] == 0) return {"toDo": 1, "time": 0};



	// If NTP is not bound retrieve translocation rates from cache
	var kBck = 0;
	var kFwd = 0
	if (!stateC[2]){
		var rateFwdAndBack = STATE_JS.getTranslocationRates(stateC);
		kFwd = rateFwdAndBack[1];
		kBck = rateFwdAndBack[0];
		
		if (stateC[3] && stateC[1] == 0 && !FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowBacktrackWithoutInactivation"]) kBck = 0; // If state is active but we don't allow backtracking while active then set rate to zero
		
	}
	var kRelease = stateC[2] ? FE_JS.getReleaseRate(WW_JS.getBaseInSequenceAtPosition_WW("m" + (stateC[1] + stateC[0]))) : 0; // Can only release NTP if it is bound
	var kAct = stateC[3] ? 0 : PARAMS_JS.PHYSICAL_PARAMETERS["kA"]["val"]; // Can only activate if it is deactivated
	var kDeact = stateC[3] && !stateC[2] && FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowInactivation"] ? PARAMS_JS.PHYSICAL_PARAMETERS["kU"]["val"] : 0; // Can only deactivate if it is activated, NTP is not bound, and model permits it
	
	//if (kFwd != 0) kFwd = 36.9;
	//if (kBck != 0) kBck = 57.5;

	//console.log("state", stateC, "kbck", kBck);

	//console.log("Rate back old", propSlideBackOLD, "rate back new", propSlideBack);
	//console.log("Rate fwd old", propSlideFwdOLD, "rate fwd new", propSlideFwd);

	//console.log("kRelease", kRelease);


	var toDo = -1;
	var minReactionTime = -1;
	var actionsToDoList = [];



	// If ready to bind and the model settings are right, then use the geometric boost
	if (!FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["assumeBindingEquilibrium"] && 
		!FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["assumeTranslocationEquilibrium"] && 
		stateC[1] == 1 && !stateC[2] && stateC[3] && FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowGeometricCatalysis"] && 
		FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["id"] == "simpleBrownian"){

		//console.log("allowGeometricCatalysis");



		var baseToTranscribe = WW_JS.getBaseInSequenceAtPosition_WW("g" + (stateC[1] + stateC[0]));



		var result = WW_JS.sampleBaseToAdd(baseToTranscribe);
		var kBind = result["rate"];
		SIM_JS.SIMULATION_VARIABLES["baseToAdd"] = result["base"];  
		kRelease = FE_JS.getReleaseRate(result["base"]); 
		kcat = FE_JS.getCatalysisRate(result["base"])
		var rateRelCat = kRelease + kcat;

		var rateBindRelease = kBind * kRelease / rateRelCat;
		var rate = kBck + kFwd + kRelease + kBind + kAct + kDeact;


		// Keep sampling until it is NOT bind release
		var runif = MER_JS.random() * rate;
		minReactionTime = 0;
		while(runif < rateBindRelease){

			
			// This block must be resampled every time if we are using 4 different catalysis rates and 4 different dissociation constants
			if (FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["NTPbindingNParams"] == 8){
				result = WW_JS.sampleBaseToAdd(baseToTranscribe);
				kBind = result["rate"];
				SIM_JS.SIMULATION_VARIABLES["baseToAdd"] = result["base"];  


				kRelease = FE_JS.getReleaseRate(result["base"]); 
				kcat = FE_JS.getCatalysisRate(result["base"])
				rateRelCat = kRelease + kcat;

				rateBindRelease = kBind * kRelease / rateRelCat;
				rate = kBck + kFwd + kRelease + kBind + kAct + kDeact;
			}

			minReactionTime += WW_JS.rexp(rate); // Time taken to bind
			minReactionTime += WW_JS.rexp(rateRelCat); // Time taken to release

			runif = MER_JS.random() * rate;
		}
		minReactionTime += WW_JS.rexp(rate);


		// Choose next action uniformly
		var rateBindCat =     kBind * kcat / rateRelCat;
		var rates = [kBck, kFwd, kRelease, rateBindCat, kAct, kDeact];
		var sum = kBck + kFwd + kRelease + rateBindCat + kAct + kDeact;
		runif = MER_JS.random() * sum;
		var cumsum = 0;
		for (var i = 0; i < rates.length; i ++){
			cumsum += rates[i];
			if (runif < cumsum) {
				toDo = i;
				break;
			}

		}

		// If next action is bindcat then add the time for catalysis
		actionsToDoList = [toDo];
		if (toDo == 3) {
			minReactionTime += WW_JS.rexp(rateRelCat);
			actionsToDoList = [3,3];
		}
		

	} else {


		

		var kBindOrCat = 0; // Sample binding or catalysis rate
		var sampledBaseToAdd = null;
		if (stateC[1] == 1 && stateC[3]){

			// Sample which base to add
			var baseToTranscribe = WW_JS.getBaseInSequenceAtPosition_WW("g" + (stateC[1] + stateC[0]));
			sampledBaseToAdd = WW_JS.sampleBaseToAdd(baseToTranscribe);

			if (stateC[2]) kBindOrCat = FE_JS.getCatalysisRate(sampledBaseToAdd["base"]); // If NTP bound then use rate of catalysis
			else{ // Otherwise use binding rate
				kBindOrCat = sampledBaseToAdd["rate"];
				SIM_JS.SIMULATION_VARIABLES["baseToAdd"] = sampledBaseToAdd["base"];
			}
		}


		// If NTP is not bound and we are in posttranslocated state, and user has requested to assume binding equilibrium but NOT translocation
		var justBindingEquilibrium =     FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["assumeBindingEquilibrium"]
								 && !FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["assumeTranslocationEquilibrium"] 
								 && stateC[1] == 1 && !stateC[2] && stateC[3];



		// If NTP is not bound and we are in pre/posttranslocated state, and user has requested to assume translocation equilibrium but NOT binding
		var justTranslocationEquilibrium =  !FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["assumeBindingEquilibrium"]
											&&  FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["assumeTranslocationEquilibrium"] 
											&& (stateC[1] == 0 || stateC[1] == 1) && !stateC[2] && stateC[3];




		// If we are in pre/posttranslocated state, and user has requested to assume translocation equilibrium AND binding equilibrium
		var bindingAndTranslocationEquilibrium =  	   FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["assumeBindingEquilibrium"]
													&& FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["assumeTranslocationEquilibrium"] 
													&& (stateC[1] == 0 || stateC[1] == 1)  && !stateC[2] && stateC[3];




		// Assume equilbirium between bound and unbound states but NOT pre and post translocated states
		if(justBindingEquilibrium){
			

			var KD_name = FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["NTPbindingNParams"] == 2 ? "Kdiss" : "Kdiss_" + sampledBaseToAdd["base"] + "TP";
			var NTPconc_name = !FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["useFourNTPconcentrations"] ? "NTPconc" : sampledBaseToAdd["base"] + "TPconc";
			var KD = PARAMS_JS.PHYSICAL_PARAMETERS[KD_name]["val"];
			var NTPconc = PARAMS_JS.PHYSICAL_PARAMETERS[NTPconc_name]["val"];
			var probabilityBound = (NTPconc/KD) / (NTPconc/KD + 1);
			var probabilityUnbound = 1 - probabilityBound;
			
			//console.log("Current base", sampledBaseToAdd["base"] , "KD = ", KD, "conc = ", NTPconc, "pbound = ", probabilityBound);


			kBindOrCat = FE_JS.getCatalysisRate(sampledBaseToAdd["base"]) * probabilityBound; // Can only catalyse if NTP bound

			kFwd = kFwd * probabilityUnbound; // Can only translocate if NTP is not bound
			kBck = kBck * probabilityUnbound;
			kDeact = kDeact * probabilityUnbound; // Can only deactivate if NTP is not bound


		}



		// Assume equilbirium between pre and post translocated states but NOT between bound and unbound states
		else if(justTranslocationEquilibrium){


			// Get rate of translocating from 0 to 1
			var currentTranslocationPosition = stateC[1];
			stateC[1] = 0; 
			var k0_1 = STATE_JS.getTranslocationRates(stateC)[1];
			var k0_minus1 = STATE_JS.getTranslocationRates(stateC)[0];


			// Get rate of translocating from 1 to 0
			stateC[1] = 1; 
			var k1_0 = STATE_JS.getTranslocationRates(stateC)[0];
			var k1_2 = STATE_JS.getTranslocationRates(stateC)[1];


			stateC[1] = currentTranslocationPosition;


			var eqConstantFwdTranslocation = k0_1 / k1_0;
			var probabilityPosttranslocated = eqConstantFwdTranslocation / (eqConstantFwdTranslocation + 1);
			var probabilityPretranslocated = 1 - probabilityPosttranslocated;

			

			// Can only bind NTP if not beyond the end of the sequence, go forward to terminate
			if (stateC[0] + 1 < WW_JS.currentState["nbases"]){

				// Sample a base to add
				var baseToTranscribe = WW_JS.getBaseInSequenceAtPosition_WW("g" + (1 + stateC[0]));
				sampledBaseToAdd = WW_JS.sampleBaseToAdd(baseToTranscribe);
				kBindOrCat = sampledBaseToAdd["rate"]  * probabilityPosttranslocated; // Can only bind if in posttranslocated state
				SIM_JS.SIMULATION_VARIABLES["baseToAdd"] = sampledBaseToAdd["base"];

			}


			kFwd = k1_2 * probabilityPosttranslocated; // Can only enter hypertranslocated state from posttranslocated
			kBck = k0_minus1 * probabilityPretranslocated; // Can only backtrack from pretranslocated
			kDeact = kDeact; // Can deactivate from either state with equal probability

			//console.log("Rate bind", kBindOrCat, kFwd, kBck);
			if (stateC[0] == 25) {
				//console.log("probabilityPosttranslocated", probabilityPosttranslocated, stateC, "kFwd", kFwd, "kBck", kBck);
			}

		}



		// Assume equilbirium between pre and post translocated states AND between bound and unbound states
		else if (bindingAndTranslocationEquilibrium){


			// Get rate of translocating from 0 to 1
			var currentTranslocationPosition = stateC[1];
			stateC[1] = 0; 
			var k0_1 = STATE_JS.getTranslocationRates(stateC)[1];
			var k0_minus1 = STATE_JS.getTranslocationRates(stateC)[0];

			// Get rate of translocating from 1 to 0
			stateC[1] = 1; 
			var k1_0 = STATE_JS.getTranslocationRates(stateC)[0];
			var k1_2 = STATE_JS.getTranslocationRates(stateC)[1];
			stateC[1] = currentTranslocationPosition;



			//console.log("sampledBaseToAdd", sampledBaseToAdd);






			var thisFullState = STATE_JS.convertCompactStateToFullState(stateC);
			var slidingTroughHeights = FE_JS.update_slidingTroughHeights_WW(thisFullState, true, true);
			var boltzmannG0 = Math.exp(-(stateC[1] == 0 ? slidingTroughHeights[3] : slidingTroughHeights[2]));
			var boltzmannG1 = Math.exp(-(stateC[1] == 0 ? slidingTroughHeights[4] : slidingTroughHeights[3]));
			var boltzmannGN = 0;

			// Get KD and [NTP]
			if (stateC[0] + 1 < WW_JS.currentState["nbases"]){

				var baseToTranscribe = WW_JS.getBaseInSequenceAtPosition_WW("g" + (1 + stateC[0]));
				sampledBaseToAdd = WW_JS.sampleBaseToAdd(baseToTranscribe);
				SIM_JS.SIMULATION_VARIABLES["baseToAdd"] = sampledBaseToAdd["base"];
				var KD_name = FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["NTPbindingNParams"] == 2 ? "Kdiss" : "Kdiss_" + sampledBaseToAdd["base"] + "TP";
				var NTPconc_name = !FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["useFourNTPconcentrations"] ? "NTPconc" : sampledBaseToAdd["base"] + "TPconc";
				var KD = PARAMS_JS.PHYSICAL_PARAMETERS[KD_name]["val"];
				var NTPconc = PARAMS_JS.PHYSICAL_PARAMETERS[NTPconc_name]["val"];
				boltzmannGN = boltzmannG1 * NTPconc / KD;

			}


		


			// Calculate the probabilities of being in the 3 states (0, 1 and 1N)
			/*
			var A = KD / NTPconc;
			var B = k0_1 / k1_0;
			var probabilityPretranslocated = A / (A*B + A + B);
			var probabilityPosttranslocated = A*B / (A*B + A + B);
			var probabilityBound = B / (A*B + A + B);
			*/


			var normalisationZ = boltzmannG0 + boltzmannG1 + boltzmannGN;

			var probabilityPretranslocated = boltzmannG0 / normalisationZ;
			var probabilityPosttranslocated = boltzmannG1 / normalisationZ;
			var probabilityBound = boltzmannGN / normalisationZ;


			// Can only catalyse if not beyond the end of the sequence, go forward to terminate
			if (stateC[0] + 1 < WW_JS.currentState["nbases"]){
				kBindOrCat = FE_JS.getCatalysisRate(sampledBaseToAdd["base"]) * probabilityBound; // Can only catalyse if NTP bound
			}


			kFwd = k1_2 * probabilityPosttranslocated; // Can only enter hypertranslocated state from posttranslocated
			kBck = k0_minus1 * probabilityPretranslocated; // Can only backtrack from pretranslocated
			kDeact = kDeact * (probabilityPosttranslocated + probabilityPretranslocated); // Can only deactivate from post and pretranslocated states

			//console.log("probabilityPretranslocated", probabilityPretranslocated, "probabilityPosttranslocated", probabilityPosttranslocated, "probabilityBound", probabilityBound);



		}




		// Sample 1 random from exp(rateSum) where rateSum is the sum of all rates
		var rates = [kBck, kFwd, kRelease, kBindOrCat, kAct, kDeact];
		var rateSum = 0;
		for (var i = 0; i < rates.length; i++) rateSum += rates[i];
		minReactionTime =  WW_JS.rexp(rateSum);



		// Select which reaction just occurred by sampling proportional to their rates
		var runif = MER_JS.random() * rateSum;
		var cumsum = 0;
		for (var i = 0; i < rates.length; i ++){
			cumsum += rates[i];
			if (runif < cumsum) {
				toDo = i;
				break;
			}

		}




		actionsToDoList = [toDo];

		// If assume binding equilibrium and sampled catalysis then this is actually a double operation (bind then catalysis)
		if(justBindingEquilibrium && toDo == 3){
			actionsToDoList = [3, 3];
		}


		// If assume translocation equilibrium
		else if(justTranslocationEquilibrium){

			if (toDo == 3 && stateC[1] == 0) actionsToDoList = [1, 3]; // Need to be in posttranslocated state before binding 
			else if (toDo == 1 && stateC[1] == 0) actionsToDoList = [1, 1]; // Need to be in posttranslocated state before moving forward 
			else if (toDo == 0 && stateC[1] == 1) actionsToDoList = [0, 0]; // Need to be in pretranslocated state before moving backwards 

		}



		// If assume binding AND translocation equilibrium. NTP is required to be unbound
		else if(bindingAndTranslocationEquilibrium){

			if (toDo == 3 && stateC[1] == 0) actionsToDoList = [1, 3, 3]; // Forward, bind, catalyse
			else if (toDo == 3 && stateC[1] == 1) actionsToDoList = [3, 3]; // Bind, catalyse
			else if (toDo == 1 && stateC[1] == 0) actionsToDoList = [1, 1]; // Forward, forward
			else if (toDo == 0 && stateC[1] == 1) actionsToDoList = [0, 0]; // Backwards, backwards

		}



	}


	if (stateC[0] == 25) {
		//console.log("actionsToDoList", actionsToDoList, stateC);
	}

	return {"toDo": actionsToDoList, "time": minReactionTime};
	
	
	
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





function update_slippingPeakHeights(S = 0){
	
	
	if (true || terminated) return [maxHeight,maxHeight,maxHeight,maxHeight,maxHeight,maxHeight];
	
	slippingPeakHeightsTemp = [PARAMS_JS.PHYSICAL_PARAMETERS["GDaggerDiffuse"]["val"],PARAMS_JS.PHYSICAL_PARAMETERS["GDaggerDiffuse"]["val"],PARAMS_JS.PHYSICAL_PARAMETERS["GDaggerDiffuse"]["val"],PARAMS_JS.PHYSICAL_PARAMETERS["GDaggerDiffuse"]["val"],PARAMS_JS.PHYSICAL_PARAMETERS["GDaggerDiffuse"]["val"],PARAMS_JS.PHYSICAL_PARAMETERS["GDaggerDiffuse"]["val"]];

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




if (RUNNING_FROM_COMMAND_LINE){


	module.exports = {
		SIMULATION_VARIABLES: SIM_JS.SIMULATION_VARIABLES,
		SIMULATION_ACTIONS: SIM_JS.SIMULATION_ACTIONS,
		renderPlotsEveryMS: SIM_JS.renderPlotsEveryMS,
		startTrials_WW: SIM_JS.startTrials_WW,
		renderPlotsHidden: SIM_JS.renderPlotsHidden,
		n_simulations_WW: SIM_JS.n_simulations_WW,
		trial_WW: SIM_JS.trial_WW,
		sampleAction_WW: SIM_JS.sampleAction_WW
	}

}