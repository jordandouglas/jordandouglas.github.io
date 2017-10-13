
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


FE_JS = {};


FE_JS.ELONGATION_MODELS = {};
FE_JS.ELONGATION_MODELS["simpleBrownian"] = {id: "simpleBrownian", name: "Simple Brownian ratchet model", allowBacktracking: false, allowHypertranslocation: false, 
										allowInactivation:false, allowBacktrackWithoutInactivation:false, deactivateUponMisincorporation: false, 
										allowGeometricCatalysis: false, allowmRNAfolding:false, allowMisincorporation:false, useFourNTPconcentrations:false,
										NTPbindingNParams: 2};
//FE_JS.ELONGATION_MODELS["twoSiteBrownian"] = {id: "twoSiteBrownian",name: "Brownian ratchet model with 2 NTP binding sites", allowBacktracking: true, allowHypertranslocation: false, allowInactivation:true, allowBacktrackWithoutInactivation:false, deactivateUponMisincorporation:false, allowGeometricCatalysis: false, allowmRNAfolding:true, allowMisincorporation:false};
FE_JS.currentElongationModel = "simpleBrownian";


FE_JS.TRANSLOCATION_MODELS = {};
FE_JS.TRANSLOCATION_MODELS["midpointBarriers"] = {id: "midpointBarriers", name: "Midpoint"};
FE_JS.TRANSLOCATION_MODELS["meltingBarriers"] = {id: "meltingBarriers", name: "Melting"};
FE_JS.currentTranslocationModel = "meltingBarriers";






FE_JS.initFreeEnergy_WW = function(){



	FE_JS.RT = 0.63;
	FE_JS.BasePairParams = init_BP_parameters_WW();
	FE_JS.LoopParams1x1 = init_1x1_loop_parameters_WW();
	FE_JS.LoopParams2x1 = init_2x1_loop_parameters_WW();
	FE_JS.LoopParams2x2 = init_2x2_loop_parameters_WW();
	FE_JS.SpecialHairpinParams = init_special_hairpin_parameters_WW();
	FE_JS.TerminalMismatchParams = init_terminal_mismatch_parameters_WW();


	PARAMS_JS.PHYSICAL_PARAMETERS["GsecondarySitePenalty"]["hidden"] = FE_JS.currentElongationModel != "twoSiteBrownian";
	PARAMS_JS.PHYSICAL_PARAMETERS["nbpToFold"]["hidden"] = !FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowmRNAfolding"];


}




 FE_JS.getElongationModels_WW = function(resolve, msgID){

	if (resolve === undefined) resolve = function() {};
	if (msgID === undefined) msgID = null;

	var toReturn = {currentElongationModel: FE_JS.currentElongationModel, ELONGATION_MODELS: FE_JS.ELONGATION_MODELS, currentTranslocationModel: FE_JS.currentTranslocationModel, TRANSLOCATION_MODELS: FE_JS.TRANSLOCATION_MODELS};

	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
	}

	else{
		resolve(toReturn);
	}

}


// When use changes the model settings (typically by changing one of the checkboxes) some of the parameters need updating
 FE_JS.userInputModel_WW = function(elongationModelID, translocationModelID, allowBacktracking, allowHypertranslocation, allowInactivation, allowBacktrackWithoutInactivation, deactivateUponMisincorporation, allowGeometricCatalysis, allowmRNAfolding, allowMisincorporation, useFourNTPconcentrations, NTPbindingNParams, resolve, msgID){

	if (resolve === undefined) resolve = function() {};
	if (msgID === undefined) msgID = null;

	var needToInitBindingMatrix = (allowMisincorporation != null && FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowMisincorporation"] != allowMisincorporation) ||
								  FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["useFourNTPconcentrations"] != useFourNTPconcentrations || 
								  (NTPbindingNParams != null && FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["NTPbindingNParams"] != NTPbindingNParams);

	FE_JS.currentElongationModel = elongationModelID;
	FE_JS.currentTranslocationModel = translocationModelID;
	FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowBacktracking"] = allowBacktracking;
	FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowHypertranslocation"] = allowHypertranslocation;
	FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowInactivation"] = allowInactivation;
	FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowBacktrackWithoutInactivation"] = allowBacktrackWithoutInactivation;
	if(deactivateUponMisincorporation != null) FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["deactivateUponMisincorporation"] = deactivateUponMisincorporation;
	FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowGeometricCatalysis"] = allowGeometricCatalysis;
	FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowmRNAfolding"] = allowmRNAfolding;
	FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["useFourNTPconcentrations"] = useFourNTPconcentrations;
	if(allowMisincorporation != null) FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowMisincorporation"] = allowMisincorporation;
	if(NTPbindingNParams != null) FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["NTPbindingNParams"] = NTPbindingNParams;




	PARAMS_JS.PHYSICAL_PARAMETERS["GsecondarySitePenalty"]["hidden"] = FE_JS.currentElongationModel != "twoSiteBrownian";
	PARAMS_JS.PHYSICAL_PARAMETERS["nbpToFold"]["hidden"] = !allowmRNAfolding
	
	if(allowMisincorporation != null) PARAMS_JS.PHYSICAL_PARAMETERS["RateMisbind"]["hidden"] = !allowMisincorporation;
	PARAMS_JS.PHYSICAL_PARAMETERS["TransitionTransversionRatio"]["hidden"] = true;// !allowMisincorporation;
	
	PARAMS_JS.PHYSICAL_PARAMETERS["kA"]["hidden"] = !allowInactivation;
	PARAMS_JS.PHYSICAL_PARAMETERS["kU"]["hidden"] = !allowInactivation;


	PARAMS_JS.PHYSICAL_PARAMETERS["GHyper"]["hidden"] = !allowHypertranslocation;

	PARAMS_JS.PHYSICAL_PARAMETERS["NTPconc"]["hidden"] = useFourNTPconcentrations;
	PARAMS_JS.PHYSICAL_PARAMETERS["ATPconc"]["hidden"] = !useFourNTPconcentrations;
	PARAMS_JS.PHYSICAL_PARAMETERS["CTPconc"]["hidden"] = !useFourNTPconcentrations;
	PARAMS_JS.PHYSICAL_PARAMETERS["GTPconc"]["hidden"] = !useFourNTPconcentrations;
	PARAMS_JS.PHYSICAL_PARAMETERS["UTPconc"]["hidden"] = !useFourNTPconcentrations;



	if(NTPbindingNParams != null){
		PARAMS_JS.PHYSICAL_PARAMETERS["kCat"]["hidden"] = NTPbindingNParams == 8;
		PARAMS_JS.PHYSICAL_PARAMETERS["kCat_ATP"]["hidden"] = NTPbindingNParams != 8;
		PARAMS_JS.PHYSICAL_PARAMETERS["kCat_CTP"]["hidden"] = NTPbindingNParams != 8;
		PARAMS_JS.PHYSICAL_PARAMETERS["kCat_GTP"]["hidden"] = NTPbindingNParams != 8;
		PARAMS_JS.PHYSICAL_PARAMETERS["kCat_UTP"]["hidden"] = NTPbindingNParams != 8;

		PARAMS_JS.PHYSICAL_PARAMETERS["Kdiss"]["hidden"] = NTPbindingNParams == 8;
		PARAMS_JS.PHYSICAL_PARAMETERS["Kdiss_ATP"]["hidden"] = NTPbindingNParams != 8;
		PARAMS_JS.PHYSICAL_PARAMETERS["Kdiss_CTP"]["hidden"] = NTPbindingNParams != 8;
		PARAMS_JS.PHYSICAL_PARAMETERS["Kdiss_GTP"]["hidden"] = NTPbindingNParams != 8;
		PARAMS_JS.PHYSICAL_PARAMETERS["Kdiss_UTP"]["hidden"] = NTPbindingNParams != 8;
	}


	if(needToInitBindingMatrix) {
		WW_JS.initMisbindingMatrix();
		WW_JS.setNextBaseToAdd_WW();
	}
	



	STATE_JS.translocationCacheNeedsUpdating = true;
	STATE_JS.initTranslocationRateCache();


	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]));
	}

	else{
		resolve(FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]);
	}

}


// Returns everything necessary to populate the NTP parameters popup
 FE_JS.getNTPparametersAndSettings_WW = function(resolve, msgID){


	if (resolve === undefined) resolve = function() {};
	if (msgID === undefined) msgID = null;


	var toReturn = {params: PARAMS_JS.PHYSICAL_PARAMETERS, model: FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]}

	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
	}
	else{
		resolve(toReturn);
	}



}


 FE_JS.calculateAllBarrierHeights_WW = function(sampleAll){

	if (sampleAll === undefined) sampleAll = true;

	FE_JS.getSlidingHeights_WW(sampleAll);

}




 FE_JS.getSlidingHeights_WW = function(sampleAll, ignoreModelOptions, resolve, msgID){

	if (sampleAll === undefined) sampleAll = true;
	if (ignoreModelOptions === undefined) ignoreModelOptions = false;
	if (resolve === undefined) resolve = function(heights) {};
	if (msgID === undefined) msgID = null;


	// Will add DGslide to the appropriate peak

	// Otherwise we calculate from sr
	slidingTroughHeights = FE_JS.update_slidingTroughHeights_WW(WW_JS.currentState, true, sampleAll);
	slidingPeakHeights = FE_JS.update_slidingPeakHeights_WW(WW_JS.currentState, true, sampleAll, ignoreModelOptions);

	var toReturn = {slidingPeakHeights: slidingPeakHeights, slidingTroughHeights: slidingTroughHeights};




	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
		return;
	}
	resolve(toReturn);



}



// If addParamsToPeaks is true, will add DeltaGSlide and Fassist to the appropriate peaks
// Otherwise will not add them yet. This is for efficiency reasons. If we ignore these parameters now we do not need to reset the cache when they change
 FE_JS.update_slidingPeakHeights_WW = function(stateToCalculateFor, addParamsToPeaks, sampleAll, ignoreModelOptions){


	if (stateToCalculateFor === undefined) stateToCalculateFor = null;
	if (addParamsToPeaks === undefined) addParamsToPeaks = true;
	if (sampleAll === undefined) sampleAll = true;
	if (ignoreModelOptions === undefined) ignoreModelOptions = false;	


	if (stateToCalculateFor == null) stateToCalculateFor = WW_JS.currentState;

	var slidingPeakHeightsTemp = addParamsToPeaks ? [PARAMS_JS.PHYSICAL_PARAMETERS["GDagSlide"]["val"], PARAMS_JS.PHYSICAL_PARAMETERS["GDagSlide"]["val"],PARAMS_JS.PHYSICAL_PARAMETERS["GDagSlide"]["val"],PARAMS_JS.PHYSICAL_PARAMETERS["GDagSlide"]["val"],PARAMS_JS.PHYSICAL_PARAMETERS["GDagSlide"]["val"],PARAMS_JS.PHYSICAL_PARAMETERS["GDagSlide"]["val"]] : [0,0,0,0,0,0];
	
	if (stateToCalculateFor["terminated"]) return [maxHeight,maxHeight,maxHeight,maxHeight,maxHeight,maxHeight];

	// If the single NTP binding site model is selected then sliding is not allowed if NTP is bound 
	if (!ignoreModelOptions && FE_JS.currentElongationModel == "simpleBrownian" && stateToCalculateFor["NTPbound"]) {
		return [maxHeight, maxHeight, maxHeight, maxHeight, maxHeight, maxHeight];
	}




	//if (2 - (WebWorkerVariables["rightGBase"] - WebWorkerVariables["specialSite"]) >= 0 && 2 - (WebWorkerVariables["rightGBase"] - WebWorkerVariables["specialSite"]) < 6 ) slidingPeakHeightsTemp[2 - (WebWorkerVariables["rightGBase"] - WebWorkerVariables["specialSite"])] += WebWorkerVariables["GDaggerSpecial"] ;

	
	// Slide backwards
	var state = WW_JS.getcurrentStateCopy_WW(stateToCalculateFor);
	for (var pos = 2; pos >= 0; pos --){


			if (!sampleAll && pos <= 1) break; // Only sample the peak left of the main trough for effiency

			var statePreOperation = WW_JS.getcurrentStateCopy_WW(state);
			var possibleOperation = OPS_JS.backwards_WW(state, false);


			if (!possibleOperation) {
				slidingPeakHeightsTemp[pos] = maxHeight;
				break;
			}


			// Do not backtrack if it will cause the bubble to be open on the 3' end
			if (statePreOperation["leftGBase"] - PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"] -1 <= 2){
				slidingPeakHeightsTemp[pos] = maxHeight;
				break;
			}


			// Check if backtracking is permitted
			if (!ignoreModelOptions && !FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowBacktracking"] && state["mRNAPosInActiveSite"] < 0){
				slidingPeakHeightsTemp[pos] = maxHeight;
				break;
			}

			// Check if backtracking is permitted while activated
			if (!ignoreModelOptions && !FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowBacktrackWithoutInactivation"] && state["activated"] && state["mRNAPosInActiveSite"] == -1){
				slidingPeakHeightsTemp[pos] = maxHeight;
				break;
			}

			// If the 2 NTP binding site model is selected and if NTP is bound then we cannot leave range [0,1]
			if (FE_JS.currentElongationModel == "twoSiteBrownian" && statePreOperation["NTPbound"] && (state["mRNAPosInActiveSite"] < 0 || state["mRNAPosInActiveSite"] > 1)) {
				slidingPeakHeightsTemp[pos] = maxHeight;
				break;
			}


			// Add a penalty for having NTP in the secondary binding site
			if (FE_JS.currentElongationModel == "twoSiteBrownian" && state["mRNAPosInActiveSite"] == 0 && stateToCalculateFor["NTPbound"]){
				slidingPeakHeightsTemp[pos] += PARAMS_JS.PHYSICAL_PARAMETERS["GsecondarySitePenalty"]["val"];
			}


			// Hypertranslocation penalty
			if(FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowHypertranslocation"]){
				var hypertranslocationPenalty = Math.max(0, state["mRNAPosInActiveSite"] - 1.5) * PARAMS_JS.PHYSICAL_PARAMETERS["GHyper"]["val"];
				slidingPeakHeightsTemp[pos] += hypertranslocationPenalty;
			}


			// Midpoint model: free energy barrier is halfway between the two on either side
			if (FE_JS.currentTranslocationModel == "midpointBarriers"){

				slidingPeakHeightsTemp[pos] += (getFreeEnergyOfState_WW(statePreOperation) - getFreeEnergyOfTranscriptionBubble_WW(statePreOperation) + getFreeEnergyOfState_WW(state) - getFreeEnergyOfTranscriptionBubble_WW(state)) / 2;
				
				// Don't backtrack if it will break the structure
				if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(2) == "RNA" && FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowmRNAfolding"]){
					var structure = MFE_JS.calculateMFESequence_WW(statePreOperation)["structure"];
					if (structure[structure.length-1] == ")") slidingPeakHeightsTemp[pos] = maxHeight;
					//mRNAFreeEnergy = MFE_JS.calculateMFESequence_WW(state)["energy"];
				}
				


			}

			else if (FE_JS.currentTranslocationModel == "meltingBarriers"){

				slidingPeakHeightsTemp[pos] += getFreeEnergyOfIntermediateState_WW(statePreOperation, state);
				slidingPeakHeightsTemp[pos] -= getFreeEnergyOfTranscriptionBubbleIntermediate_WW(statePreOperation, state); // Subtract the free energy which we would gain if the intermediate transcription bubble was sealed

				// Add free energy of the two 


			}

			
			// Dislocating a nucleoprotein backwards is impossible.
			if (nucleoproteinPhase != -1){
				if ((state["leftGBase"] + 1 - templateExitChannelLength - 2 + nucleoproteinPhase) % 6 == 0){
					//slidingPeakHeightsTemp[pos] = maxHeight;
					
				}
			}

	
			
	}
	
	phosphoproteinBarrierHeight = 0;

	
	// Slide forward
	state = WW_JS.getcurrentStateCopy_WW(stateToCalculateFor);
	for (var pos = 4; pos <= 6; pos ++){

			if (!sampleAll && pos >= 5) break; // Only sample the peak left of the main trough for effiency


			var statePreOperation = WW_JS.getcurrentStateCopy_WW(state);
			var possibleOperation = OPS_JS.forward_WW(state, false);
			if (!possibleOperation) {
				slidingPeakHeightsTemp[pos-1] = maxHeight;
				break;
			}



			// Check if hypertranslocation is permitted
			if (!ignoreModelOptions && !FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowHypertranslocation"] && state["mRNAPosInActiveSite"] > 1){
				slidingPeakHeightsTemp[pos-1] = maxHeight;
				break;
			}


			// If the 2 NTP binding site model is selected and if NTP is bound then we cannot leave range [0,1]
			if (FE_JS.currentElongationModel == "twoSiteBrownian" && statePreOperation["NTPbound"] && (state["mRNAPosInActiveSite"] < 0 || state["mRNAPosInActiveSite"] > 1)) {
				slidingPeakHeightsTemp[pos-1] = maxHeight;
				break;
			}


			// Add a penalty for having NTP in the secondary binding site
			if (FE_JS.currentElongationModel == "twoSiteBrownian" && state["mRNAPosInActiveSite"] == 1 && stateToCalculateFor["NTPbound"]){
				slidingPeakHeightsTemp[pos-1] += PARAMS_JS.PHYSICAL_PARAMETERS["GsecondarySitePenalty"]["val"];
			}


			// Hypertranslocation penalty
			if(FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowHypertranslocation"]){
				var hypertranslocationPenalty = Math.max(0, statePreOperation["mRNAPosInActiveSite"] - 0.5) * PARAMS_JS.PHYSICAL_PARAMETERS["GHyper"]["val"];
				slidingPeakHeightsTemp[pos-1] += hypertranslocationPenalty;
			}



			// Midpoint model: free energy barrier is halfway between the two on either side
			if (FE_JS.currentTranslocationModel == "midpointBarriers"){

				slidingPeakHeightsTemp[pos-1] += (getFreeEnergyOfState_WW(statePreOperation) - getFreeEnergyOfTranscriptionBubble_WW(statePreOperation) + getFreeEnergyOfState_WW(state) - getFreeEnergyOfTranscriptionBubble_WW(state)) / 2;
				
				
			}

			// Calculate the free energy of the intermediate state
			else if (FE_JS.currentTranslocationModel == "meltingBarriers"){

				slidingPeakHeightsTemp[pos-1] += getFreeEnergyOfIntermediateState_WW(statePreOperation, state);
				slidingPeakHeightsTemp[pos-1] -= getFreeEnergyOfTranscriptionBubbleIntermediate_WW(statePreOperation, state); // Subtract the free energy which we would gain if the intermediate transcription bubble was sealed
			
			}


			
			// Dislocating a nucleoprotein forwards has a penalty
			if (nucleoproteinPhase != -1){
				if ((state["rightGBase"]  + templateEntryChannelLength - 2 + nucleoproteinPhase) % 6 == 0){
					slidingPeakHeightsTemp[pos-1] += phosphoproteinBarrierHeight;
				}
			}


	}
	
	
	// Assisting force
	if (addParamsToPeaks){
		if (PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"] != 0){
			var gradient = (PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"] * 1e-12 * 3.4e-10) / (1.380649e-23 * 310) // Force x distance / kB T

			
			for (var i = 0; i < 6; i ++){
				if(slidingPeakHeightsTemp[i] != maxHeight) slidingPeakHeightsTemp[i] += gradient*(2.5-i);
			}
			
			
		}
	}

	
	return slidingPeakHeightsTemp;


}


 FE_JS.update_slidingTroughHeights_WW = function(stateToCalculateFor, addParamsToTroughs, sampleAll){


	if (stateToCalculateFor === undefined) stateToCalculateFor = WW_JS.currentState;
	if (addParamsToTroughs === undefined) addParamsToTroughs = true;
	if (sampleAll === undefined) sampleAll = true;



	var slidingTroughHeightsTemp = [0,0,0,0,0,0,0];
	//if (terminated) return slidingTroughHeightsTemp;
	slidingTroughHeightsTemp[3] = getFreeEnergyOfState_WW(stateToCalculateFor, [TbulgePos]);
	//console.log("Hybrid string of transcription bubble:")
	slidingTroughHeightsTemp[3] -= getFreeEnergyOfTranscriptionBubble_WW(stateToCalculateFor); // Subtract the energy which we would gain if the transcription bubble was sealed




	// Add a penalty for having NTP in the secondary binding site
	if (FE_JS.currentElongationModel == "twoSiteBrownian" && stateToCalculateFor["mRNAPosInActiveSite"] == 0 && stateToCalculateFor["NTPbound"]){
		slidingTroughHeightsTemp[3] += PARAMS_JS.PHYSICAL_PARAMETERS["GsecondarySitePenalty"]["val"];
	}


	if(FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowHypertranslocation"]){
		var hypertranslocationPenalty = Math.max(0, stateToCalculateFor["mRNAPosInActiveSite"] - 1) * PARAMS_JS.PHYSICAL_PARAMETERS["GHyper"]["val"];
		slidingTroughHeightsTemp[3] += hypertranslocationPenalty;
	}
	
	// Slide backwards
	if (sampleAll){ // When simulating we only sample the middle trough (for efficiency) 

		var state = WW_JS.getcurrentStateCopy_WW(stateToCalculateFor);
		for (var pos = 2; sampleAll && pos >= 0; pos --){
				OPS_JS.backwards_WW(state, false);
				slidingTroughHeightsTemp[pos] = getFreeEnergyOfState_WW(state, [TbulgePos]);
				slidingTroughHeightsTemp[pos] -= getFreeEnergyOfTranscriptionBubble_WW(state); 


				// Add a penalty for having NTP in the secondary binding site
				if (FE_JS.currentElongationModel == "twoSiteBrownian" && state["mRNAPosInActiveSite"] == 0 && stateToCalculateFor["NTPbound"]){
					slidingTroughHeightsTemp[pos] += PARAMS_JS.PHYSICAL_PARAMETERS["GsecondarySitePenalty"]["val"];
				}


				// Hypertranslocation penalty
				if(FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowHypertranslocation"]){
					var hypertranslocationPenalty = Math.max(0, state["mRNAPosInActiveSite"] - 1) * PARAMS_JS.PHYSICAL_PARAMETERS["GHyper"]["val"];
					//console.log("1Current state", state["mRNAPosInActiveSite"], "penalty", hypertranslocationPenalty);
					slidingTroughHeightsTemp[pos] += hypertranslocationPenalty;
				}




		}
	}
	
	
	// Slide forward
	if (sampleAll){ // When simulating we only sample the middle trough (for efficiency)
		var state = WW_JS.getcurrentStateCopy_WW(stateToCalculateFor);
		for (var pos = 4; pos <= 6; pos ++){
				OPS_JS.forward_WW(state, false);
				slidingTroughHeightsTemp[pos] = getFreeEnergyOfState_WW(state, [TbulgePos]);
				if (slidingTroughHeightsTemp[pos] == null)  slidingTroughHeightsTemp[pos] = maxHeight;
				slidingTroughHeightsTemp[pos] -= getFreeEnergyOfTranscriptionBubble_WW(state); 

				// Add a penalty for having NTP in the secondary binding site
				if (FE_JS.currentElongationModel == "twoSiteBrownian" && state["mRNAPosInActiveSite"] == 0 && stateToCalculateFor["NTPbound"]){	
					slidingTroughHeightsTemp[pos] += PARAMS_JS.PHYSICAL_PARAMETERS["GsecondarySitePenalty"]["val"];
				}


				// Hypertranslocation penalty
				if(FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowHypertranslocation"]){
					var hypertranslocationPenalty = Math.max(0, state["mRNAPosInActiveSite"] - 1) * PARAMS_JS.PHYSICAL_PARAMETERS["GHyper"]["val"];
					//console.log("2Current state", state["mRNAPosInActiveSite"], "penalty", hypertranslocationPenalty);
					slidingTroughHeightsTemp[pos] += hypertranslocationPenalty;
				}

		}
	}
	
	// Special site
//	if (useParams && 2 - (rightGBase - specialSite) >= 0 && 2 - (rightGBase - specialSite) < 7 ) slidingTroughHeightsTemp[2 - (rightGBase - specialSite)] += specialHtrough;
	
	
	
	// Assisting force
	if (addParamsToTroughs){
		if (PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"] != 0){
			var gradient = (PARAMS_JS.PHYSICAL_PARAMETERS["FAssist"]["val"]* 1e-12 * 3.4e-10) / (1.380649e-23 * 310) // Force x distance (3.4A)
			
			for (var i = 0; i < 7; i ++){
				if(slidingTroughHeightsTemp[i] != maxHeight) slidingTroughHeightsTemp[i] += gradient*(3-i);
			}
			
			
		}
	}

	
	
	
	return slidingTroughHeightsTemp;
}










function getFreeEnergyOfState_WW(state){
	
	var hybridStrings = getHybridString_WW(state);
	var hybridFreeEnergy = getHybridFreeEnergy_WW(hybridStrings[0], hybridStrings[1], SEQS_JS.all_sequences[sequenceID]["template"].substring(2,5), SEQS_JS.all_sequences[sequenceID]["primer"].substring(2));


	// Include the free energy of the mRNA?
	var mRNAFreeEnergy = 0;
	if (false && SEQS_JS.all_sequences[sequenceID]["primer"].substring(2) == "RNA" && FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowmRNAfolding"]){
		var structure = MFE_JS.calculateMFESequence_WW(state)["structure"];
		console.log("XXX", structure, structure[structure.length-1], structure[structure.length-1] == ")");
		if (structure[structure.length-1] == ")") return null;
		//mRNAFreeEnergy = MFE_JS.calculateMFESequence_WW(state)["energy"];
	}


	return hybridFreeEnergy + mRNAFreeEnergy;


	
}


// Find free energy of state between states 1 and 2
function getFreeEnergyOfIntermediateState_WW(state1, state2){
	
	var hybridStrings1 = getHybridString_WW(state1);
	var hybridStrings2 = getHybridString_WW(state2);
	
	var intermediateString = getHybridIntermediateString_WW(hybridStrings1, hybridStrings2, state1["leftGBase"], state1["leftMBase"], state2["leftGBase"], state2["leftMBase"]);
	
	//console.log("Free energy of\n", state1["leftGBase"], "-", hybridStrings1[0], "\n", state1["leftMBase"], "-",  hybridStrings1[1], "\n + \n", state2["leftGBase"], "-", hybridStrings2[0], "\n", state2["leftMBase"], "-", hybridStrings2[1], "\n = \n", intermediateString[0], "\n", intermediateString[1], "\n\n");
	
	
	return getHybridFreeEnergy_WW(intermediateString[0], intermediateString[1], SEQS_JS.all_sequences[sequenceID]["template"].substring(2,5), SEQS_JS.all_sequences[sequenceID]["primer"].substring(2));
	
}



// Returns the increase in free energy which the double stranded template would have if the transcription bubble was sealed
// leftmostTemplatePos is the last base in the template which is basepairing before the bubble (e in the example below)
// complementary    ABCDEFGHIJKLM
// template         abcde	 jklm
// template              fghi
// primer                1234
function getFreeEnergyOfTranscriptionBubble_WW(state, p){

	if (p === undefined) p = false;
	
	// If single stranded template then there is no energy loss
	if (SEQS_JS.all_sequences[sequenceID]["template"].substring(0,2) == "ss") return 0;
	
	var leftmostTemplatePos = state["leftGBase"] - PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"] - 1;
	var leftmostComplementPos = leftmostTemplatePos;
	var rightmostTemplatePos = state["rightGBase"] + PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"] + 1;
	var rightmostComplementPos = rightmostTemplatePos;
	
	
	var hybridStrings = getHybridStringOfTranscriptionBubble_WW(leftmostTemplatePos, rightmostTemplatePos, leftmostComplementPos, rightmostComplementPos);
	
	if (p) console.log(leftmostTemplatePos, leftmostComplementPos, rightmostTemplatePos, rightmostComplementPos, hybridStrings);
	
	return getFreeEnergyOfTranscriptionBubbleHybridString_WW(hybridStrings[0], hybridStrings[1], SEQS_JS.all_sequences[sequenceID]["template"].substring(2,5), p);

}


// Returns the increase in free energy which the double stranded template would have if the transcription bubble of the intermediate state was sealed
// The basepairing within this bubble is the union of the non-basepairing 
function getFreeEnergyOfTranscriptionBubbleIntermediate_WW(state1, state2){
	
	// If single stranded template then there is no energy loss
	if (SEQS_JS.all_sequences[sequenceID]["template"].substring(0,2) == "ss") return 0;
	
	var leftmostTemplatePos = Math.min(state1["leftGBase"], state2["leftGBase"]) - PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"] - 1;
	var leftmostComplementPos = leftmostTemplatePos;
	var rightmostTemplatePos = Math.max(state1["rightGBase"], state2["rightGBase"]) + PARAMS_JS.PHYSICAL_PARAMETERS["bubbleRight"]["val"] + 1;
	var rightmostComplementPos = rightmostTemplatePos;
	
	var hybridStrings = getHybridStringOfTranscriptionBubble_WW(leftmostTemplatePos, rightmostTemplatePos, leftmostComplementPos, rightmostComplementPos);
	return getFreeEnergyOfTranscriptionBubbleHybridString_WW(hybridStrings[0], hybridStrings[1], SEQS_JS.all_sequences[sequenceID]["template"].substring(2,5));
	
}

function getHybridStringOfTranscriptionBubble_WW(leftmostTemplatePos, rightmostTemplatePos, leftmostComplementPos, rightmostComplementPos){
	
	
	// Build strings
	
	// template   3' AACGATTCGAT
	// complement 5' TTGCTAAGCTA
	var templateString = "";
	var complementString = "";
	for (var i = leftmostTemplatePos; i <= rightmostTemplatePos; i ++){
		if (i < 1) continue;
		if (i >= WW_JS.currentState["nbases"]) break;
		templateString += templateSequence[i]["base"];
	}
	for (var i = leftmostComplementPos; i <= rightmostComplementPos; i ++){
		if (i < 1) continue;
		if (i >= WW_JS.currentState["nbases"]) break;
		complementString += complementSequence[i]["base"];
	}
	
	return [templateString, complementString];
	
}


function getFreeEnergyOfTranscriptionBubbleHybridString_WW(templateString, complementString, templateType, p){
	
	if (p === undefined) p = false;
	var freeEnergy = 0;
	for (var i = 0; i < templateString.length-1; i ++){
		
		var d = templateType == "DNA" ? "d" : "";
		var thisTemplateBase = d + templateString[i];
		var thisComplementBase = d + complementString[i];
		var nextTemplateBase = d + templateString[i+1];
		var nextComplementBase = d + complementString[i+1];
		
		var dictKey = thisComplementBase + nextComplementBase + thisTemplateBase + nextTemplateBase;
		//var dictKey = thisMBase + nextMBase + thisGBase + nextGBase;
		
		if(FE_JS.BasePairParams[dictKey] == null) freeEnergy += -2; // TODO: need to find dGU base pairing parameters
		else freeEnergy += FE_JS.BasePairParams[dictKey];
		
		if (p) console.log("Free energy of", dictKey, "is", FE_JS.BasePairParams[dictKey]);
		
	}
	
	
	return freeEnergy / FE_JS.RT;

	
}


function getHybridFreeEnergy_WW(templateString, primerString, templateType, primerType, p){
	
	if (p === undefined) p = false;
	var freeEnergy = 0;


	//console.log(templateString + "\n" + primerString + "\n");
	
	var templateIncr = 0;
	var primerIncr = 0;
	
	// Find base pairing (there will be a sequential bipartite between all uppercase letters)
	for (var hybridPos = 0; hybridPos < PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"]-1; hybridPos ++){
		

		var templateStringPos = hybridPos + templateIncr;
		var primerStringPos = hybridPos + primerIncr;

		

		// Find next pair of uppercases
		while (templateStringPos < templateString.length && templateString[templateStringPos] == templateString[templateStringPos].toLowerCase()){
			templateIncr++;
			templateStringPos = hybridPos + templateIncr;
		}
		while (primerStringPos < primerString.length && primerString[primerStringPos] == primerString[primerStringPos].toLowerCase()){
			primerIncr++;
			primerStringPos = hybridPos + primerIncr;
		}


		// Are we at the end of the base pairing?
		if (templateStringPos == templateString.length || primerStringPos == primerString.length) return freeEnergy / FE_JS.RT;
		
		
		
		var templateStringPosNext = templateStringPos + 1;
		var primerStringPosNext = primerStringPos + 1;

		while (templateStringPosNext < templateString.length && templateString[templateStringPosNext] == templateString[templateStringPosNext].toLowerCase()){
			templateIncr++;
			templateStringPosNext++;
		}
		while (primerStringPosNext < primerString.length && primerString[primerStringPosNext] == primerString[primerStringPosNext].toLowerCase()){
			primerIncr++;
			primerStringPosNext++;
		}


		// Are we at the end of the base pairing?
		if (templateStringPosNext == templateString.length || primerStringPosNext == primerString.length) return freeEnergy / FE_JS.RT;
		
		
		//console.log("templateStringPos = " + templateStringPos + " templateStringPosNext " + templateStringPosNext + " primerStringPos = " + primerStringPos + " primerStringPosNext " + primerStringPosNext);
		
		
		
		// If  the two pairs are adjacent in the string or they are separated by a single base bulge or nothing at all, add free energy of base pairing
		var loopSizeTemplate = templateStringPosNext - templateStringPos - 1;
		var loopSizePrimer = primerStringPosNext - primerStringPos - 1;
		var singleBaseBulge = (loopSizeTemplate == 1 && loopSizePrimer == 0) || (loopSizeTemplate == 0 && loopSizePrimer == 1);
		var noBulge = loopSizeTemplate == 0 && loopSizePrimer == 0;
		
		
		if (singleBaseBulge || noBulge){
			
			
			var thisMBase = primerString[primerStringPos];
			var thisGBase = templateString[templateStringPos];
			var nextMBase = primerString[primerStringPosNext];
			var nextGBase = templateString[templateStringPosNext];

			if (templateType == "DNA"){
				thisGBase = "d" + thisGBase;
				nextGBase = "d" + nextGBase;
			}
			if (primerType == "DNA"){
				thisMBase = "d" + thisMBase;
				nextMBase = "d" + nextMBase;
			}
			var dictKey = thisMBase + nextMBase + thisGBase + nextGBase;
			
			//console.log("Looking for key", dictKey, "found value", FE_JS.BasePairParams[dictKey]);
			if(FE_JS.BasePairParams[dictKey] == null) freeEnergy += -2; // TODO: need to find dGU base pairing parameters
			else freeEnergy += FE_JS.BasePairParams[dictKey];
			
			
			//console.log("single bulge / no bulge. Adding free energy of " + FE_JS.BasePairParams[dictKey]);
			
			// If no bulge then move onto next position
			if (noBulge) continue;
			
		}
		

		// Add free energy of bulge
		if (loopSizeTemplate > 0 && loopSizePrimer == 0){
			if (loopSizeTemplate == 1 && templateString[templateStringPos] == "C") freeEnergy += -0.9; // Special C bulge
			if (loopSizeTemplate == 1) freeEnergy += 3.81;
			else if (loopSizeTemplate == 2) freeEnergy += 2.80;
			else freeEnergy += 3.2 + 0.4*(loopSizeTemplate - 3);
			//console.log("Template bulge. Free energy = " + freeEnergy);
			continue;
		}
		if (loopSizeTemplate == 0 && loopSizePrimer > 0){
			if (loopSizePrimer == 1 && primerString[primerStringPos] == "C") freeEnergy += -0.9;
			if (loopSizePrimer == 1) freeEnergy += 3.81;
			else if (loopSizePrimer == 2) freeEnergy += 2.80;
			else freeEnergy += 3.2 + 0.4*(loopSizeTemplate - 3);
			//console.log("Primer bulge. Free energy = " + freeEnergy);
			continue;
		}
		
		
		
		// Add free energy of loop
		// For now will use +1 for a 1x1 loop, +3 for a 1x2 loop, +2 for a 2x2 loop and +3 otherwise
		if (loopSizeTemplate == 1 && loopSizePrimer == 1) freeEnergy += 1;
		else if (loopSizeTemplate == 1 && loopSizePrimer == 2) freeEnergy += 3;
		else if (loopSizeTemplate == 2 && loopSizePrimer == 1) freeEnergy += 3;
		else if (loopSizeTemplate == 2 && loopSizePrimer == 2) freeEnergy += 2;
		else freeEnergy += Math.max(loopSizeTemplate, loopSizePrimer) * 0.4 + 2 +   Math.abs(loopSizeTemplate - loopSizePrimer) * 0.3;
		
	//	console.log("Loop. Free energy = " + freeEnergy);

		
	}
	
	return freeEnergy / FE_JS.RT;
	
	
	
}



function getHybridString_WW(state){
	


	// Build strings
	
	// template AACGacgaCCAG
	//   primer UUGUaGGAC
	//          means there is a 4x1 loop and the rest is base pairing
	
	
	//console.log("Calculating free energy. rightG = " + rightG + " rightM = " + rightM + " bPosG = " + bPosG + " bPosM = " + bPosM);
	
	var activeSiteShift = state["mRNAPosInActiveSite"] > 1 ? 1 : 0;
	
	var templateString = "";
	var primerString = "";
	var GPastBulge = 0;
	var MPastBulge = 0;
	var stopWhenAt = PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"];
	
	
	for(var hybridPos = 0; hybridPos < stopWhenAt; hybridPos++){
		
		var Gbase = state["rightGBase"] - (hybridPos + GPastBulge);
		var Mbase = state["rightMBase"] - (hybridPos + MPastBulge);
		
		
		// If either one of the two positions do not have a base on the html there then go to next base
		if (Gbase == 0 || Mbase == 0 || Gbase < state["leftGBase"] || Mbase < state["leftMBase"] || templateSequence[Gbase] == null  || primerSequence[Mbase] == null) continue;

		// Ensure that the rightMostMbase is part of the chain and not bound as free NTP
		if (state["NTPbound"] && (Mbase == state["rightMBase"] || Mbase == state["rightMBase"]+1)) continue;


		// If we are interested in the rightmost base but NTP is bound then exit
		if (Mbase == state["rightMBase"] && state["NTPbound"]) break;
		
		var GbaseGroup = WW_JS.getBaseInSequenceAtPosition_WW("g" + Gbase);
		//TODO mut if ($("#g" + Gbase).attr("mut") != null) GbaseGroup = $("#g" + Gbase).attr("mut");
		
		var MbaseGroup = WW_JS.getBaseInSequenceAtPosition_WW("m" + Mbase)//; $('#m' + Mbase).attr("nt").substring(0,1);
		//TODO mut if ($("#m" + Mbase).attr("mut") != null) MbaseGroup = $("#m" + Mbase).attr("mut");


		//console.log("GbaseGroup", GbaseGroup, "MbaseGroup", MbaseGroup, "Mbase", Mbase, state["NTPbound"], primerSequence);

		
		// If the template base is bulged, then add it to the bulge string and keep incrementing GPastBulge until the base is not bulged
		/*
		var templateLoopSize = 0;
		while (hybridPos - activeSiteShift + GPastBulge > 0 && bPosG.indexOf(hybridPos - activeSiteShift + GPastBulge) != -1) {
			templateString = GbaseGroup.toLowerCase() + templateString;
			GPastBulge++;
			Gbase = state["rightGBase"] - (hybridPos + GPastBulge);
			if (templateSequence[Gbase] == null) break;
			GbaseGroup = WW_JS.getBaseInSequenceAtPosition_WW("g" + Gbase);
			templateLoopSize++;
		}
		*/

		// If the primer base is bulged, then add it to the bulge string and keep incrementing MPastBulge until the base is not bulged
		var primerLoopSize = 0;
		if (hybridPos - activeSiteShift + MPastBulge > 0 && state["bulgePos"].indexOf(hybridPos - activeSiteShift + MPastBulge) != -1) {
					
			var sizeOfBulge = state["bulgeSize"][state["bulgePos"].indexOf(hybridPos - activeSiteShift + MPastBulge)];	
			for (var posInBulge = 1; posInBulge <= sizeOfBulge; posInBulge++){
				primerString = MbaseGroup.toLowerCase() + primerString;
				MPastBulge++;
				Mbase = state["rightMBase"] - (hybridPos + MPastBulge);
				if (primerSequence[Mbase] == null) break;
				MbaseGroup = WW_JS.getBaseInSequenceAtPosition_WW("m" + Mbase)
				primerLoopSize++;
			}	
			
		}
		
		
		// If two bases are opposite each other in a loop then this cuts into the total base pairing count
		/*
		if(templateLoopSize > 0 && primerLoopSize > 0){
			stopWhenAt -= Math.min(templateLoopSize, primerLoopSize);
			if (hybridPos >= stopWhenAt) break;
		}*/

		
		// If the bases are complementary, then add to their respective strings and move onto next position
		if (basesComplement_WW("g" + Gbase, "m" + Mbase)){
			templateString = GbaseGroup + templateString;
			primerString = MbaseGroup + primerString;
		}
		
		// If the bases are not complementary, then add either base to loop part of string (lower case) and move on
		else{
			templateString = GbaseGroup.toLowerCase() + templateString;
			primerString = MbaseGroup.toLowerCase() + primerString;
		}
		
	}
	
	/*
	//console.log("-1?", bPosG, bPosM);
	if (bPosG.indexOf(-1) != -1 && state["bulgePos"].indexOf(-1) != -1){
		//console.log("-1 before", templateString, primerString);
		templateString = templateString.substring(0, templateString.length-1) + templateString[templateString.length-1].toLowerCase();
		primerString = primerString.substring(0, primerString.length-1) + primerString[primerString.length-1].toLowerCase();
		//console.log("-1 after", templateString, primerString);
	}
	
	*/
	
	
	return [templateString, primerString];
	
}





function getBasePairs_WW(strT, strP, leftT, leftP){
	
	
	var basePairs = [];
	var templateIndex = 0;
	var primerIndex = 0;
	

	while(true){
		

		
		// If we have exceeded the string lengths then exit
		if (templateIndex >= strT.length || primerIndex >= strP.length) break;
		
		
		// If both are uppercase then they are basepaired
		if (isUpperCase_WW(strT[templateIndex]) && isUpperCase_WW(strP[primerIndex])){
			
			basePairs.push([templateIndex + leftT, primerIndex + leftP]);
			templateIndex++;
			primerIndex++;
		}
		
		
		// If only one is uppercase then skip the other one
		else if (isUpperCase_WW(strT[templateIndex]) & !isUpperCase_WW(strP[primerIndex])){
			primerIndex++;
		}
		else if (!isUpperCase_WW(strT[templateIndex]) & isUpperCase_WW(strP[primerIndex])){
			templateIndex++;
		}
		
		
		// If neither are uppercase then skip both
		else if (!isUpperCase_WW(strT[templateIndex]) && !isUpperCase_WW(strP[primerIndex])){
			templateIndex++;
			primerIndex++;
		}
		
		
	}
	
	return basePairs;
	
	
}


function getHybridIntermediateString_WW(str1, str2, leftT1, leftP1, leftT2, leftP2){
	
	
	
	// Build a list of basepairs between template and hybrid in each sequence
	var basepairs1 = getBasePairs_WW(str1[0], str1[1], leftT1, leftP1)
	var basepairs2 = getBasePairs_WW(str2[0], str2[1], leftT2, leftP2)

	
	// Find the basepairs of the intermediate state as the intersection between the basepairs
	var basepairsIntermediate = [];
	for (var i = 0; i < basepairs1.length; i ++){
		var element1 = basepairs1[i];
		var element1InSet2 = false;
		
		for (var j = 0; j < basepairs2.length; j ++){
			var element2 = basepairs2[j];
			
			if (element1[0] == element2[0] && element1[1] == element2[1]){
				element1InSet2 = true;
				break;
			}
			
		}
		
		if (element1InSet2) basepairsIntermediate.push(element1);
	
	}
	


	
	// Convert the intermediate basepairs back into a string
	var strIntermediateT = str1[0].toLowerCase();
	var strIntermediateP = str1[1].toLowerCase();
	for (var i = 0; i <  basepairsIntermediate.length; i ++){
		
		var bpT_basenum = basepairsIntermediate[i][0];
		var bpP_basenum = basepairsIntermediate[i][1];

		
		// Set the corresponding 2 bases in the strings to uppercase to represent basepairing
		strIntermediateT = strIntermediateT.substr(0, bpT_basenum - leftT1) + strIntermediateT[bpT_basenum - leftT1].toUpperCase() + strIntermediateT.substr(bpT_basenum - leftT1+1);
		strIntermediateP = strIntermediateP.substr(0, bpP_basenum - leftP1) + strIntermediateP[bpP_basenum - leftP1].toUpperCase() + strIntermediateP.substr(bpP_basenum - leftP1+1);
		
	}
	
	return [strIntermediateT, strIntermediateP];
	
	
}


function basesComplement_WW(templateBaseNum, primerBaseNum){

	
	if (templateSequence[templateBaseNum.substring(1)] == null | primerSequence[primerBaseNum.substring(1)] == null) return;
	var templateBase = templateSequence[templateBaseNum.substring(1)]["mut"] == null ? WW_JS.getBaseInSequenceAtPosition_WW(templateBaseNum) : templateSequence[templateBaseNum.substring(1)]["mut"];
	var primerBase = primerSequence[primerBaseNum.substring(1)]["mut"] == null ? WW_JS.getBaseInSequenceAtPosition_WW(primerBaseNum) : primerSequence[primerBaseNum.substring(1)]["mut"];



	return (templateBase == "G"  && primerBase == "U") || (templateBase == "U"  && primerBase == "G") || (templateBase == "C"  && primerBase == "G") || (templateBase == "G"  && primerBase == "C") || (templateBase == "A"  && primerBase == "U") || (templateBase == "U"  && primerBase == "A") || (templateBase == "A"  && primerBase == "T") || (templateBase == "T"  && primerBase == "A");

}


function getBaseComplement_WW(templateBaseType){
	
	var complementBase = "";
	if (document.getElementById("SelectPrimerType").value.substring(2) == "RNA"){
		complementBase = templateBaseType == "C" ? "G" : templateBaseType == "G" ? "C" : templateBaseType == "A" ? "U" : templateBaseType == "U" ? "A" : templateBaseType == "T" ? "A" : "X";
	}
	else complementBase = templateBaseType == "C" ? "G" : templateBaseType == "G" ? "C" : templateBaseType == "A" ? "T" : templateBaseType == "U" ? "A" : templateBaseType == "T" ? "A" : "X";
	
	return complementBase;
	
}





 FE_JS.getStateDiagramInfo_WW = function(resolve, msgID){


	if (resolve === undefined) resolve = function() {};
	if (msgID === undefined) msgID = null;

	var toReturn = {};

	toReturn["currentState"] = WW_JS.currentState;


	// Calculate all terms for the state where the pol is pretranslocated unbound and activated in the appropriate position
	var stateToCalculateFor = WW_JS.getcurrentStateCopy_WW();
	stateToCalculateFor["activated"] = true;
	stateToCalculateFor["NTPbound"] = false;

	// Get the current state into pretranslocated
	for (var i = WW_JS.currentState["mRNAPosInActiveSite"]; i < 0; i ++){
		OPS_JS.forward_WW(stateToCalculateFor, false);
	}
	for (var i = WW_JS.currentState["mRNAPosInActiveSite"]; i > 0; i --){
		OPS_JS.backwards_WW(stateToCalculateFor, false);
	}

	
	stateToCalculateFor["activated"] = false; // Set to deactivated so we can backtrack


	var slidePeaks = FE_JS.update_slidingPeakHeights_WW(stateToCalculateFor);
	var slideTroughs = FE_JS.update_slidingTroughHeights_WW(stateToCalculateFor);

	toReturn["k -2,-1"] = 1e6 * Math.exp(-(slidePeaks[1] - slideTroughs[1])); // From backtrack 2 to backtrack 1
	toReturn["k -1,-2"] = 1e6 * Math.exp(-(slidePeaks[1] - slideTroughs[2])); // From backtrack 1 to backtrack 2
	toReturn["k -1,0"]  = 1e6 * Math.exp(-(slidePeaks[2] - slideTroughs[2])); // From backtracked to pretranslocated
	toReturn["k 0,-1"]  = 1e6 * Math.exp(-(slidePeaks[2] - slideTroughs[3])); // From pretranslocated to backtracked
	toReturn["k 0,+1"]  = 1e6 * Math.exp(-(slidePeaks[3] - slideTroughs[3])); // From pretranslocated to posttranslocated
	toReturn["k +1,0"]  = 1e6 * Math.exp(-(slidePeaks[3] - slideTroughs[4])); // From posttranslocated to pretranslocated
	toReturn["k +1,+2"] = 1e6 * Math.exp(-(slidePeaks[4] - slideTroughs[4])); // From posttranslocated to hypertranslocated
	toReturn["k +2,+1"] = 1e6 * Math.exp(-(slidePeaks[4] - slideTroughs[5])); // From hypertranslocated to posttranslocated
	toReturn["k +2,+3"] = 1e6 * Math.exp(-(slidePeaks[5] - slideTroughs[5])); // From hypertranslocated 1 to hypertranslocated 2
	toReturn["k +3,+2"] = 1e6 * Math.exp(-(slidePeaks[5] - slideTroughs[6])); // From hypertranslocated 2 to hypertranslocated 1

	stateToCalculateFor["activated"] = true; 
	toReturn["kbind"] = stateToCalculateFor["rateOfBindingNextBase"]; 


	// TODO: get this working without using update_bindingPeakHeights_WW
	if (false && FE_JS.currentElongationModel == "twoSiteBrownian"){

		// Calculate bind and release rate into secondary site
		var bindPeaks = update_bindingPeakHeights_WW(stateToCalculateFor);
		var bindTroughs = update_bindingTroughHeights_WW(stateToCalculateFor);

		//toReturn["k bind0"]    =  // Bind from 0
		toReturn["k release0"] = 1e6 * Math.exp(-(bindPeaks[3] - bindTroughs[4])); // Release from 0

		// Calculate translocation rates when NTP is bound in secondary site

		slidePeaks = FE_JS.update_slidingPeakHeights_WW(stateToCalculateFor);
		slideTroughs = FE_JS.update_slidingTroughHeights_WW(stateToCalculateFor);
		toReturn["kN 0,+1"] = 1e6 * Math.exp(-(slidePeaks[3] - slideTroughs[3])); // Forward when bound (0 -> +1)
		toReturn["kN +1,0"] = 1e6 * Math.exp(-(slidePeaks[3] - slideTroughs[4])); // Backwards when bound (+1 -> 0)

	}



	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
	}else{
		resolve(toReturn);
	}


}

 FE_JS.getTranslocationCanvasData_WW = function(resolve, msgID){


	if (resolve === undefined) resolve = function() {};
	if (msgID === undefined) msgID = null;



	// If NTP is not bound retrieve translocation rates from cache
	var kBck = 0;
	var kFwd = 0
	var stateC = STATE_JS.convertFullStateToCompactState(WW_JS.currentState);
	if (!WW_JS.currentState["terminated"] && !stateC[2]){
		var rateFwdAndBack = STATE_JS.getTranslocationRates(stateC);
		kFwd = rateFwdAndBack[1];
		kBck = rateFwdAndBack[0];
		if (stateC[3] && stateC[1] == 0 && !FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["allowBacktrackWithoutInactivation"]) kBck = 0; // If state is active but we don't allow backtracking while active then set rate to zero
	}



	var totalBulgeSize = 0;
	for (var s = 0; s < WW_JS.currentState["bulgeSize"].length; s++) totalBulgeSize += WW_JS.currentState["bulgeSize"][s];
	if (WW_JS.currentState["leftMBase"] >= WW_JS.currentState["mRNALength"] - totalBulgeSize) OPS_JS.terminate_WW();
	var fwdBtnLabel = !WW_JS.currentState["terminated"] && WW_JS.currentState["leftMBase"] >= WW_JS.currentState["mRNALength"] - totalBulgeSize - 1 ? "Terminate" : "Forward";

	var bckBtnActive = WW_JS.currentState["leftGBase"] - PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"] -1 > 2; // Do not allow backtracking if it will break the 3' bubble
	var fwdBtnActive = WW_JS.currentState["leftGBase"] < WW_JS.currentState["nbases"]; // Do not going forward if beyond the end of the sequence

	var toReturn = {kBck: kBck, kFwd: kFwd, bckBtnActive: bckBtnActive, fwdBtnActive: fwdBtnActive, fwdBtnLabel: fwdBtnLabel};

	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
	}else{
		resolve(toReturn);
	}


}


// Get the rate of releasing bound NTP. This term may be NTP dependent, and is calculated by rearranging KD = krel / kbind
 FE_JS.getReleaseRate = function(currentlyBoundBase){
	var KdissID = FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["NTPbindingNParams"] == 2 ? "Kdiss" : "Kdiss_" + currentlyBoundBase + "TP";
	var kRelease = PARAMS_JS.PHYSICAL_PARAMETERS["RateBind"]["val"] * PARAMS_JS.PHYSICAL_PARAMETERS[KdissID]["val"];
	return kRelease;
}


// Get the rate of catalysing bound NTP. This term may be NTP dependent
 FE_JS.getCatalysisRate = function(currentlyBoundBase){
	var kcatID = FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel]["NTPbindingNParams"] == 2 ? "kCat" : "kCat_" + currentlyBoundBase + "TP";
	return PARAMS_JS.PHYSICAL_PARAMETERS[kcatID]["val"];
}


FE_JS.getNTPCanvasData_WW = function(resolve, msgID){


	if (resolve === undefined) resolve = function() {};
	if (msgID === undefined) msgID = null;

	// If the polymerase is post-translocated or hypertranslocated, then return the base to be transcribed next and the pair before it
	// Otherwise return the most recently transcribed base
	var toReturn = null;
	if (!WW_JS.currentState["terminated"]){
		var deltaBase = WW_JS.currentState["mRNAPosInActiveSite"] <= 0 ? -1 : 0;
		var baseToAdd = deltaBase == 0 ? WW_JS.currentState["NTPtoAdd"] : (primerSequence == null || WW_JS.currentState["mRNALength"] == null) ? "X" : primerSequence[WW_JS.currentState["mRNALength"]-1]["base"];
		toReturn = {state: STATE_JS.convertFullStateToCompactState(WW_JS.currentState), 
						NTPbound: WW_JS.currentState["NTPbound"],
						mRNAPosInActiveSite: WW_JS.currentState["mRNAPosInActiveSite"],
						baseToAdd: baseToAdd,
						kBind: WW_JS.currentState["rateOfBindingNextBase"],
						kRelease: FE_JS.getReleaseRate(baseToAdd),
						kCat: FE_JS.getCatalysisRate(baseToAdd),
						templateBaseBeingCopied: templateSequence[WW_JS.currentState["nextBaseToCopy"]+deltaBase] != null ? templateSequence[WW_JS.currentState["nextBaseToCopy"]+deltaBase]["base"] : null,
						previousTemplateBase: templateSequence[WW_JS.currentState["nextBaseToCopy"]-1+deltaBase]["base"] != null ? templateSequence[WW_JS.currentState["nextBaseToCopy"]-1+deltaBase]["base"] : null,
						previousNascentBase: primerSequence[WW_JS.currentState["mRNALength"]-1+deltaBase]["base"],
						activated: WW_JS.currentState["activated"]
		};
	}

	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
	}else{
		resolve(toReturn);
	}


}



 FE_JS.getDeactivationCanvasData_WW = function(resolve, msgID){


	if (resolve === undefined) resolve = function() {};
	if (msgID === undefined) msgID = null;

	var toReturn = {state: STATE_JS.convertFullStateToCompactState(WW_JS.currentState), kU: PARAMS_JS.PHYSICAL_PARAMETERS["kU"]["val"], kA: PARAMS_JS.PHYSICAL_PARAMETERS["kA"]["val"]};
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
	}else{
		resolve(toReturn);
	}

}


// Gets the button label associated with slipping right
function getSlipRightLabel_WW(state, S){

	if (S === undefined) S = 0;

	var label = "";
	var allowMultipleBulges = PARAMS_JS.PHYSICAL_PARAMETERS["allowMultipleBulges"]["val"];
	var h = PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"];

	var fuseWith = state["bulgePos"].indexOf(Math.max(state["mRNAPosInActiveSite"] + 1, 1));
	if (fuseWith == -1)	fuseWith = state["bulgePos"].indexOf(Math.max(state["mRNAPosInActiveSite"] + 2, 2));



	if (state["terminated"]) label = "";
	else if (allowMultipleBulges && state["partOfBulgeID"][S] != i && state["bulgePos"][ state["partOfBulgeID"][S] ] - Math.max(0, state["mRNAPosInActiveSite"]) == 1) label = "";
	else if (allowMultipleBulges && state["partOfBulgeID"][S] != S) label = "Fissure";
	else if (!state["NTPbound"] && state["partOfBulgeID"][S] == S && state["bulgePos"][S] - Math.max(0, state["mRNAPosInActiveSite"]) == 1) label = "Absorb";	
	else if (allowMultipleBulges && state["bulgePos"][S] > 0 && state["bulgePos"].indexOf(state["bulgePos"][S] - 1) != -1) label = "Fuse";	
	else if (state["leftMBase"] > 1 && allowMultipleBulges &&  state["bulgePos"][S] == 0 && ((state["bulgePos"].indexOf(h - 1) != -1) || state["bulgePos"].indexOf(h - 2) != -1)) label = "Form";	
	else if (state["bulgePos"][S] < h && state["bulgePos"][S] > 1 && state["bulgePos"][S] - Math.max(0, state["mRNAPosInActiveSite"]) != 1) label = "Diffuse";
	else if (state["bulgePos"][S] == 0) label = "Form";
	

	return label;



}


// Gets the button label associated with slipping left
function getSlipLeftLabel_WW(state, S){

	if (S === undefined) S = 0;

	var label = "";
	var allowMultipleBulges = PARAMS_JS.PHYSICAL_PARAMETERS["allowMultipleBulges"]["val"];
	var h = PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"];

	var fuseWith = state["bulgePos"].indexOf(Math.max(state["mRNAPosInActiveSite"] + 1, 1));
	if (fuseWith == -1)	fuseWith = state["bulgePos"].indexOf(Math.max(state["mRNAPosInActiveSite"] + 2, 2));


	if (state["terminated"]) label = "";
	else if (allowMultipleBulges && state["partOfBulgeID"][S] != S && state["bulgePos"][ state["partOfBulgeID"][S] ] == h - 1) label = "";
	else if (allowMultipleBulges && state["partOfBulgeID"][S] != S) label = "Fissure";
	else if (allowMultipleBulges && state["bulgePos"][S] > 0 && state["bulgePos"].indexOf(state["bulgePos"][S] + 1) != -1) label = "Fuse";
	else if (allowMultipleBulges && state["bulgePos"][S] == 0 && allowMultipleBulges && state["bulgePos"][S] == 0 && fuseWith != -1) {
		if (state["mRNAPosInActiveSite"] >= 0 && state["bulgePos"].indexOf( state["bulgePos"][fuseWith] +1 ) != -1) label = "";
		else label = "Form";
	}
	else if (state["bulgePos"][S] > 0 && state["bulgePos"][S] < h - 1) label = "Diffuse";

	else if (!state["NTPbound"] && state["bulgePos"][S] == 0 && state["mRNAPosInActiveSite"] != h - 1) label = "Form";
	else if (state["bulgePos"][S] == h - 1) label = "Absorb";
			
	return label;


}



 FE_JS.getSlippageCanvasData_WW = function(S, resolve, msgID){


	if (S === undefined) S = 0;
	if (resolve === undefined) resolve = function() {};
	if (msgID === undefined) msgID = null;

	var stateMiddle = WW_JS.getcurrentStateCopy_WW();
	var stateLeft = WW_JS.getcurrentStateCopy_WW();
	OPS_JS.slip_left_WW(stateLeft, false, S);
	var stateRight = WW_JS.getcurrentStateCopy_WW();
	OPS_JS.slip_right_WW(stateRight, false, S);

	// Return the 3 states, the 2 button names and the hybrid length
	var toReturn = {stateMiddle: stateMiddle, stateLeft: stateLeft, stateRight:stateRight, 
					hybridLen: PARAMS_JS.PHYSICAL_PARAMETERS["hybridLen"]["val"], 
					leftLabel: getSlipLeftLabel_WW(stateMiddle, S), rightLabel: getSlipRightLabel_WW(stateMiddle, S)};
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
	}else{
		resolve(toReturn);
	}

}




function isUpperCase_WW(str) { return str == str.toUpperCase(); }




function init_BP_parameters_WW(){
	
	
	// 5' 12
	// 3' 34
	var dict = {};
	
	// RNA-RNA
	dict["AAUU"] = -0.93;
	dict["UUAA"] = -0.93;
	dict["AUUA"] = -1.10;
	dict["UAAU"] = -1.33;
	dict["CUGA"] = -2.08;
	dict["AGUC"] = -2.08;
	dict["CAGU"] = -2.11;
	dict["UGAC"] = -2.11;
	dict["GUCA"] = -2.24;
	dict["ACUG"] = -2.24;
	dict["GACU"] = -2.35;
	dict["UCAG"] = -2.35;
	dict["CGGC"] = -2.36;
	dict["GGCC"] = -3.26;
	dict["CCGG"] = -3.26;
	dict["GCCG"] = -3.42;
	
	dict["AGUU"] = -0.55;
	dict["UUGA"] = -0.55;
	dict["AUUG"] = -1.36;
	dict["GUUA"] = -1.36;
	dict["CGGU"] = -1.41;
	dict["UGGC"] = -1.41;
	dict["CUGG"] = -2.11;
	dict["GGUC"] = -2.11;
	dict["GGCU"] = -1.53;
	dict["UCGG"] = -1.53;
	dict["GUCG"] = -2.51;
	dict["GCUG"] = -2.51;
	dict["GAUU"] = -1.27;
	dict["UUAG"] = -1.27;
	dict["GGUU"] = -0.50;
	dict["UUGG"] = -0.50;
	dict["GUUG"] = +1.29;
	dict["UGAU"] = -1.00;
	dict["UAGU"] = -1.00;
	dict["UGGU"] = +0.30;


	// RNA-DNA
	// Wu, Peng, Shu‐ichi Nakano, and Naoki Sugimoto. "Temperature dependence of thermodynamic properties for DNA/DNA and RNA/DNA duplex formation." The FEBS Journal 269.12 (2002): 2821-2830.
	dict["AAdTdT"] = -1.00;
	dict["ACdTdG"] = -2.10;
	dict["AGdTdC"] = -1.80;
	dict["AUdTdA"] = -0.90;
	dict["CAdGdT"] = -0.90;
	dict["CCdGdG"] = -2.10;
	dict["CGdGdC"] = -1.70;
	dict["CUdGdA"] = -0.90;
	dict["GAdCdT"] = -1.30;
	dict["GCdCdG"] = -2.70;
	dict["GGdCdC"] = -2.90;
	dict["GUdCdA"] = -1.10;
	dict["UAdAdT"] = -0.60;
	dict["UCdAdG"] = -1.50;
	dict["UGdAdC"] = -1.60;
	dict["UUdAdA"] = -0.20;
	
	dict["dTdTAA"] = -1.00;
	dict["dGdTCA"] = -2.10;
	dict["dCdTGA"] = -1.80;
	dict["dAdTUA"] = -0.90;
	dict["dTdGAC"] = -0.90;
	dict["dGdGCC"] = -2.10;
	dict["dCdGGC"] = -1.70;
	dict["dAdGUC"] = -0.90;
	dict["dTdCAG"] = -1.30;
	dict["dGdCCG"] = -2.70;
	dict["dCdCGG"] = -2.90;
	dict["dAdCUG"] = -1.10;
	dict["dTdAAU"] = -0.60;
	dict["dGdACU"] = -1.50;
	dict["dCdAGU"] = -1.60;
	dict["dAdAUU"] = -0.20;
	
	
	// DNA-DNA
	dict["dAdAdTdT"] = -1.00;
	dict["dTdTdAdA"] = -1.00;
	dict["dAdTdTdA"] = -0.88;
	dict["dTdAdAdT"] = -0.58;
	dict["dCdTdGdA"] = -1.28;
	dict["dAdGdTdC"] = -1.28
	dict["dCdAdGdT"] = -1.45;
	dict["dTdGdAdC"] = -1.45;
	dict["dGdTdCdA"] = -1.44;
	dict["dAdCdTdG"] = -1.44;
	dict["dGdAdCdT"] = -1.30;
	dict["dTdCdAdG"] = -1.30;
	dict["dCdGdGdC"] = -2.17;
	dict["dGdGdCdC"] = -1.84
	dict["dCdCdGdG"] = -1.84;
	dict["dGdCdCdG"] = -2.24;


	

	return dict;

}




function init_special_hairpin_parameters_WW(){



	var dict = {};
	
	// Special hairpin loops
	// 5' "12345" 3' means that 1 and 5 are basepaired and 234 form the hairpin loop
	dict["CAACG"] = 6.8;
	dict["GUUAC"] = 6.9;
	dict["CUACGG"] = 2.8
	dict["CUCCGG"] = 2.7;

	dict["CUUCGG"] = 3.7
	dict["CUUUGG"] = 3.7;
	dict["CCAAGG"] = 3.3;
	dict["CCCAGG"] = 3.4;

	dict["CCGAGG"] = 3.5;
	dict["CCUAGG"] = 3.7;
	dict["CCACGG"] = 3.7;
	dict["CCGCGG"] = 3.6;

	dict["CCUCGG"] = 2.5;
	dict["CUAAGG"] = 3.6;
	dict["CUCAGG"] = 3.7;


	dict["CUUAGG"] = 3.5;
	dict["CUGCGG"] = 2.8;
	dict["CAACGG"] = 5.5;

	dict["ACAGUGCU"] = 2.9;
	dict["ACAGUGAU"] = 3.6;
	dict["ACAGUGUU"] = 1.8;
	dict["ACAGUACU"] = 2.8;

	
	
	return dict;

}



function init_terminal_mismatch_parameters_WW(){

	// 5' 12 3'
	// 3' 34 5'
	// Source: http://rna.urmc.rochester.edu/NNDB/turner04/tm-parameters.html
	var dict = {};
	
	// AX
	// UY
	dict["AAUA"] = -0.8;
	dict["AAUC"] = -1.0;
	dict["AAUG"] = -0.8;
	dict["AAUU"] = -1.0;
	dict["ACUA"] = -0.6;
	dict["ACUC"] = -0.7;
	dict["ACUG"] = -0.6;
	dict["ACUU"] = -0.7;
	dict["AGUA"] = -0.8;
	dict["AGUC"] = -1.0;
	dict["AGUG"] = -0.8;
	dict["AGUU"] = -1.0;
	dict["AUUA"] = -0.6;
	dict["AUUC"] = -0.8;
	dict["AUUG"] = -0.6;
	dict["AUUU"] = -0.8;
	
	
	// CG
	// GY
	dict["CAGA"] = -1.5;
	dict["CAGC"] = -1.5;
	dict["CAGG"] = -1.4;
	dict["CAGU"] = -1.5;
	dict["CCGA"] = -1.0;
	dict["CCGC"] = -1.1;
	dict["CCGG"] = -1.0;
	dict["CCGU"] = -0.8;
	dict["CGGA"] = -1.4;
	dict["CGGC"] = -1.5;
	dict["CGGG"] = -1.6;
	dict["CGGU"] = -1.5;
	dict["CUGA"] = -1.0;
	dict["CUGC"] = -1.4;
	dict["CUGG"] = -1.0;
	dict["CUGU"] = -1.2;
	
	
	// GX
	// CY
	dict["GACA"] = -1.1;
	dict["GACC"] = -1.5;
	dict["GACG"] = -1.3;
	dict["GACU"] = -1.5;
	dict["GCCA"] = -1.1;
	dict["GCCC"] = -0.7;
	dict["GCCG"] = -1.1;
	dict["GCCU"] = -0.5;
	dict["GGCA"] = -1.6;
	dict["GGCC"] = -1.5;
	dict["GGCG"] = -1.4;
	dict["GGCU"] = -1.5;
	dict["GUCA"] = -1.1;
	dict["GUCC"] = -1.0;
	dict["GUCG"] = -1.1;
	dict["GUCU"] = -0.7;
	
	
	// GX
	// UY
	dict["GAUA"] = -0.3;
	dict["GAUC"] = -1.0;
	dict["GAUG"] = -0.8;
	dict["GAUU"] = -1.0;
	dict["GCUA"] = -0.6;
	dict["GCUC"] = -0.7;
	dict["GCUG"] = -0.6;
	dict["GCUU"] = -0.7;
	dict["GGUA"] = -0.6;
	dict["GGUC"] = -1.0;
	dict["GGUG"] = -0.8;
	dict["GGUU"] = -1.0;
	dict["GUUA"] = -0.6;
	dict["GUUC"] = -0.8;
	dict["GUUG"] = -0.6;
	dict["GUUU"] = -0.6;
	
	
	// UX
	// AY
	dict["UAAA"] = -1.0;
	dict["UAAC"] = -0.8;
	dict["UAAG"] = -1.1;
	dict["UAAU"] = -0.8;	
	dict["UCAA"] = -0.7;
	dict["UCAC"] = -0.6;
	dict["UCAG"] = -0.7;
	dict["UCAU"] = -0.5;
	dict["UGAA"] = -1.1;
	dict["UGAC"] = -0.8;
	dict["UGAG"] = -1.2;
	dict["UGAU"] = -0.8;
	dict["UUAA"] = -0.7;
	dict["UUAC"] = -0.6;
	dict["UUAG"] = -0.7;
	dict["UUAU"] = -0.5;
	
	// UX
	// GY
	dict["UAGA"] = -1.0;
	dict["UAGC"] = -0.8;
	dict["UAGG"] = -1.1;
	dict["UAGU"] = -0.8;
	dict["UCGA"] = -0.7;
	dict["UCGC"] = -0.6;
	dict["UCGG"] = -0.7;
	dict["UCGU"] = -0.5;
	dict["UGGA"] = -0.5;
	dict["UGGC"] = -0.8;
	dict["UGGG"] = -0.8;
	dict["UGGU"] = -0.8;
	dict["UUGA"] = -0.7;
	dict["UUGC"] = -0.6;
	dict["UUGG"] = -0.7;
	dict["UUGU"] = -0.5;
	
	
	return dict;

}


function init_1x1_loop_parameters_WW(){



	// 1x1 LOOPS:

	// Entry ABCD corresponds to
	// 5' AiB
	// 3' CjD
	// Where i,j is the entry in the 4x4 matrix (A,C,G,U) indexed by number not character

	var dict = {};
	


	dict['AAUU'] = [ [1.9,1.9,1.9,1.9], [1.9,1.9,1.9,1.9], [1.9,1.9,-0.7,1.9], [1.9,1.9,1.9,1.5] ];
	dict['ACUG'] = [ [1.2,1.2,1.2,1.2], [1.2,1.2,1.2,1.2], [1.2,1.2,-1.4,1.2], [1.2,1.2,1.2,0.8] ];
	dict['AGUC'] = [ [1.2,1.2,1.2,1.2], [1.2,1.2,1.2,1.2], [1.2,1.2,-1.4,1.2], [1.2,1.2,1.2,0.8] ];
	dict['AUUA'] = [ [1.9,1.9,1.9,1.9], [1.9,1.9,1.9,1.9], [1.9,1.9,-0.7,1.9], [1.9,1.9,1.9,1.2] ];
	dict['AGUU'] = [ [1.9,1.9,1.9,1.9], [1.9,1.9,1.9,1.9], [1.9,1.9,-0.7,1.9], [1.9,1.9,1.9,1.6] ];
	dict['AUUG'] = [ [1.9,1.9,1.9,1.9], [1.9,1.9,1.9,1.9], [1.9,1.9,-0.7,1.9], [1.9,1.9,1.9,1.2] ];
	dict['CAGU'] = [ [1.2,1.2,1.2,1.2], [1.2,1.2,1.2,1.2], [1.2,1.2,-1.4,1.2], [1.2,1.2,1.2,1.2] ];
	dict['CCGG'] = [ [0.9,-0.4,0.5,0.5], [0.3,0.5,0.5,0.6], [-0.1,0.5,-2.2,0.5], [0.5,0.0,0.5,-0.1] ];
	dict['CGGC'] = [ [0.9,0.5,0.5,0.5], [0.5,0.5,0.5,0.5], [0.5,0.5,-1.4,0.5], [0.5,0.5,0.5,0.4] ];
	dict['CUGA'] = [ [1.2,1.2,1.2,1.2], [1.2,1.2,1.2,1.2], [1.2,1.2,-1.4,1.2], [1.2,1.2,1.2,0.8] ];
	dict['CGGU'] = [ [2.2,1.3,1.2,1.2], [1.2,1.7,1.2,1.2], [1.2,1.2,-1.4,1.2], [1.2,1.2,1.2,1.1] ];
	dict['CUGG'] = [ [0.6,0.5,1.2,1.2], [1.2,1.2,1.2,1.2], [-0.2,1.2,-1.4,1.2], [1.2,1.0,1.2,1.1] ];
	dict['GACU'] = [ [1.2,1.2,1.2,1.2], [1.2,1.2,1.2,1.2], [1.2,1.2,-1.4,1.2], [1.2,1.2,1.2,1.2] ];
	dict['GCCG'] = [ [0.8,0.5,0.5,0.5], [0.5,0.5,0.5,0.5], [0.5,0.5,-2.3,0.5], [0.5,0.5,0.5,-0.6] ];
	dict['GGCC'] = [ [0.9,0.3,-0.1,0.5], [-0.4,0.5,0.5,0.0], [0.5,0.5,-2.2,0.5], [0.5,0.6,0.5,-0.1] ];
	dict['GUCA'] = [ [1.2,1.2,1.2,1.2], [1.2,1.2,1.2,1.2], [1.2,1.2,-1.4,1.2], [1.2,1.2,1.2,0.8] ];
	dict['GGCU'] = [ [1.6,1.2,1.0,1.2], [1.2,1.2,1.2,1.2], [1.2,1.2,-1.4,1.2], [1.2,1.2,1.2,0.7] ];
	dict['GUCG'] = [ [1.9,1.2,1.5,1.2], [1.2,1.2,1.2,1.2], [1.2,1.2,-1.4,1.2], [1.2,1.2,1.2,1.5] ];
	dict['UAAU'] = [ [1.9,1.9,1.9,1.9], [1.9,1.9,1.9,1.9], [1.9,1.9,-0.7,1.9], [1.9,1.9,1.9,1.7] ];
	dict['UCAG'] = [ [1.2,1.2,1.2,1.2], [1.2,1.2,1.2,1.2], [1.2,1.2,-1.4,1.2], [1.2,1.2,1.2,1.2] ];
	dict['UGAC'] = [ [1.2,1.2,1.2,1.2], [1.2,1.2,1.2,1.2], [1.2,1.2,-1.4,1.2], [1.2,1.2,1.2,1.2] ];
	dict['UUAA'] = [ [1.9,1.9,1.9,1.9], [1.9,1.9,1.9,1.9], [1.9,1.9,-0.7,1.9], [1.9,1.9,1.9,1.5] ];
	dict['UGAU'] = [ [1.9,1.9,1.9,1.9], [1.9,1.9,1.9,1.9], [1.9,1.9,-0.7,1.9], [1.9,1.9,1.9,1.9] ];
	dict['UUAG'] = [ [1.9,1.9,1.9,1.9], [1.9,1.9,1.9,1.9], [1.9,1.9,-0.7,1.9], [1.9,1.9,1.9,1.6] ];
	dict['GAUU'] = [ [1.9,1.9,1.9,1.9], [1.9,1.9,1.9,1.9], [1.9,1.9,-0.7,1.9], [1.9,1.9,1.9,1.6] ];
	dict['GCUG'] = [ [1.9,1.2,1.2,1.2], [1.2,1.2,1.2,1.2], [1.5,1.2,-1.4,1.2], [1.2,1.2,1.2,1.5] ];
	dict['GGUC'] = [ [0.6,1.2,-0.2,1.2], [0.5,1.2,1.2,1.0], [1.2,1.2,-1.4,1.2], [1.2,1.2,1.2,1.1] ];
	dict['GUUA'] = [ [1.9,1.9,1.9,1.9], [1.9,1.9,1.9,1.9], [1.9,1.9,-0.7,1.9], [1.9,1.9,1.9,1.2] ];
	dict['GGUU'] = [ [1.9,1.9,1.9,1.9], [1.9,1.9,1.9,1.9], [1.9,1.9,-0.7,1.9], [1.9,1.9,1.9,1.6] ];
	dict['GUUG'] = [ [1.9,1.9,1.9,1.9], [1.9,1.9,1.9,1.9], [1.9,1.9,-0.7,1.9], [1.9,1.9,1.9,1.2] ];
	dict['UAGU'] = [ [1.9,1.9,1.9,1.9], [1.9,1.9,1.9,1.9], [1.9,1.9,-0.7,1.9], [1.9,1.9,1.9,1.9] ];
	dict['UCGG'] = [ [1.6,1.2,1.2,1.2], [1.2,1.2,1.2,1.2], [1.0,1.2,-1.4,1.2], [1.2,1.2,1.2,0.7] ];
	dict['UGGC'] = [ [2.2,1.2,1.2,1.2], [1.3,1.7,1.2,1.2], [1.2,1.2,-1.4,1.2], [1.2,1.2,1.2,1.1] ];
	dict['UUGA'] = [ [1.9,1.9,1.9,1.9], [1.9,1.9,1.9,1.9], [1.9,1.9,-0.7,1.9], [1.9,1.9,1.9,1.6] ];
	dict['UGGU'] = [ [1.9,1.9,1.9,1.9], [1.9,1.9,1.9,1.9], [1.9,1.9,-0.7,1.9], [1.9,1.9,1.9,1.9] ];
	dict['UUGG'] = [ [1.9,1.9,1.9,1.9], [1.9,1.9,1.9,1.9], [1.9,1.9,-0.7,1.9], [1.9,1.9,1.9,1.6] ];

	return dict;
}

function init_2x1_loop_parameters_WW() { 	


	// 2x1 LOOPS:

	// Entry ABCD[k] corresponds to
	// 5' AiB
	// 3' CjkD
	// Where i,j is the entry in the 4x4 matrix (A,C,G,U) 
	var dict = {};

	// Init
	dict["AAUU"] = {};
	dict["UUAA"] = {};
	dict["AUUA"] = {};
	dict["UAAU"] = {};
	dict["CUGA"] = {};
	dict["AGUC"] = {};
	dict["CAGU"] = {};
	dict["UGAC"] = {};
	dict["GUCA"] = {};
	dict["ACUG"] = {};
	dict["GACU"] = {};
	dict["UCAG"] = {};
	dict["CGGC"] = {};
	dict["GGCC"] = {};
	dict["CCGG"] = {};
	dict["GCCG"] = {};
	
	dict["AGUU"] = {};
	dict["UUGA"] = {};
	dict["AUUG"] = {};
	dict["GUUA"] = {};
	dict["CGGU"] = {};
	dict["UGGC"] = {};
	dict["CUGG"] = {};
	dict["GGUC"] = {};
	dict["GGCU"] = {};
	dict["UCGG"] = {};
	dict["GUCG"] = {};
	dict["GCUG"] = {};
	dict["GAUU"] = {};
	dict["UUAG"] = {};
	dict["GGUU"] = {};
	dict["UUGG"] = {};
	dict["GUUG"] = {};
	dict["UGAU"] = {};
	dict["UAGU"] = {};
	dict["UGGU"] = {};



	dict['AAUU']['A'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['ACUG']['A'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['AGUC']['A'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['AUUA']['A'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['AGUU']['A'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['AUUG']['A'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['AAUU']['C'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['ACUG']['C'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['AGUC']['C'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['AUUA']['C'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['AGUU']['C'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['AUUG']['C'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['AAUU']['G'] = [ [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['ACUG']['G'] = [ [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['AGUC']['G'] = [ [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['AUUA']['G'] = [ [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['AGUU']['G'] = [ [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['AUUG']['G'] = [ [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['AAUU']['U'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.0,3.0,3.0,3.0] ];
	dict['ACUG']['U'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [2.2,2.2,2.2,2.2] ];
	dict['AGUC']['U'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [2.2,2.2,2.2,2.2] ];
	dict['AUUA']['U'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.0,3.0,3.0,3.0] ];
	dict['AGUU']['U'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.0,3.0,3.0,3.0] ];
	dict['AUUG']['U'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.0,3.0,3.0,3.0] ];
	dict['CAGU']['A'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['CCGG']['A'] = [ [2.5,2.3,1.1,2.3], [2.3,2.3,2.3,2.3], [1.7,2.3,0.8,2.3], [2.3,2.3,2.3,1.5] ];
	dict['CGGC']['A'] = [ [2.3,2.3,1.1,2.3], [2.3,2.3,2.3,2.3], [1.1,1.1,1.1,1.1], [2.3,2.3,2.3,1.5] ];
	dict['CUGA']['A'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['CGGU']['A'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['CUGG']['A'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['CAGU']['C'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['CCGG']['C'] = [ [2.3,1.7,1.1,2.3], [2.3,2.5,2.3,2.3], [1.1,2.3,1.1,2.3], [2.3,2.2,2.3,1.5] ];
	dict['CGGC']['C'] = [ [2.3,2.3,1.1,2.3], [2.3,2.3,2.3,2.3], [1.1,2.3,1.1,2.3], [2.3,2.3,2.3,1.5] ];
	dict['CUGA']['C'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['CGGU']['C'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['CUGG']['C'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['CAGU']['G'] = [ [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['CCGG']['G'] = [ [0.8,1.1,1.1,1.1], [2.3,2.3,2.3,2.3], [1.2,1.1,1.1,1.1], [2.3,2.3,2.3,1.5] ];
	dict['CGGC']['G'] = [ [1.1,1.1,1.1,1.1], [2.3,2.3,2.3,2.3], [1.1,1.1,1.1,1.1], [2.3,2.3,2.3,1.5] ];
	dict['CUGA']['G'] = [ [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['CGGU']['G'] = [ [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['CUGG']['G'] = [ [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['CAGU']['U'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [2.2,2.2,2.2,2.2] ];
	dict['CCGG']['U'] = [ [2.3,2.3,1.1,2.3], [2.5,2.3,2.3,2.3], [1.1,2.3,1.1,2.3], [1.5,1.7,1.5,1.4] ];
	dict['CGGC']['U'] = [ [2.3,2.3,1.1,2.3], [2.3,2.3,2.3,2.3], [1.1,2.3,1.1,2.3], [1.5,1.5,1.5,1.5] ];
	dict['CUGA']['U'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [2.2,2.2,2.2,2.2] ];
	dict['CGGU']['U'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [2.2,2.2,2.2,2.2] ];
	dict['CUGG']['U'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [2.2,2.2,2.2,2.2] ];
	dict['GACU']['A'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['GCCG']['A'] = [ [2.3,2.3,2.3,2.3], [2.3,2.3,2.3,2.3], [1.1,2.3,1.1,2.3], [2.3,2.3,2.3,1.5] ];
	dict['GGCC']['A'] = [ [2.5,2.3,2.1,2.3], [2.3,2.3,2.3,2.3], [1.1,1.1,1.1,1.1], [2.3,2.3,2.3,1.5] ];
	dict['GUCA']['A'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['GGCU']['A'] = [ [2.5,3.0,2.1,3.0], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['GUCG']['A'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['GACU']['C'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['GCCG']['C'] = [ [2.3,2.3,2.3,2.3], [2.3,2.3,2.3,2.3], [1.1,2.3,1.1,2.3], [2.3,2.3,2.3,1.5] ];
	dict['GGCC']['C'] = [ [2.3,2.3,2.3,2.3], [2.3,2.3,2.3,2.3], [1.1,2.3,1.1,2.3], [2.3,2.3,2.3,1.5] ];
	dict['GUCA']['C'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['GGCU']['C'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['GUCG']['C'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['GACU']['G'] = [ [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['GCCG']['G'] = [ [1.1,1.1,1.1,1.1], [2.3,2.3,2.3,2.3], [1.1,1.1,1.1,1.1], [2.3,2.3,2.3,1.5] ];
	dict['GGCC']['G'] = [ [1.2,1.1,1.1,1.1], [2.3,2.3,2.3,2.3], [1.1,1.1,1.1,1.1], [2.3,2.3,2.3,1.5] ];
	dict['GUCA']['G'] = [ [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['GGCU']['G'] = [ [1.2,1.9,1.9,1.9], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['GUCG']['G'] = [ [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['GACU']['U'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [2.2,2.2,2.2,2.2] ];
	dict['GCCG']['U'] = [ [2.3,2.3,2.3,2.3], [2.3,2.3,2.3,2.3], [1.1,2.3,1.1,2.3], [1.5,1.5,1.5,1.5] ];
	dict['GGCC']['U'] = [ [2.3,2.3,2.3,2.3], [2.3,1.9,2.3,2.3], [1.1,2.3,1.1,2.3], [1.5,1.5,1.5,1.5] ];
	dict['GUCA']['U'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [2.2,2.2,2.2,2.2] ];
	dict['GGCU']['U'] = [ [3.0,3.0,3.0,3.0], [3.0,1.9,3.0,3.0], [1.9,3.0,1.9,3.0], [2.2,2.2,2.2,2.2] ];
	dict['GUCG']['U'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [2.2,2.2,2.2,2.2] ];
	dict['UAAU']['A'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['UCAG']['A'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['UGAC']['A'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['UUAA']['A'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['UGAU']['A'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['UUAG']['A'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['UAAU']['C'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['UCAG']['C'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['UGAC']['C'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['UUAA']['C'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['UGAU']['C'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['UUAG']['C'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['UAAU']['G'] = [ [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['UCAG']['G'] = [ [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['UGAC']['G'] = [ [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['UUAA']['G'] = [ [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['UGAU']['G'] = [ [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['UUAG']['G'] = [ [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['UAAU']['U'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.0,3.0,3.0,3.0] ];
	dict['UCAG']['U'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [2.2,2.2,2.2,2.2] ];
	dict['UGAC']['U'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [2.2,2.2,2.2,2.2] ];
	dict['UUAA']['U'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.0,3.0,3.0,3.0] ];
	dict['UGAU']['U'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.0,3.0,3.0,3.0] ];
	dict['UUAG']['U'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.0,3.0,3.0,3.0] ];
	dict['GAUU']['A'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['GCUG']['A'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['GGUC']['A'] = [ [2.5,3.0,2.1,3.0], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['GUUA']['A'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['GGUU']['A'] = [ [2.5,3.7,2.1,3.7], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['GUUG']['A'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['GAUU']['C'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['GCUG']['C'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['GGUC']['C'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['GUUA']['C'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['GGUU']['C'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['GUUG']['C'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['GAUU']['G'] = [ [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['GCUG']['G'] = [ [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['GGUC']['G'] = [ [1.2,1.9,1.9,1.9], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['GUUA']['G'] = [ [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['GGUU']['G'] = [ [1.2,2.6,2.6,2.6], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['GUUG']['G'] = [ [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['GAUU']['U'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.0,3.0,3.0,3.0] ];
	dict['GCUG']['U'] = [ [3.0,3.0,3.0,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [2.2,2.2,2.2,2.2] ];
	dict['GGUC']['U'] = [ [3.0,3.0,3.0,3.0], [3.0,1.9,3.0,3.0], [1.9,3.0,1.9,3.0], [2.2,2.2,2.2,2.2] ];
	dict['GUUA']['U'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.0,3.0,3.0,3.0] ];
	dict['GGUU']['U'] = [ [3.7,3.7,3.7,3.7], [3.7,1.9,3.7,3.7], [2.6,3.7,2.6,3.7], [3.0,3.0,3.0,3.0] ];
	dict['GUUG']['U'] = [ [3.7,3.7,3.7,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.0,3.0,3.0,3.0] ];
	dict['UAGU']['A'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['UCGG']['A'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['UGGC']['A'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['UUGA']['A'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['UGGU']['A'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['UUGG']['A'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['UAGU']['C'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['UCGG']['C'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['UGGC']['C'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [3.0,3.0,3.0,2.2] ];
	dict['UUGA']['C'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['UGGU']['C'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['UUGG']['C'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.7,3.7,3.7,3.0] ];
	dict['UAGU']['G'] = [ [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['UCGG']['G'] = [ [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['UGGC']['G'] = [ [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,3.0], [1.9,1.9,1.9,1.9], [3.0,3.0,3.0,2.2] ];
	dict['UUGA']['G'] = [ [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['UGGU']['G'] = [ [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['UUGG']['G'] = [ [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.7], [2.6,2.6,2.6,2.6], [3.7,3.7,3.7,3.0] ];
	dict['UAGU']['U'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.0,3.0,3.0,3.0] ];
	dict['UCGG']['U'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [2.2,2.2,2.2,2.2] ];
	dict['UGGC']['U'] = [ [3.0,3.0,1.9,3.0], [3.0,3.0,3.0,3.0], [1.9,3.0,1.9,3.0], [2.2,2.2,2.2,2.2] ];
	dict['UUGA']['U'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.0,3.0,3.0,3.0] ];
	dict['UGGU']['U'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.0,3.0,3.0,3.0] ];
	dict['UUGG']['U'] = [ [3.7,3.7,2.6,3.7], [3.7,3.7,3.7,3.7], [2.6,3.7,2.6,3.7], [3.0,3.0,3.0,3.0] ];

	return dict;
}

function init_2x2_loop_parameters_WW() { 

	// 2x2 LOOPS:

	// Entry ABCD corresponds to
	// 5' AijB
	// 3' CklD
	// Where [ij][kl] is the entry in the 16x16 matrix (AA,AC,AG,AU, ..., UG,UU) indexed by number not character
	var dict = {};




	dict['AAUU'] = [ [2.8,2.3,1.7,2.3,2.8,2.8,2.8,2.8,1.8,2.3,1.2,2.3,2.8,2.5,2.8,2.5], [2.6,2.2,1.6,2.2,2.6,2.6,2.6,2.6,1.7,2.2,1.1,2.2,2.6,2.3,2.6,1.8], [2.2,1.8,1.2,1.8,2.2,2.8,2.2,2.8,1.3,1.8,2.0,1.8,2.2,2.5,2.2,1.4], [2.6,2.2,1.6,2.2,2.6,2.6,2.6,2.6,1.7,2.2,1.1,2.2,2.6,2.3,2.6,1.8], [2.5,2.1,1.5,2.1,2.5,2.5,2.5,2.5,1.6,2.1,1.0,2.1,2.5,2.2,2.5,1.7], [2.6,2.1,2.1,2.1,2.6,2.6,2.6,2.6,2.2,2.1,1.0,2.1,2.6,2.3,2.6,1.7], [2.5,2.1,1.5,2.1,2.5,2.5,2.5,2.5,1.6,2.1,1.0,2.1,2.5,2.2,2.5,1.7], [2.6,2.1,2.1,2.1,2.6,2.6,2.6,2.6,2.2,2.1,1.0,2.1,2.6,2.3,2.6,1.7], [1.5,1.1,0.5,1.1,1.5,2.1,1.5,2.1,0.6,1.1,1.3,1.1,1.5,1.8,1.5,0.7], [2.6,2.2,1.6,2.2,2.6,2.6,2.6,2.6,1.7,2.2,1.1,2.2,2.6,2.3,2.6,1.8], [1.0,0.6,1.3,0.6,1.0,1.0,1.0,1.0,1.4,0.6,2.1,0.6,1.0,0.7,1.0,1.5], [2.6,2.2,1.6,2.2,2.6,2.6,2.6,2.6,1.7,2.2,1.1,2.2,2.6,2.3,2.6,1.8], [2.5,2.1,1.5,2.1,2.5,2.5,2.5,2.5,1.6,2.1,1.0,2.1,2.5,2.2,2.5,1.7], [2.6,2.1,2.1,2.1,2.6,2.6,2.6,2.6,2.2,2.1,1.0,2.1,2.6,2.3,2.6,1.7], [2.5,2.1,1.5,2.1,2.5,2.5,2.5,2.5,1.6,2.1,1.0,2.1,2.5,2.2,2.5,1.7], [2.3,1.2,0.6,1.2,1.7,1.7,1.7,1.7,0.7,1.2,1.4,1.2,1.7,1.4,1.7,0.8] ];
	dict['ACUG'] = [ [2.1,1.9,0.1,1.9,1.8,1.9,1.8,1.9,0.7,1.9,0.5,1.9,1.8,1.9,1.8,1.7], [2.0,1.7,0.0,1.7,1.7,1.7,1.7,1.7,0.6,1.7,0.3,1.7,1.7,1.8,1.7,1.0], [1.6,1.3,-0.4,1.3,1.3,1.9,1.3,1.9,0.2,1.3,1.2,1.3,1.3,2.0,1.3,0.6], [2.0,1.7,0.0,1.7,1.7,1.7,1.7,1.7,0.6,1.7,0.3,1.7,1.7,1.8,1.7,1.0], [1.9,1.6,-0.1,1.6,1.6,1.6,1.6,1.6,0.5,1.6,0.2,1.6,1.6,1.7,1.6,0.9], [1.9,1.7,0.5,1.7,1.6,1.7,1.6,1.7,1.1,1.7,0.3,1.7,1.6,1.7,1.6,0.9], [1.9,1.6,-0.1,1.6,1.6,1.6,1.6,1.6,0.5,1.6,0.2,1.6,1.6,1.7,1.6,0.9], [1.9,1.7,0.5,1.7,1.6,1.7,1.6,1.7,1.1,1.7,0.3,1.7,1.6,1.7,1.6,0.9], [0.9,0.6,-1.1,0.6,0.6,1.2,0.6,1.2,-0.5,0.6,0.5,0.6,0.6,1.3,0.6,-0.1], [2.0,1.7,0.0,1.7,1.7,1.7,1.7,1.7,0.6,1.7,0.3,1.7,1.7,1.8,1.7,1.0], [0.4,0.1,-0.3,0.1,0.1,0.1,0.1,0.1,0.3,0.1,1.3,0.1,0.1,0.2,0.1,0.7], [2.0,1.7,0.0,1.7,1.7,1.7,1.7,1.7,0.6,1.7,0.3,1.7,1.7,1.8,1.7,1.0], [1.9,1.6,-0.1,1.6,1.6,1.6,1.6,1.6,0.5,1.6,0.2,1.6,1.6,1.7,1.6,0.9], [1.9,1.7,0.5,1.7,1.6,1.7,1.6,1.7,1.1,1.7,0.3,1.7,1.6,1.7,1.6,0.9], [1.9,1.6,-0.1,1.6,1.6,1.6,1.6,1.6,0.5,1.6,0.2,1.6,1.6,1.7,1.6,0.9], [1.6,0.8,-1.0,0.8,0.7,0.8,0.7,0.8,-0.3,0.8,0.7,0.8,0.7,0.8,0.7,0.0] ];
	dict['AGUC'] = [ [2.0,1.9,1.0,1.9,2.4,2.2,2.4,2.1,1.0,1.9,0.5,1.9,2.4,2.1,2.4,1.8], [1.8,1.8,0.9,1.8,2.2,2.1,2.2,1.9,0.9,1.8,0.3,1.8,2.2,1.9,2.2,1.0], [1.4,1.4,0.5,1.4,1.8,2.3,1.8,2.1,0.5,1.4,1.2,1.4,1.8,2.1,1.8,0.6], [1.8,1.8,0.9,1.8,2.2,2.1,2.2,1.9,0.9,1.8,0.3,1.8,2.2,1.9,2.2,1.0], [1.7,1.7,0.8,1.7,2.1,2.0,2.1,1.8,0.8,1.7,0.2,1.7,2.1,1.8,2.1,0.9], [1.8,1.7,1.4,1.7,2.2,2.0,2.2,1.9,1.4,1.7,0.3,1.7,2.2,1.9,2.2,1.0], [1.7,1.7,0.8,1.7,2.1,2.0,2.1,1.8,0.8,1.7,0.2,1.7,2.1,1.8,2.1,0.9], [1.8,1.7,1.4,1.7,2.2,2.0,2.2,1.9,1.4,1.7,0.3,1.7,2.2,1.9,2.2,1.0], [0.7,0.7,-0.2,0.7,1.1,1.6,1.1,1.4,-0.2,0.7,0.5,0.7,1.1,1.4,1.1,0.0], [1.8,1.8,0.9,1.8,2.2,2.1,2.2,1.9,0.9,1.8,0.3,1.8,2.2,1.9,2.2,1.0], [0.2,0.2,0.6,0.2,0.6,0.5,0.6,0.3,0.6,0.2,1.3,0.2,0.6,0.3,0.6,0.7], [1.8,1.8,0.9,1.8,2.2,2.1,2.2,1.9,0.9,1.8,0.3,1.8,2.2,1.9,2.2,1.0], [1.7,1.7,0.8,1.7,2.1,2.0,2.1,1.8,0.8,1.7,0.2,1.7,2.1,1.8,2.1,0.9], [1.8,1.7,1.4,1.7,2.2,2.0,2.2,1.9,1.4,1.7,0.3,1.7,2.2,1.9,2.2,1.0], [1.7,1.7,0.8,1.7,2.1,2.0,2.1,1.8,0.8,1.7,0.2,1.7,2.1,1.8,2.1,0.9], [1.5,0.8,0.0,0.8,1.3,1.1,1.3,1.0,0.0,0.8,0.7,0.8,1.3,1.0,1.3,0.1] ];
	dict['AGUU'] = [ [2.4,2.8,1.4,2.8,2.8,2.8,2.8,2.8,3.1,2.8,1.5,2.8,2.8,2.8,2.8,3.4], [2.3,2.6,1.3,2.6,2.6,2.6,2.6,2.6,2.9,2.6,1.3,2.6,2.6,2.6,2.6,2.6], [1.9,2.2,0.9,2.2,2.2,2.8,2.2,2.8,2.5,2.2,2.2,2.2,2.2,2.8,2.2,2.2], [2.3,2.6,1.3,2.6,2.6,2.6,2.6,2.6,2.9,2.6,1.3,2.6,2.6,2.6,2.6,2.6], [2.2,2.5,1.2,2.5,2.5,2.5,2.5,2.5,2.8,2.5,1.2,2.5,2.5,2.5,2.5,2.5], [2.2,2.6,1.8,2.6,2.6,2.6,2.6,2.6,3.5,2.6,1.3,2.6,2.6,2.6,2.6,2.6], [2.2,2.5,1.2,2.5,2.5,2.5,2.5,2.5,2.8,2.5,1.2,2.5,2.5,2.5,2.5,2.5], [2.2,2.6,1.8,2.6,2.6,2.6,2.6,2.6,3.5,2.6,1.3,2.6,2.6,2.6,2.6,2.6], [1.2,1.5,0.2,1.5,1.5,2.1,1.5,2.1,1.8,1.5,1.5,1.5,1.5,2.1,1.5,1.5], [2.3,2.6,1.3,2.6,2.6,2.6,2.6,2.6,2.9,2.6,1.3,2.6,2.6,2.6,2.6,2.6], [0.7,1.0,1.0,1.0,1.0,1.0,1.0,1.0,2.6,1.0,2.3,1.0,1.0,1.0,1.0,2.3], [2.3,2.6,1.3,2.6,2.6,2.6,2.6,2.6,2.9,2.6,1.3,2.6,2.6,2.6,2.6,2.6], [2.2,2.5,1.2,2.5,2.5,2.5,2.5,2.5,2.8,2.5,1.2,2.5,2.5,2.5,2.5,2.5], [2.2,2.6,1.8,2.6,2.6,2.6,2.6,2.6,3.5,2.6,1.3,2.6,2.6,2.6,2.6,2.6], [2.2,2.5,1.2,2.5,2.5,2.5,2.5,2.5,2.8,2.5,1.2,2.5,2.5,2.5,2.5,2.5], [1.9,1.7,0.3,1.7,1.7,1.7,1.7,1.7,2.0,1.7,1.7,1.7,1.7,1.7,1.7,1.7] ];
	dict['AUUA'] = [ [2.8,2.5,1.5,2.5,2.6,2.6,2.6,2.6,2.2,2.5,1.0,2.5,2.6,2.6,2.6,2.3], [2.6,2.4,1.4,2.4,2.5,2.4,2.5,2.4,2.1,2.4,0.9,2.4,2.5,2.4,2.5,1.5], [2.2,2.0,1.0,2.0,2.1,2.6,2.1,2.6,1.7,2.0,1.8,2.0,2.1,2.6,2.1,1.1], [2.6,2.4,1.4,2.4,2.5,2.4,2.5,2.4,2.1,2.4,0.9,2.4,2.5,2.4,2.5,1.5], [2.5,2.3,1.3,2.3,2.4,2.3,2.4,2.3,2.0,2.3,0.8,2.3,2.4,2.3,2.4,1.4], [2.6,2.3,1.9,2.3,2.4,2.4,2.4,2.4,2.6,2.3,0.8,2.3,2.4,2.4,2.4,1.5], [2.5,2.3,1.3,2.3,2.4,2.3,2.4,2.3,2.0,2.3,0.8,2.3,2.4,2.3,2.4,1.4], [2.6,2.3,1.9,2.3,2.4,2.4,2.4,2.4,2.6,2.3,0.8,2.3,2.4,2.4,2.4,1.5], [1.5,1.3,0.3,1.3,1.4,1.9,1.4,1.9,1.0,1.3,1.1,1.3,1.4,1.9,1.4,0.4], [2.6,2.4,1.4,2.4,2.5,2.4,2.5,2.4,2.1,2.4,0.9,2.4,2.5,2.4,2.5,1.5], [1.0,0.8,1.1,0.8,0.9,0.8,0.9,0.8,1.8,0.8,1.9,0.8,0.9,0.8,0.9,1.2], [2.6,2.4,1.4,2.4,2.5,2.4,2.5,2.4,2.1,2.4,0.9,2.4,2.5,2.4,2.5,1.5], [2.5,2.3,1.3,2.3,2.4,2.3,2.4,2.3,2.0,2.3,0.8,2.3,2.4,2.3,2.4,1.4], [2.6,2.3,1.9,2.3,2.4,2.4,2.4,2.4,2.6,2.3,0.8,2.3,2.4,2.4,2.4,1.5], [2.5,2.3,1.3,2.3,2.4,2.3,2.4,2.3,2.0,2.3,0.8,2.3,2.4,2.3,2.4,1.4], [2.3,1.4,0.4,1.4,1.5,1.5,1.5,1.5,1.1,1.4,1.2,1.4,1.5,1.5,1.5,0.6] ];
	dict['AUUG'] = [ [3.4,3.1,2.3,3.1,3.1,3.1,3.1,3.1,2.7,3.1,1.8,3.1,3.1,3.1,3.1,3.7], [3.3,2.9,2.1,2.9,2.9,2.9,2.9,2.9,2.5,2.9,1.6,2.9,2.9,2.9,2.9,2.9], [2.9,2.5,1.7,2.5,2.5,3.1,2.5,3.1,2.1,2.5,2.5,2.5,2.5,3.1,2.5,2.5], [3.3,2.9,2.1,2.9,2.9,2.9,2.9,2.9,2.5,2.9,1.6,2.9,2.9,2.9,2.9,2.9], [3.2,2.8,2.0,2.8,2.8,2.8,2.8,2.8,2.4,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [3.2,2.9,2.7,2.9,2.9,2.9,2.9,2.9,3.1,2.9,1.6,2.9,2.9,2.9,2.9,2.9], [3.2,2.8,2.0,2.8,2.8,2.8,2.8,2.8,2.4,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [3.2,2.9,2.7,2.9,2.9,2.9,2.9,2.9,3.1,2.9,1.6,2.9,2.9,2.9,2.9,2.9], [2.2,1.8,1.0,1.8,1.8,2.4,1.8,2.4,1.4,1.8,1.8,1.8,1.8,2.4,1.8,1.8], [3.3,2.9,2.1,2.9,2.9,2.9,2.9,2.9,2.5,2.9,1.6,2.9,2.9,2.9,2.9,2.9], [1.7,1.3,1.8,1.3,1.3,1.3,1.3,1.3,2.2,1.3,2.6,1.3,1.3,1.3,1.3,2.6], [3.3,2.9,2.1,2.9,2.9,2.9,2.9,2.9,2.5,2.9,1.6,2.9,2.9,2.9,2.9,2.9], [3.2,2.8,2.0,2.8,2.8,2.8,2.8,2.8,2.4,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [3.2,2.9,2.7,2.9,2.9,2.9,2.9,2.9,3.1,2.9,1.6,2.9,2.9,2.9,2.9,2.9], [3.2,2.8,2.0,2.8,2.8,2.8,2.8,2.8,2.4,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [2.9,2.0,1.2,2.0,2.0,2.0,2.0,2.0,1.6,2.0,2.0,2.0,2.0,2.0,2.0,2.0] ];
	dict['CAGU'] = [ [2.0,1.5,0.9,1.5,2.0,2.0,2.0,2.0,1.0,1.5,0.4,1.5,2.0,1.7,2.0,1.7], [2.4,1.9,1.3,1.9,2.4,2.4,2.4,2.4,1.4,1.9,0.8,1.9,2.4,2.1,2.4,1.5], [1.0,0.6,0.0,0.6,1.0,1.6,1.0,1.6,0.1,0.6,0.8,0.6,1.0,1.3,1.0,0.2], [2.4,1.9,1.3,1.9,2.4,2.4,2.4,2.4,1.4,1.9,0.8,1.9,2.4,2.1,2.4,1.5], [1.9,1.5,0.9,1.5,1.9,1.9,1.9,1.9,1.0,1.5,0.4,1.5,1.9,1.6,1.9,1.1], [2.2,1.8,1.8,1.8,2.2,2.2,2.2,2.2,1.9,1.8,0.7,1.8,2.2,1.9,2.2,1.4], [1.9,1.5,0.9,1.5,1.9,1.9,1.9,1.9,1.0,1.5,0.4,1.5,1.9,1.6,1.9,1.1], [2.1,1.6,1.6,1.6,2.1,2.1,2.1,2.1,1.7,1.6,0.5,1.6,2.1,1.8,2.1,1.2], [1.0,0.6,0.0,0.6,1.0,1.6,1.0,1.6,0.1,0.6,0.8,0.6,1.0,1.3,1.0,0.2], [2.4,1.9,1.3,1.9,2.4,2.4,2.4,2.4,1.4,1.9,0.8,1.9,2.4,2.1,2.4,1.5], [0.5,0.0,0.7,0.0,0.5,0.5,0.5,0.5,0.8,0.0,1.5,0.0,0.5,0.2,0.5,0.9], [2.4,1.9,1.3,1.9,2.4,2.4,2.4,2.4,1.4,1.9,0.8,1.9,2.4,2.1,2.4,1.5], [1.9,1.5,0.9,1.5,1.9,1.9,1.9,1.9,1.0,1.5,0.4,1.5,1.9,1.6,1.9,1.1], [2.1,1.6,1.6,1.6,2.1,2.1,2.1,2.1,1.7,1.6,0.5,1.6,2.1,1.8,2.1,1.2], [1.9,1.5,0.9,1.5,1.9,1.9,1.9,1.9,1.0,1.5,0.4,1.5,1.9,1.6,1.9,1.1], [1.8,0.7,0.1,0.7,1.2,1.2,1.2,1.2,0.2,0.7,0.9,0.7,1.2,0.9,1.2,0.3] ];
	dict['CCGG'] = [ [1.3,1.1,-0.3,1.1,1.0,1.1,1.0,1.1,0.4,1.1,-0.3,1.1,1.0,1.1,1.0,1.5], [0.6,1.5,0.1,1.5,0.5,1.5,1.4,1.5,0.3,1.5,-0.3,1.5,1.4,1.5,1.4,0.0], [0.0,-0.7,-1.6,0.1,-1.0,-0.6,0.1,0.7,-0.7,0.1,0.0,0.1,0.1,0.8,0.1,0.9], [1.7,1.5,-0.3,1.5,1.4,1.5,1.4,1.5,0.3,1.5,0.1,1.5,1.4,1.5,1.4,0.7], [1.3,1.0,-0.7,1.0,1.1,1.0,1.0,1.0,0.7,1.0,-0.4,1.0,1.0,1.1,1.0,-0.2], [2.2,1.3,0.7,1.3,1.9,1.3,1.3,1.3,0.7,1.3,-0.1,1.3,1.3,1.4,1.3,-0.1], [1.3,1.0,-0.7,1.0,1.0,1.0,1.0,1.0,-0.1,1.0,-0.4,1.0,1.0,1.1,1.0,0.3], [1.4,1.2,0.0,1.2,1.1,1.2,1.1,1.7,0.6,1.2,0.2,1.2,1.1,1.2,1.1,0.2], [-0.2,-0.4,-1.7,0.1,0.7,0.7,0.1,0.7,-0.5,0.1,-0.3,0.1,0.1,0.8,0.1,0.9], [1.7,1.5,-0.3,1.5,1.4,1.5,1.4,1.5,0.3,1.5,0.1,1.5,1.4,1.5,1.4,0.7], [-0.1,-0.4,-0.9,-0.4,-0.5,-0.4,-0.5,0.2,-0.3,-0.4,0.8,-0.4,-0.5,-0.5,-0.5,1.4], [1.7,1.5,-0.3,1.5,1.4,1.5,1.4,1.5,0.3,1.5,0.1,1.5,1.4,1.5,1.4,0.7], [1.3,1.0,-0.7,1.0,1.0,1.0,1.0,1.0,-0.1,1.0,-0.4,1.0,1.0,1.1,1.0,0.3], [1.4,1.2,0.0,1.2,1.1,1.2,1.1,1.2,0.5,1.2,-0.6,1.2,1.1,1.2,1.1,0.4], [1.3,1.0,-0.7,1.0,1.0,1.0,1.0,1.0,-0.1,1.0,-0.4,1.0,1.0,1.1,1.0,0.3], [1.4,0.3,0.5,0.3,0.3,0.3,0.2,0.3,1.4,0.3,0.7,0.3,0.2,0.3,0.2,-0.6] ];
	dict['CGGC'] = [ [1.2,1.1,0.2,1.1,1.6,1.4,1.6,1.3,0.2,1.1,-0.3,1.1,1.6,1.3,1.6,1.0], [1.6,1.5,0.6,1.5,2.0,1.8,2.0,1.7,0.6,1.5,0.1,1.5,2.0,1.7,2.0,0.8], [0.2,0.2,-0.7,0.2,0.6,1.1,0.6,0.9,-0.7,0.2,0.0,0.2,0.6,0.9,0.6,-0.5], [1.6,1.5,0.6,1.5,2.0,1.8,2.0,1.7,0.6,1.5,0.1,1.5,2.0,1.7,2.0,0.8], [1.1,1.1,0.2,1.1,1.5,1.4,1.5,1.2,0.2,1.1,-0.4,1.1,1.5,1.2,1.5,0.3], [1.4,1.4,1.1,1.4,1.8,1.7,1.8,1.5,1.1,1.4,-0.1,1.4,1.8,1.5,1.8,0.6], [1.1,1.1,0.2,1.1,1.5,1.4,1.5,1.2,0.2,1.1,-0.4,1.1,1.5,1.2,1.5,0.3], [1.3,1.2,0.9,1.2,1.7,1.5,1.7,1.4,0.9,1.2,-0.2,1.2,1.7,1.4,1.7,0.5], [0.2,0.2,-0.7,0.2,0.6,1.1,0.6,0.9,-0.7,0.2,0.0,0.2,0.6,0.9,0.6,-0.5], [1.6,1.5,0.6,1.5,2.0,1.8,2.0,1.7,0.6,1.5,0.1,1.5,2.0,1.7,2.0,0.8], [-0.3,-0.4,0.0,-0.4,0.1,-0.1,0.1,-0.2,0.0,-0.4,0.8,-0.4,0.1,-0.2,0.1,0.2], [1.6,1.5,0.6,1.5,2.0,1.8,2.0,1.7,0.6,1.5,0.1,1.5,2.0,1.7,2.0,0.8], [1.1,1.1,0.2,1.1,1.5,1.4,1.5,1.2,0.2,1.1,-0.4,1.1,1.5,1.2,1.5,0.3], [1.3,1.2,0.9,1.2,1.7,1.5,1.7,1.4,0.9,1.2,-0.2,1.2,1.7,1.4,1.7,0.5], [1.1,1.1,0.2,1.1,1.5,1.4,1.5,1.2,0.2,1.1,-0.4,1.1,1.5,1.2,1.5,0.3], [1.0,0.3,-0.5,0.3,0.8,0.6,0.8,0.5,-0.5,0.3,0.2,0.3,0.8,0.5,0.8,-0.4] ];
	dict['CGGU'] = [ [1.6,2.0,0.6,2.0,2.0,2.0,2.0,2.0,2.3,2.0,0.7,2.0,2.0,2.0,2.0,2.6], [2.0,2.4,1.0,2.4,2.4,2.4,2.4,2.4,2.7,2.4,1.1,2.4,2.4,2.4,2.4,2.4], [0.7,1.0,-0.3,1.0,1.0,1.6,1.0,1.6,1.3,1.0,1.0,1.0,1.0,1.6,1.0,1.0], [2.0,2.4,1.0,2.4,2.4,2.4,2.4,2.4,2.7,2.4,1.1,2.4,2.4,2.4,2.4,2.4], [1.6,1.9,0.6,1.9,1.9,1.9,1.9,1.9,2.2,1.9,0.6,1.9,1.9,1.9,1.9,1.9], [1.9,2.2,1.5,2.2,2.2,2.2,2.2,2.2,3.1,2.2,0.9,2.2,2.2,2.2,2.2,2.2], [1.6,1.9,0.6,1.9,1.9,1.9,1.9,1.9,2.2,1.9,0.6,1.9,1.9,1.9,1.9,1.9], [1.7,2.1,1.3,2.1,2.1,2.1,2.1,2.1,3.0,2.1,0.8,2.1,2.1,2.1,2.1,2.1], [0.7,1.0,-0.3,1.0,1.0,1.6,1.0,1.6,1.3,1.0,1.0,1.0,1.0,1.6,1.0,1.0], [2.0,2.4,1.0,2.4,2.4,2.4,2.4,2.4,2.7,2.4,1.1,2.4,2.4,2.4,2.4,2.4], [0.1,0.5,0.4,0.5,0.5,0.5,0.5,0.5,2.1,0.5,1.8,0.5,0.5,0.5,0.5,1.8], [2.0,2.4,1.0,2.4,2.4,2.4,2.4,2.4,2.7,2.4,1.1,2.4,2.4,2.4,2.4,2.4], [1.6,1.9,0.6,1.9,1.9,1.9,1.9,1.9,2.2,1.9,0.6,1.9,1.9,1.9,1.9,1.9], [1.7,2.1,1.3,2.1,2.1,2.1,2.1,2.1,3.0,2.1,0.8,2.1,2.1,2.1,2.1,2.1], [1.6,1.9,0.6,1.9,1.9,1.9,1.9,1.9,2.2,1.9,0.6,1.9,1.9,1.9,1.9,1.9], [1.4,1.2,-0.1,1.2,1.2,1.2,1.2,1.2,1.5,1.2,1.2,1.2,1.2,1.2,1.2,1.2] ];
	dict['CUGA'] = [ [2.0,1.7,0.7,1.7,1.8,1.8,1.8,1.8,1.4,1.7,0.2,1.7,1.8,1.8,1.8,1.5], [2.4,2.1,1.1,2.1,2.2,2.2,2.2,2.2,1.8,2.1,0.6,2.1,2.2,2.2,2.2,1.3], [1.0,0.8,-0.2,0.8,0.9,1.4,0.9,1.4,0.5,0.8,0.6,0.8,0.9,1.4,0.9,0.0], [2.4,2.1,1.1,2.1,2.2,2.2,2.2,2.2,1.8,2.1,0.6,2.1,2.2,2.2,2.2,1.3], [1.9,1.7,0.7,1.7,1.8,1.7,1.8,1.7,1.4,1.7,0.2,1.7,1.8,1.7,1.8,0.8], [2.2,2.0,1.6,2.0,2.1,2.0,2.1,2.0,2.3,2.0,0.5,2.0,2.1,2.0,2.1,1.1], [1.9,1.7,0.7,1.7,1.8,1.7,1.8,1.7,1.4,1.7,0.2,1.7,1.8,1.7,1.8,0.8], [2.1,1.8,1.4,1.8,1.9,1.9,1.9,1.9,2.1,1.8,0.3,1.8,1.9,1.9,1.9,1.0], [1.0,0.8,-0.2,0.8,0.9,1.4,0.9,1.4,0.5,0.8,0.6,0.8,0.9,1.4,0.9,0.0], [2.4,2.1,1.1,2.1,2.2,2.2,2.2,2.2,1.8,2.1,0.6,2.1,2.2,2.2,2.2,1.3], [0.5,0.2,0.5,0.2,0.3,0.3,0.3,0.3,1.2,0.2,1.3,0.2,0.3,0.3,0.3,0.7], [2.4,2.1,1.1,2.1,2.2,2.2,2.2,2.2,1.8,2.1,0.6,2.1,2.2,2.2,2.2,1.3], [1.9,1.7,0.7,1.7,1.8,1.7,1.8,1.7,1.4,1.7,0.2,1.7,1.8,1.7,1.8,0.8], [2.1,1.8,1.4,1.8,1.9,1.9,1.9,1.9,2.1,1.8,0.3,1.8,1.9,1.9,1.9,1.0], [1.9,1.7,0.7,1.7,1.8,1.7,1.8,1.7,1.4,1.7,0.2,1.7,1.8,1.7,1.8,0.8], [1.8,0.9,0.0,0.9,1.0,1.0,1.0,1.0,0.6,0.9,0.7,0.9,1.0,1.0,1.0,0.1] ];
	dict['CUGG'] = [ [2.7,2.3,1.5,2.3,2.3,2.3,2.3,2.3,1.9,2.3,1.0,2.3,2.3,2.3,2.3,2.9], [3.0,2.7,1.9,2.7,2.7,2.7,2.7,2.7,2.3,2.7,1.4,2.7,2.7,2.7,2.7,2.7], [1.7,1.3,0.5,1.3,1.3,1.9,1.3,1.9,0.9,1.3,1.3,1.3,1.3,1.9,1.3,1.3], [3.0,2.7,1.9,2.7,2.7,2.7,2.7,2.7,2.3,2.7,1.4,2.7,2.7,2.7,2.7,2.7], [2.6,2.2,1.4,2.2,2.2,2.2,2.2,2.2,1.8,2.2,0.9,2.2,2.2,2.2,2.2,2.2], [2.9,2.5,2.3,2.5,2.5,2.5,2.5,2.5,2.7,2.5,1.2,2.5,2.5,2.5,2.5,2.5], [2.6,2.2,1.4,2.2,2.2,2.2,2.2,2.2,1.8,2.2,0.9,2.2,2.2,2.2,2.2,2.2], [2.7,2.4,2.2,2.4,2.4,2.4,2.4,2.4,2.6,2.4,1.1,2.4,2.4,2.4,2.4,2.4], [1.7,1.3,0.5,1.3,1.3,1.9,1.3,1.9,0.9,1.3,1.3,1.3,1.3,1.9,1.3,1.3], [3.0,2.7,1.9,2.7,2.7,2.7,2.7,2.7,2.3,2.7,1.4,2.7,2.7,2.7,2.7,2.7], [1.1,0.8,1.3,0.8,0.8,0.8,0.8,0.8,1.7,0.8,2.1,0.8,0.8,0.8,0.8,2.1], [3.0,2.7,1.9,2.7,2.7,2.7,2.7,2.7,2.3,2.7,1.4,2.7,2.7,2.7,2.7,2.7], [2.6,2.2,1.4,2.2,2.2,2.2,2.2,2.2,1.8,2.2,0.9,2.2,2.2,2.2,2.2,2.2], [2.7,2.4,2.2,2.4,2.4,2.4,2.4,2.4,2.6,2.4,1.1,2.4,2.4,2.4,2.4,2.4], [2.6,2.2,1.4,2.2,2.2,2.2,2.2,2.2,1.8,2.2,0.9,2.2,2.2,2.2,2.2,2.2], [2.4,1.5,0.7,1.5,1.5,1.5,1.5,1.5,1.1,1.5,1.5,1.5,1.5,1.5,1.5,1.5] ];
	dict['GACU'] = [ [2.1,1.7,1.1,1.7,2.1,2.1,2.1,2.1,1.2,1.7,0.6,1.7,2.1,1.8,2.1,1.9], [1.8,1.4,0.8,1.4,1.8,1.8,1.8,1.8,0.9,1.4,0.3,1.4,1.8,1.5,1.8,1.0], [0.7,0.3,-0.3,0.3,0.7,1.3,0.7,1.3,-0.2,0.3,0.5,0.3,0.7,1.0,0.7,-0.1], [1.8,1.4,0.8,1.4,1.8,1.8,1.8,1.8,0.9,1.4,0.3,1.4,1.8,1.5,1.8,1.0], [1.9,1.4,0.8,1.4,1.9,1.9,1.9,1.9,0.9,1.4,0.3,1.4,1.9,1.6,1.9,1.0], [1.9,1.4,1.4,1.4,1.9,1.9,1.9,1.9,1.5,1.4,0.3,1.4,1.9,1.6,1.9,1.0], [1.9,1.4,0.8,1.4,1.9,1.9,1.9,1.9,0.9,1.4,0.3,1.4,1.9,1.6,1.9,1.0], [1.9,1.5,1.5,1.5,1.9,1.9,1.9,1.9,1.6,1.5,0.4,1.5,1.9,1.6,1.9,1.1], [0.1,-0.3,-0.9,-0.3,0.1,0.7,0.1,0.7,-0.8,-0.3,-0.1,-0.3,0.1,0.4,0.1,-0.7], [1.8,1.4,0.8,1.4,1.8,1.8,1.8,1.8,0.9,1.4,0.3,1.4,1.8,1.5,1.8,1.0], [0.5,0.0,0.7,0.0,0.5,0.5,0.5,0.5,0.8,0.0,1.5,0.0,0.5,0.2,0.5,0.9], [1.8,1.4,0.8,1.4,1.8,1.8,1.8,1.8,0.9,1.4,0.3,1.4,1.8,1.5,1.8,1.0], [1.9,1.4,0.8,1.4,1.9,1.9,1.9,1.9,0.9,1.4,0.3,1.4,1.9,1.6,1.9,1.0], [1.9,1.4,1.4,1.4,1.9,1.9,1.9,1.9,1.5,1.4,0.3,1.4,1.9,1.6,1.9,1.0], [1.9,1.4,0.8,1.4,1.9,1.9,1.9,1.9,0.9,1.4,0.3,1.4,1.9,1.6,1.9,1.0], [1.7,0.7,0.1,0.7,1.1,1.1,1.1,1.1,0.2,0.7,0.9,0.7,1.1,0.8,1.1,0.3] ];
	dict['GCCG'] = [ [1.5,1.2,-0.5,1.2,1.2,1.2,1.2,1.2,0.1,1.2,-0.2,1.2,1.2,1.3,1.2,1.1], [1.2,0.9,-0.8,0.9,0.9,0.9,0.9,0.9,-0.2,0.9,-0.5,0.9,0.9,1.0,0.9,0.2], [0.1,-0.1,-1.9,-0.1,-0.2,0.5,-0.2,0.5,-1.3,-0.1,-0.2,-0.1,-0.2,0.5,-0.2,-0.9], [1.2,0.9,-0.8,0.9,0.9,0.9,0.9,0.9,-0.2,0.9,-0.5,0.9,0.9,1.0,0.9,0.2], [1.2,1.0,-0.8,1.0,0.9,1.0,0.9,1.0,-0.1,1.0,-0.4,1.0,0.9,1.0,0.9,0.2], [1.2,1.0,-0.2,1.0,0.9,1.0,0.9,1.0,0.5,1.0,-0.4,1.0,0.9,1.0,0.9,0.2], [1.2,1.0,-0.8,1.0,0.9,1.0,0.9,1.0,-0.1,1.0,-0.4,1.0,0.9,1.0,0.9,0.2], [1.3,1.0,-0.1,1.0,1.0,1.0,1.0,1.0,0.5,1.0,-0.4,1.0,1.0,1.1,1.0,0.3], [-0.5,-0.8,-2.6,-0.8,-0.8,-0.2,-0.8,-0.2,-1.9,-0.8,-0.9,-0.8,-0.8,-0.1,-0.8,-1.5], [1.2,0.9,-0.8,0.9,0.9,0.9,0.9,0.9,-0.2,0.9,-0.5,0.9,0.9,1.0,0.9,0.2], [-0.2,-0.4,-0.9,-0.4,-0.5,-0.4,-0.5,-0.4,-0.2,-0.4,0.8,-0.4,-0.5,-0.4,-0.5,0.1], [1.2,0.9,-0.8,0.9,0.9,0.9,0.9,0.9,-0.2,0.9,-0.5,0.9,0.9,1.0,0.9,0.2], [1.2,1.0,-0.8,1.0,0.9,1.0,0.9,1.0,-0.1,1.0,-0.4,1.0,0.9,1.0,0.9,0.2], [1.2,1.0,-0.2,1.0,0.9,1.0,0.9,1.0,0.5,1.0,-0.4,1.0,0.9,1.0,0.9,0.2], [1.2,1.0,-0.8,1.0,0.9,1.0,0.9,1.0,-0.1,1.0,-0.4,1.0,0.9,1.0,0.9,0.2], [1.1,0.2,-1.5,0.2,0.2,0.2,0.2,0.2,-0.9,0.2,0.1,0.2,0.2,0.3,0.2,-0.5] ];
	dict['GGCC'] = [ [1.3,1.3,-0.2,1.3,0.6,2.2,1.7,1.4,0.0,1.3,-0.1,1.3,1.7,1.4,1.7,1.4], [1.0,1.1,0.7,1.0,0.5,1.9,1.4,1.1,-1.0,1.0,-0.5,1.0,1.4,1.1,1.4,0.3], [0.4,0.7,-0.5,-0.1,0.3,0.7,0.3,0.5,-0.7,-0.1,-0.3,-0.1,0.3,0.6,0.3,1.4], [1.0,1.0,0.1,1.0,1.4,1.3,1.4,1.1,0.1,1.0,-0.5,1.0,1.4,1.1,1.4,0.2], [1.1,1.0,-0.4,1.0,1.5,1.3,1.5,1.2,-0.7,1.0,-0.4,1.0,1.5,1.2,1.5,0.3], [1.1,1.0,0.7,1.0,1.5,1.3,1.5,1.2,-0.6,1.0,-0.4,1.0,1.5,1.2,1.5,0.3], [1.1,1.0,0.1,1.0,1.5,1.3,1.5,1.2,0.1,1.0,-0.4,1.0,1.5,1.2,1.5,0.3], [1.1,1.1,0.8,1.1,1.5,1.4,1.5,1.2,0.8,1.1,-0.5,1.1,1.5,1.2,1.5,0.3], [-0.3,-0.7,-1.7,-0.7,0.1,0.7,-0.3,0.0,-1.6,-0.7,-0.9,-0.7,-0.3,0.0,-0.3,0.5], [1.0,1.0,0.1,1.0,1.4,1.3,1.4,1.1,0.1,1.0,-0.5,1.0,1.4,1.1,1.4,0.2], [-0.3,-0.4,-0.3,-0.4,-0.3,-0.1,0.1,-0.6,0.0,-0.4,0.8,-0.4,0.1,0.2,0.1,0.7], [1.0,1.0,0.1,1.0,1.4,1.3,1.4,1.1,0.1,1.0,-0.5,1.0,1.4,1.1,1.4,0.2], [1.1,1.0,0.1,1.0,1.5,1.3,1.5,1.2,0.1,1.0,-0.4,1.0,1.5,1.2,1.5,0.3], [1.1,1.0,0.7,1.0,1.5,1.3,1.5,1.2,0.7,1.0,0.2,1.0,1.5,1.7,1.5,0.3], [1.1,1.0,0.1,1.0,1.5,1.3,1.5,1.2,0.1,1.0,-0.4,1.0,1.5,1.2,1.5,0.3], [1.5,-0.2,0.9,0.3,0.0,-0.1,0.7,0.4,0.9,0.3,1.4,0.3,0.7,0.2,0.7,-0.6] ];
	dict['GGCU'] = [ [1.9,2.1,0.8,2.1,2.1,2.1,2.1,2.1,2.4,2.1,0.8,2.1,2.1,2.1,2.1,2.7], [1.5,1.8,0.5,1.8,1.8,1.8,1.8,1.8,2.1,1.8,0.5,1.8,1.8,1.8,1.8,1.8], [0.4,0.7,-0.6,0.7,0.7,1.3,0.7,1.3,1.0,0.7,0.7,0.7,0.7,1.3,0.7,0.7], [1.5,1.8,0.5,1.8,1.8,1.8,1.8,1.8,2.1,1.8,0.5,1.8,1.8,1.8,1.8,1.8], [1.5,1.9,0.5,1.9,1.9,1.9,1.9,1.9,2.2,1.9,0.6,1.9,1.9,1.9,1.9,1.9], [1.5,1.9,1.1,1.9,1.9,1.9,1.9,1.9,2.8,1.9,0.6,1.9,1.9,1.9,1.9,1.9], [1.5,1.9,0.5,1.9,1.9,1.9,1.9,1.9,2.2,1.9,0.6,1.9,1.9,1.9,1.9,1.9], [1.6,1.9,1.2,1.9,1.9,1.9,1.9,1.9,2.8,1.9,0.6,1.9,1.9,1.9,1.9,1.9], [-0.2,0.1,-1.2,0.1,0.1,0.7,0.1,0.7,0.4,0.1,0.1,0.1,0.1,0.7,0.1,0.1], [1.5,1.8,0.5,1.8,1.8,1.8,1.8,1.8,2.1,1.8,0.5,1.8,1.8,1.8,1.8,1.8], [0.1,0.5,0.4,0.5,0.5,0.5,0.5,0.5,2.1,0.5,1.8,0.5,0.5,0.5,0.5,1.8], [1.5,1.8,0.5,1.8,1.8,1.8,1.8,1.8,2.1,1.8,0.5,1.8,1.8,1.8,1.8,1.8], [1.5,1.9,0.5,1.9,1.9,1.9,1.9,1.9,2.2,1.9,0.6,1.9,1.9,1.9,1.9,1.9], [1.5,1.9,1.1,1.9,1.9,1.9,1.9,1.9,2.8,1.9,0.6,1.9,1.9,1.9,1.9,1.9], [1.5,1.9,0.5,1.9,1.9,1.9,1.9,1.9,2.2,1.9,0.6,1.9,1.9,1.9,1.9,1.9], [1.4,1.1,-0.2,1.1,1.1,1.1,1.1,1.1,1.4,1.1,1.1,1.1,1.1,1.1,1.1,1.1] ];
	dict['GUCA'] = [ [2.1,1.9,0.9,1.9,2.0,1.9,2.0,1.9,1.6,1.9,0.4,1.9,2.0,1.9,2.0,1.6], [1.8,1.6,0.6,1.6,1.7,1.6,1.7,1.6,1.3,1.6,0.1,1.6,1.7,1.6,1.7,0.7], [0.7,0.5,-0.5,0.5,0.6,1.1,0.6,1.1,0.2,0.5,0.3,0.5,0.6,1.1,0.6,-0.3], [1.8,1.6,0.6,1.6,1.7,1.6,1.7,1.6,1.3,1.6,0.1,1.6,1.7,1.6,1.7,0.7], [1.9,1.6,0.6,1.6,1.7,1.7,1.7,1.7,1.3,1.6,0.1,1.6,1.7,1.7,1.7,0.8], [1.9,1.6,1.2,1.6,1.7,1.7,1.7,1.7,1.9,1.6,0.1,1.6,1.7,1.7,1.7,0.8], [1.9,1.6,0.6,1.6,1.7,1.7,1.7,1.7,1.3,1.6,0.1,1.6,1.7,1.7,1.7,0.8], [1.9,1.7,1.3,1.7,1.8,1.7,1.8,1.7,2.0,1.7,0.2,1.7,1.8,1.7,1.8,0.8], [0.1,-0.1,-1.1,-0.1,0.0,0.5,0.0,0.5,-0.4,-0.1,-0.3,-0.1,0.0,0.5,0.0,-1.0], [1.8,1.6,0.6,1.6,1.7,1.6,1.7,1.6,1.3,1.6,0.1,1.6,1.7,1.6,1.7,0.7], [0.5,0.2,0.5,0.2,0.3,0.3,0.3,0.3,1.2,0.2,1.3,0.2,0.3,0.3,0.3,0.7], [1.8,1.6,0.6,1.6,1.7,1.6,1.7,1.6,1.3,1.6,0.1,1.6,1.7,1.6,1.7,0.7], [1.9,1.6,0.6,1.6,1.7,1.7,1.7,1.7,1.3,1.6,0.1,1.6,1.7,1.7,1.7,0.8], [1.9,1.6,1.2,1.6,1.7,1.7,1.7,1.7,1.9,1.6,0.1,1.6,1.7,1.7,1.7,0.8], [1.9,1.6,0.6,1.6,1.7,1.7,1.7,1.7,1.3,1.6,0.1,1.6,1.7,1.7,1.7,0.8], [1.7,0.9,-0.1,0.9,1.0,0.9,1.0,0.9,0.6,0.9,0.7,0.9,1.0,0.9,1.0,0.0] ];
	dict['GUCG'] = [ [2.8,2.4,1.6,2.4,2.4,2.4,2.4,2.4,2.0,2.4,1.1,2.4,2.4,2.4,2.4,3.0], [2.5,2.1,1.3,2.1,2.1,2.1,2.1,2.1,1.7,2.1,0.8,2.1,2.1,2.1,2.1,2.1], [1.4,1.0,0.2,1.0,1.0,1.6,1.0,1.6,0.6,1.0,1.0,1.0,1.0,1.6,1.0,1.0], [2.5,2.1,1.3,2.1,2.1,2.1,2.1,2.1,1.7,2.1,0.8,2.1,2.1,2.1,2.1,2.1], [2.5,2.2,1.4,2.2,2.2,2.2,2.2,2.2,1.8,2.2,0.9,2.2,2.2,2.2,2.2,2.2], [2.5,2.2,2.0,2.2,2.2,2.2,2.2,2.2,2.4,2.2,0.9,2.2,2.2,2.2,2.2,2.2], [2.5,2.2,1.4,2.2,2.2,2.2,2.2,2.2,1.8,2.2,0.9,2.2,2.2,2.2,2.2,2.2], [2.6,2.2,2.0,2.2,2.2,2.2,2.2,2.2,2.4,2.2,0.9,2.2,2.2,2.2,2.2,2.2], [0.7,0.4,-0.4,0.4,0.4,1.0,0.4,1.0,0.0,0.4,0.4,0.4,0.4,1.0,0.4,0.4], [2.5,2.1,1.3,2.1,2.1,2.1,2.1,2.1,1.7,2.1,0.8,2.1,2.1,2.1,2.1,2.1], [1.1,0.8,1.3,0.8,0.8,0.8,0.8,0.8,1.7,0.8,2.1,0.8,0.8,0.8,0.8,2.1], [2.5,2.1,1.3,2.1,2.1,2.1,2.1,2.1,1.7,2.1,0.8,2.1,2.1,2.1,2.1,2.1], [2.5,2.2,1.4,2.2,2.2,2.2,2.2,2.2,1.8,2.2,0.9,2.2,2.2,2.2,2.2,2.2], [2.5,2.2,2.0,2.2,2.2,2.2,2.2,2.2,2.4,2.2,0.9,2.2,2.2,2.2,2.2,2.2], [2.5,2.2,1.4,2.2,2.2,2.2,2.2,2.2,1.8,2.2,0.9,2.2,2.2,2.2,2.2,2.2], [2.4,1.4,0.6,1.4,1.4,1.4,1.4,1.4,1.0,1.4,1.4,1.4,1.4,1.4,1.4,1.4] ];
	dict['GAUU'] = [ [3.4,3.0,2.4,3.0,3.4,3.4,3.4,3.4,2.5,3.0,1.9,3.0,3.4,3.1,3.4,3.2], [3.1,2.6,2.0,2.6,3.1,3.1,3.1,3.1,2.1,2.6,1.5,2.6,3.1,2.8,3.1,2.2], [2.7,2.2,1.6,2.2,2.7,3.3,2.7,3.3,1.7,2.2,2.4,2.2,2.7,3.0,2.7,1.8], [3.1,2.6,2.0,2.6,3.1,3.1,3.1,3.1,2.1,2.6,1.5,2.6,3.1,2.8,3.1,2.2], [3.1,2.6,2.0,2.6,3.1,3.1,3.1,3.1,2.1,2.6,1.5,2.6,3.1,2.8,3.1,2.2], [3.1,2.6,2.6,2.6,3.1,3.1,3.1,3.1,2.7,2.6,1.5,2.6,3.1,2.8,3.1,2.2], [3.1,2.6,2.0,2.6,3.1,3.1,3.1,3.1,2.1,2.6,1.5,2.6,3.1,2.8,3.1,2.2], [3.1,2.6,2.6,2.6,3.1,3.1,3.1,3.1,2.7,2.6,1.5,2.6,3.1,2.8,3.1,2.2], [2.3,1.8,1.2,1.8,2.3,2.9,2.3,2.9,1.3,1.8,2.0,1.8,2.3,2.6,2.3,1.4], [3.1,2.6,2.0,2.6,3.1,3.1,3.1,3.1,2.1,2.6,1.5,2.6,3.1,2.8,3.1,2.2], [1.8,1.3,2.0,1.3,1.8,1.8,1.8,1.8,2.1,1.3,2.8,1.3,1.8,1.5,1.8,2.2], [3.1,2.6,2.0,2.6,3.1,3.1,3.1,3.1,2.1,2.6,1.5,2.6,3.1,2.8,3.1,2.2], [3.1,2.6,2.0,2.6,3.1,3.1,3.1,3.1,2.1,2.6,1.5,2.6,3.1,2.8,3.1,2.2], [3.1,2.6,2.6,2.6,3.1,3.1,3.1,3.1,2.7,2.6,1.5,2.6,3.1,2.8,3.1,2.2], [3.1,2.6,2.0,2.6,3.1,3.1,3.1,3.1,2.1,2.6,1.5,2.6,3.1,2.8,3.1,2.2], [3.7,2.6,2.0,2.6,3.1,3.1,3.1,3.1,2.1,2.6,2.8,2.6,3.1,2.8,3.1,2.2] ];
	dict['GCUG'] = [ [2.8,2.5,0.7,2.5,2.5,2.5,2.5,2.5,1.4,2.5,1.1,2.5,2.5,2.6,2.5,2.4], [2.4,2.2,0.4,2.2,2.1,2.2,2.1,2.2,1.0,2.2,0.8,2.2,2.1,2.2,2.1,1.4], [2.0,1.8,0.0,1.8,1.7,2.4,1.7,2.4,0.6,1.8,1.7,1.8,1.7,2.4,1.7,1.0], [2.4,2.2,0.4,2.2,2.1,2.2,2.1,2.2,1.0,2.2,0.8,2.2,2.1,2.2,2.1,1.4], [2.4,2.2,0.4,2.2,2.1,2.2,2.1,2.2,1.0,2.2,0.8,2.2,2.1,2.2,2.1,1.4], [2.4,2.2,1.0,2.2,2.1,2.2,2.1,2.2,1.6,2.2,0.8,2.2,2.1,2.2,2.1,1.4], [2.4,2.2,0.4,2.2,2.1,2.2,2.1,2.2,1.0,2.2,0.8,2.2,2.1,2.2,2.1,1.4], [2.4,2.2,1.0,2.2,2.1,2.2,2.1,2.2,1.6,2.2,0.8,2.2,2.1,2.2,2.1,1.4], [1.6,1.4,-0.4,1.4,1.3,2.0,1.3,2.0,0.2,1.4,1.3,1.4,1.3,2.0,1.3,0.6], [2.4,2.2,0.4,2.2,2.1,2.2,2.1,2.2,1.0,2.2,0.8,2.2,2.1,2.2,2.1,1.4], [1.1,0.9,0.4,0.9,0.8,0.9,0.8,0.9,1.0,0.9,2.1,0.9,0.8,0.9,0.8,1.4], [2.4,2.2,0.4,2.2,2.1,2.2,2.1,2.2,1.0,2.2,0.8,2.2,2.1,2.2,2.1,1.4], [2.4,2.2,0.4,2.2,2.1,2.2,2.1,2.2,1.0,2.2,0.8,2.2,2.1,2.2,2.1,1.4], [2.4,2.2,1.0,2.2,2.1,2.2,2.1,2.2,1.6,2.2,0.8,2.2,2.1,2.2,2.1,1.4], [2.4,2.2,0.4,2.2,2.1,2.2,2.1,2.2,1.0,2.2,0.8,2.2,2.1,2.2,2.1,1.4], [3.0,2.2,0.4,2.2,2.1,2.2,2.1,2.2,1.0,2.2,2.1,2.2,2.1,2.2,2.1,1.4] ];
	dict['GGUC'] = [ [2.7,2.6,1.7,2.6,3.0,2.9,3.0,2.7,1.7,2.6,1.1,2.6,3.0,2.7,3.0,2.4], [2.3,2.2,1.3,2.2,2.7,2.5,2.7,2.4,1.3,2.2,0.8,2.2,2.7,2.4,2.7,1.5], [1.9,1.8,0.9,1.8,2.3,2.7,2.3,2.6,0.9,1.8,1.7,1.8,2.3,2.6,2.3,1.1], [2.3,2.2,1.3,2.2,2.7,2.5,2.7,2.4,1.3,2.2,0.8,2.2,2.7,2.4,2.7,1.5], [2.3,2.2,1.3,2.2,2.7,2.5,2.7,2.4,1.3,2.2,0.8,2.2,2.7,2.4,2.7,1.5], [2.3,2.2,1.9,2.2,2.7,2.5,2.7,2.4,1.9,2.2,0.8,2.2,2.7,2.4,2.7,1.5], [2.3,2.2,1.3,2.2,2.7,2.5,2.7,2.4,1.3,2.2,0.8,2.2,2.7,2.4,2.7,1.5], [2.3,2.2,1.9,2.2,2.7,2.5,2.7,2.4,1.9,2.2,0.8,2.2,2.7,2.4,2.7,1.5], [1.5,1.4,0.5,1.4,1.9,2.3,1.9,2.2,0.5,1.4,1.3,1.4,1.9,2.2,1.9,0.7], [2.3,2.2,1.3,2.2,2.7,2.5,2.7,2.4,1.3,2.2,0.8,2.2,2.7,2.4,2.7,1.5], [1.0,0.9,1.3,0.9,1.4,1.2,1.4,1.1,1.3,0.9,2.1,0.9,1.4,1.1,1.4,1.5], [2.3,2.2,1.3,2.2,2.7,2.5,2.7,2.4,1.3,2.2,0.8,2.2,2.7,2.4,2.7,1.5], [2.3,2.2,1.3,2.2,2.7,2.5,2.7,2.4,1.3,2.2,0.8,2.2,2.7,2.4,2.7,1.5], [2.3,2.2,1.9,2.2,2.7,2.5,2.7,2.4,1.9,2.2,0.8,2.2,2.7,2.4,2.7,1.5], [2.3,2.2,1.3,2.2,2.7,2.5,2.7,2.4,1.3,2.2,0.8,2.2,2.7,2.4,2.7,1.5], [2.9,2.2,1.3,2.2,2.7,2.5,2.7,2.4,1.3,2.2,2.1,2.2,2.7,2.4,2.7,1.5] ];
	dict['GGUU'] = [ [3.6,3.4,2.2,3.4,3.4,3.4,3.4,3.4,3.7,3.4,2.1,3.4,3.4,3.4,3.4,4.0], [2.7,3.1,1.7,3.1,3.1,3.1,3.1,3.1,3.4,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [3.6,2.7,1.3,2.7,2.7,3.3,2.7,3.3,3.0,2.7,2.7,2.7,2.7,3.3,2.7,2.7], [2.7,3.1,1.7,3.1,3.1,3.1,3.1,3.1,3.4,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [2.7,3.1,1.7,3.1,3.1,3.1,3.1,3.1,3.4,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [2.7,3.1,2.3,3.1,3.1,3.1,3.1,3.1,4.0,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [2.7,3.1,1.7,3.1,3.1,3.1,3.1,3.1,3.4,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [2.7,3.1,2.3,3.1,3.1,3.1,3.1,3.1,4.0,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [1.9,2.3,0.2,2.3,2.3,2.9,2.3,2.9,2.6,2.3,2.3,2.3,2.3,2.9,2.3,2.3], [2.7,3.1,1.7,3.1,3.1,3.1,3.1,3.1,3.4,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [1.4,1.8,1.7,1.8,1.8,1.8,1.8,1.8,3.4,1.8,3.1,1.8,1.8,1.8,1.8,3.1], [2.7,3.1,1.7,3.1,3.1,3.1,3.1,3.1,3.4,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [2.7,3.1,1.7,3.1,3.1,3.1,3.1,3.1,3.4,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [2.7,3.1,2.3,3.1,3.1,3.1,3.1,3.1,4.0,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [2.7,3.1,1.7,3.1,3.1,3.1,3.1,3.1,3.4,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [3.3,3.1,1.7,3.1,3.1,3.1,3.1,3.1,3.4,3.1,3.1,3.1,3.1,3.1,3.1,3.1] ];
	dict['GUUA'] = [ [3.4,3.2,2.2,3.2,3.3,3.2,3.3,3.2,2.9,3.2,1.7,3.2,3.3,3.2,3.3,2.9], [3.1,2.8,1.8,2.8,2.9,2.9,2.9,2.9,2.5,2.8,1.3,2.8,2.9,2.9,2.9,2.0], [2.7,2.4,1.4,2.4,2.5,3.1,2.5,3.1,2.1,2.4,2.2,2.4,2.5,3.1,2.5,1.6], [3.1,2.8,1.8,2.8,2.9,2.9,2.9,2.9,2.5,2.8,1.3,2.8,2.9,2.9,2.9,2.0], [3.1,2.8,1.8,2.8,2.9,2.9,2.9,2.9,2.5,2.8,1.3,2.8,2.9,2.9,2.9,2.0], [3.1,2.8,2.4,2.8,2.9,2.9,2.9,2.9,3.1,2.8,1.3,2.8,2.9,2.9,2.9,2.0], [3.1,2.8,1.8,2.8,2.9,2.9,2.9,2.9,2.5,2.8,1.3,2.8,2.9,2.9,2.9,2.0], [3.1,2.8,2.4,2.8,2.9,2.9,2.9,2.9,3.1,2.8,1.3,2.8,2.9,2.9,2.9,2.0], [2.3,2.0,1.0,2.0,2.1,2.7,2.1,2.7,1.7,2.0,1.8,2.0,2.1,2.7,2.1,1.2], [3.1,2.8,1.8,2.8,2.9,2.9,2.9,2.9,2.5,2.8,1.3,2.8,2.9,2.9,2.9,2.0], [1.8,1.5,1.8,1.5,1.6,1.6,1.6,1.6,2.5,1.5,2.6,1.5,1.6,1.6,1.6,2.0], [3.1,2.8,1.8,2.8,2.9,2.9,2.9,2.9,2.5,2.8,1.3,2.8,2.9,2.9,2.9,2.0], [3.1,2.8,1.8,2.8,2.9,2.9,2.9,2.9,2.5,2.8,1.3,2.8,2.9,2.9,2.9,2.0], [3.1,2.8,2.4,2.8,2.9,2.9,2.9,2.9,3.1,2.8,1.3,2.8,2.9,2.9,2.9,2.0], [3.1,2.8,1.8,2.8,2.9,2.9,2.9,2.9,2.5,2.8,1.3,2.8,2.9,2.9,2.9,2.0], [3.7,2.8,1.8,2.8,2.9,2.9,2.9,2.9,2.5,2.8,2.6,2.8,2.9,2.9,2.9,2.0] ];
	dict['GUUG'] = [ [4.1,3.7,2.9,3.7,3.7,3.7,3.7,3.7,3.3,3.7,2.4,3.7,3.7,3.7,3.7,4.3], [3.7,3.4,2.6,3.4,3.4,3.4,3.4,3.4,3.0,3.4,2.1,3.4,3.4,3.4,3.4,3.4], [3.3,3.0,2.2,3.0,3.0,3.6,3.0,3.6,2.6,3.0,3.0,3.0,3.0,3.6,3.0,3.0], [3.7,3.4,2.6,3.4,3.4,3.4,3.4,3.4,3.0,3.4,2.1,3.4,3.4,3.4,3.4,3.4], [3.7,3.4,2.6,3.4,3.4,3.4,3.4,3.4,3.0,3.4,2.1,3.4,3.4,3.4,3.4,3.4], [3.7,3.4,3.2,3.4,3.4,3.4,3.4,3.4,3.6,3.4,2.1,3.4,3.4,3.4,3.4,3.4], [3.7,3.4,2.6,3.4,3.4,3.4,3.4,3.4,3.0,3.4,2.1,3.4,3.4,3.4,3.4,3.4], [3.7,3.4,3.2,3.4,3.4,3.4,3.4,3.4,3.6,3.4,2.1,3.4,3.4,3.4,3.4,3.4], [2.9,2.6,1.8,2.6,2.6,3.2,2.6,3.2,2.2,2.6,2.6,2.6,2.6,3.2,2.6,2.6], [3.7,3.4,2.6,3.4,3.4,3.4,3.4,3.4,3.0,3.4,2.1,3.4,3.4,3.4,3.4,3.4], [2.4,2.1,2.6,2.1,2.1,2.1,2.1,2.1,3.0,2.1,3.4,2.1,2.1,2.1,2.1,3.4], [3.7,3.4,2.6,3.4,3.4,3.4,3.4,3.4,3.0,3.4,2.1,3.4,3.4,3.4,3.4,3.4], [3.7,3.4,2.6,3.4,3.4,3.4,3.4,3.4,3.0,3.4,2.1,3.4,3.4,3.4,3.4,3.4], [3.7,3.4,3.2,3.4,3.4,3.4,3.4,3.4,3.6,3.4,2.1,3.4,3.4,3.4,3.4,3.4], [3.7,3.4,2.6,3.4,3.4,3.4,3.4,3.4,3.0,3.4,2.1,3.4,3.4,3.4,3.4,3.4], [4.3,3.4,2.6,3.4,3.4,3.4,3.4,3.4,3.0,3.4,3.4,3.4,3.4,3.4,3.4,3.4] ];
	dict['UAAU'] = [ [2.8,2.3,1.7,2.3,2.8,2.8,2.8,2.8,1.8,2.3,1.2,2.3,2.8,2.5,2.8,2.5], [2.8,2.3,1.7,2.3,2.8,2.8,2.8,2.8,1.8,2.3,1.2,2.3,2.8,2.5,2.8,1.9], [1.8,1.4,0.8,1.4,1.8,2.4,1.8,2.4,0.9,1.4,1.6,1.4,1.8,2.1,1.8,1.0], [2.8,2.3,1.7,2.3,2.8,2.8,2.8,2.8,1.8,2.3,1.2,2.3,2.8,2.5,2.8,1.9], [2.3,1.9,1.3,1.9,2.3,2.3,2.3,2.3,1.4,1.9,0.8,1.9,2.3,2.0,2.3,1.5], [2.8,2.3,2.3,2.3,2.8,2.8,2.8,2.8,2.4,2.3,1.2,2.3,2.8,2.5,2.8,1.9], [2.3,1.9,1.3,1.9,2.3,2.3,2.3,2.3,1.4,1.9,0.8,1.9,2.3,2.0,2.3,1.5], [2.5,2.0,2.0,2.0,2.5,2.5,2.5,2.5,2.1,2.0,0.9,2.0,2.5,2.2,2.5,1.6], [1.7,1.3,0.7,1.3,1.7,2.3,1.7,2.3,0.8,1.3,1.5,1.3,1.7,2.0,1.7,0.9], [2.8,2.3,1.7,2.3,2.8,2.8,2.8,2.8,1.8,2.3,1.2,2.3,2.8,2.5,2.8,1.9], [1.2,0.8,1.5,0.8,1.2,1.2,1.2,1.2,1.6,0.8,2.3,0.8,1.2,0.9,1.2,1.7], [2.8,2.3,1.7,2.3,2.8,2.8,2.8,2.8,1.8,2.3,1.2,2.3,2.8,2.5,2.8,1.9], [2.3,1.9,1.3,1.9,2.3,2.3,2.3,2.3,1.4,1.9,0.8,1.9,2.3,2.0,2.3,1.5], [2.8,2.3,2.3,2.3,2.8,2.8,2.8,2.8,2.4,2.3,1.2,2.3,2.8,2.5,2.8,1.9], [2.3,1.9,1.3,1.9,2.3,2.3,2.3,2.3,1.4,1.9,0.8,1.9,2.3,2.0,2.3,1.5], [2.5,1.5,0.9,1.5,1.9,1.9,1.9,1.9,1.0,1.5,1.7,1.5,1.9,1.6,1.9,1.1] ];
	dict['UCAG'] = [ [2.1,1.9,0.1,1.9,1.8,1.9,1.8,1.9,0.7,1.9,0.5,1.9,1.8,1.9,1.8,1.7], [2.1,1.9,0.1,1.9,1.8,1.9,1.8,1.9,0.7,1.9,0.5,1.9,1.8,1.9,1.8,1.1], [1.2,0.9,-0.8,0.9,0.9,1.5,0.9,1.5,-0.2,0.9,0.8,0.9,0.9,1.6,0.9,0.2], [2.1,1.9,0.1,1.9,1.8,1.9,1.8,1.9,0.7,1.9,0.5,1.9,1.8,1.9,1.8,1.1], [1.7,1.4,-0.3,1.4,1.4,1.4,1.4,1.4,0.3,1.4,0.0,1.4,1.4,1.5,1.4,0.7], [2.1,1.9,0.7,1.9,1.8,1.9,1.8,1.9,1.3,1.9,0.5,1.9,1.8,1.9,1.8,1.1], [1.7,1.4,-0.3,1.4,1.4,1.4,1.4,1.4,0.3,1.4,0.0,1.4,1.4,1.5,1.4,0.7], [1.8,1.6,0.4,1.6,1.5,1.6,1.5,1.6,1.0,1.6,0.2,1.6,1.5,1.6,1.5,0.8], [1.1,0.8,-0.9,0.8,0.8,1.4,0.8,1.4,-0.3,0.8,0.7,0.8,0.8,1.5,0.8,0.1], [2.1,1.9,0.1,1.9,1.8,1.9,1.8,1.9,0.7,1.9,0.5,1.9,1.8,1.9,1.8,1.1], [0.6,0.3,-0.1,0.3,0.3,0.3,0.3,0.3,0.5,0.3,1.5,0.3,0.3,0.4,0.3,0.9], [2.1,1.9,0.1,1.9,1.8,1.9,1.8,1.9,0.7,1.9,0.5,1.9,1.8,1.9,1.8,1.1], [1.7,1.4,-0.3,1.4,1.4,1.4,1.4,1.4,0.3,1.4,0.0,1.4,1.4,1.5,1.4,0.7], [2.1,1.9,0.7,1.9,1.8,1.9,1.8,1.9,1.3,1.9,0.5,1.9,1.8,1.9,1.8,1.1], [1.7,1.4,-0.3,1.4,1.4,1.4,1.4,1.4,0.3,1.4,0.0,1.4,1.4,1.5,1.4,0.7], [1.9,1.0,-0.7,1.0,1.0,1.0,1.0,1.0,-0.1,1.0,0.9,1.0,1.0,1.1,1.0,0.3] ];
	dict['UGAC'] = [ [2.0,1.9,1.0,1.9,2.4,2.2,2.4,2.1,1.0,1.9,0.5,1.9,2.4,2.1,2.4,1.8], [2.0,1.9,1.0,1.9,2.4,2.2,2.4,2.1,1.0,1.9,0.5,1.9,2.4,2.1,2.4,1.2], [1.0,1.0,0.1,1.0,1.4,1.9,1.4,1.7,0.1,1.0,0.8,1.0,1.4,1.7,1.4,0.2], [2.0,1.9,1.0,1.9,2.4,2.2,2.4,2.1,1.0,1.9,0.5,1.9,2.4,2.1,2.4,1.2], [1.5,1.5,0.6,1.5,1.9,1.8,1.9,1.6,0.6,1.5,0.0,1.5,1.9,1.6,1.9,0.7], [2.0,1.9,1.6,1.9,2.4,2.2,2.4,2.1,1.6,1.9,0.5,1.9,2.4,2.1,2.4,1.2], [1.5,1.5,0.6,1.5,1.9,1.8,1.9,1.6,0.6,1.5,0.0,1.5,1.9,1.6,1.9,0.7], [1.7,1.6,1.3,1.6,2.1,1.9,2.1,1.8,1.3,1.6,0.2,1.6,2.1,1.8,2.1,0.9], [0.9,0.9,0.0,0.9,1.3,1.8,1.3,1.6,0.0,0.9,0.7,0.9,1.3,1.6,1.3,0.1], [2.0,1.9,1.0,1.9,2.4,2.2,2.4,2.1,1.0,1.9,0.5,1.9,2.4,2.1,2.4,1.2], [0.4,0.4,0.8,0.4,0.8,0.7,0.8,0.5,0.8,0.4,1.5,0.4,0.8,0.5,0.8,0.9], [2.0,1.9,1.0,1.9,2.4,2.2,2.4,2.1,1.0,1.9,0.5,1.9,2.4,2.1,2.4,1.2], [1.5,1.5,0.6,1.5,1.9,1.8,1.9,1.6,0.6,1.5,0.0,1.5,1.9,1.6,1.9,0.7], [2.0,1.9,1.6,1.9,2.4,2.2,2.4,2.1,1.6,1.9,0.5,1.9,2.4,2.1,2.4,1.2], [1.5,1.5,0.6,1.5,1.9,1.8,1.9,1.6,0.6,1.5,0.0,1.5,1.9,1.6,1.9,0.7], [1.7,1.1,0.2,1.1,1.5,1.4,1.5,1.2,0.2,1.1,0.9,1.1,1.5,1.2,1.5,0.3] ];
	dict['UGAU'] = [ [2.4,2.8,1.4,2.8,2.8,2.8,2.8,2.8,3.1,2.8,1.5,2.8,2.8,2.8,2.8,3.4], [2.4,2.8,1.4,2.8,2.8,2.8,2.8,2.8,3.1,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [1.5,1.8,0.5,1.8,1.8,2.4,1.8,2.4,2.1,1.8,1.8,1.8,1.8,2.4,1.8,1.8], [2.4,2.8,1.4,2.8,2.8,2.8,2.8,2.8,3.1,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [2.0,2.3,1.0,2.3,2.3,2.3,2.3,2.3,2.6,2.3,1.0,2.3,2.3,2.3,2.3,2.3], [2.4,2.8,2.0,2.8,2.8,2.8,2.8,2.8,3.7,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [2.0,2.3,1.0,2.3,2.3,2.3,2.3,2.3,2.6,2.3,1.0,2.3,2.3,2.3,2.3,2.3], [2.1,2.5,1.7,2.5,2.5,2.5,2.5,2.5,3.4,2.5,1.2,2.5,2.5,2.5,2.5,2.5], [1.4,1.7,0.4,1.7,1.7,2.3,1.7,2.3,2.0,1.7,1.7,1.7,1.7,2.3,1.7,1.7], [2.4,2.8,1.4,2.8,2.8,2.8,2.8,2.8,3.1,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [0.9,1.2,1.2,1.2,1.2,1.2,1.2,1.2,2.8,1.2,2.5,1.2,1.2,1.2,1.2,2.5], [2.4,2.8,1.4,2.8,2.8,2.8,2.8,2.8,3.1,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [2.0,2.3,1.0,2.3,2.3,2.3,2.3,2.3,2.6,2.3,1.0,2.3,2.3,2.3,2.3,2.3], [2.4,2.8,2.0,2.8,2.8,2.8,2.8,2.8,3.7,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [2.0,2.3,1.0,2.3,2.3,2.3,2.3,2.3,2.6,2.3,1.0,2.3,2.3,2.3,2.3,2.3], [2.2,1.9,0.6,1.9,1.9,1.9,1.9,1.9,2.2,1.9,1.9,1.9,1.9,1.9,1.9,1.9] ];
	dict['UUAA'] = [ [2.8,2.5,1.5,2.5,2.6,2.6,2.6,2.6,2.2,2.5,1.0,2.5,2.6,2.6,2.6,2.3], [2.8,2.5,1.5,2.5,2.6,2.6,2.6,2.6,2.2,2.5,1.0,2.5,2.6,2.6,2.6,1.7], [1.8,1.6,0.6,1.6,1.7,2.2,1.7,2.2,1.3,1.6,1.4,1.6,1.7,2.2,1.7,0.7], [2.8,2.5,1.5,2.5,2.6,2.6,2.6,2.6,2.2,2.5,1.0,2.5,2.6,2.6,2.6,1.7], [2.3,2.1,1.1,2.1,2.2,2.1,2.2,2.1,1.8,2.1,0.6,2.1,2.2,2.1,2.2,1.2], [2.8,2.5,2.1,2.5,2.6,2.6,2.6,2.6,2.8,2.5,1.0,2.5,2.6,2.6,2.6,1.7], [2.3,2.1,1.1,2.1,2.2,2.1,2.2,2.1,1.8,2.1,0.6,2.1,2.2,2.1,2.2,1.2], [2.5,2.2,1.8,2.2,2.3,2.3,2.3,2.3,2.5,2.2,0.7,2.2,2.3,2.3,2.3,1.4], [1.7,1.5,0.5,1.5,1.6,2.1,1.6,2.1,1.2,1.5,1.3,1.5,1.6,2.1,1.6,0.6], [2.8,2.5,1.5,2.5,2.6,2.6,2.6,2.6,2.2,2.5,1.0,2.5,2.6,2.6,2.6,1.7], [1.2,1.0,1.3,1.0,1.1,1.0,1.1,1.0,2.0,1.0,2.1,1.0,1.1,1.0,1.1,1.4], [2.8,2.5,1.5,2.5,2.6,2.6,2.6,2.6,2.2,2.5,1.0,2.5,2.6,2.6,2.6,1.7], [2.3,2.1,1.1,2.1,2.2,2.1,2.2,2.1,1.8,2.1,0.6,2.1,2.2,2.1,2.2,1.2], [2.8,2.5,2.1,2.5,2.6,2.6,2.6,2.6,2.8,2.5,1.0,2.5,2.6,2.6,2.6,1.7], [2.3,2.1,1.1,2.1,2.2,2.1,2.2,2.1,1.8,2.1,0.6,2.1,2.2,2.1,2.2,1.2], [2.5,1.7,0.7,1.7,1.8,1.7,1.8,1.7,1.4,1.7,1.5,1.7,1.8,1.7,1.8,0.8] ];
	dict['UUAG'] = [ [3.4,3.1,2.3,3.1,3.1,3.1,3.1,3.1,2.7,3.1,1.8,3.1,3.1,3.1,3.1,3.7], [3.4,3.1,2.3,3.1,3.1,3.1,3.1,3.1,2.7,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [2.5,2.1,1.3,2.1,2.1,2.7,2.1,2.7,1.7,2.1,2.1,2.1,2.1,2.7,2.1,2.1], [3.4,3.1,2.3,3.1,3.1,3.1,3.1,3.1,2.7,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [3.0,2.6,1.8,2.6,2.6,2.6,2.6,2.6,2.2,2.6,1.3,2.6,2.6,2.6,2.6,2.6], [3.4,3.1,2.9,3.1,3.1,3.1,3.1,3.1,3.3,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [3.0,2.6,1.8,2.6,2.6,2.6,2.6,2.6,2.2,2.6,1.3,2.6,2.6,2.6,2.6,2.6], [3.1,2.8,2.6,2.8,2.8,2.8,2.8,2.8,3.0,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [2.4,2.0,1.2,2.0,2.0,2.6,2.0,2.6,1.6,2.0,2.0,2.0,2.0,2.6,2.0,2.0], [3.4,3.1,2.3,3.1,3.1,3.1,3.1,3.1,2.7,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [1.9,1.5,2.0,1.5,1.5,1.5,1.5,1.5,2.4,1.5,2.8,1.5,1.5,1.5,1.5,2.8], [3.4,3.1,2.3,3.1,3.1,3.1,3.1,3.1,2.7,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [3.0,2.6,1.8,2.6,2.6,2.6,2.6,2.6,2.2,2.6,1.3,2.6,2.6,2.6,2.6,2.6], [3.4,3.1,2.9,3.1,3.1,3.1,3.1,3.1,3.3,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [3.0,2.6,1.8,2.6,2.6,2.6,2.6,2.6,2.2,2.6,1.3,2.6,2.6,2.6,2.6,2.6], [3.2,2.2,1.4,2.2,2.2,2.2,2.2,2.2,1.8,2.2,2.2,2.2,2.2,2.2,2.2,2.2] ];
	dict['UAGU'] = [ [2.4,2.0,1.4,2.0,2.4,2.4,2.4,2.4,1.5,2.0,0.9,2.0,2.4,2.1,2.4,2.2], [2.8,2.3,1.7,2.3,2.8,2.8,2.8,2.8,1.8,2.3,1.2,2.3,2.8,2.5,2.8,1.9], [3.1,2.6,2.0,2.6,3.1,3.7,3.1,3.7,2.1,2.6,2.8,2.6,3.1,3.4,3.1,2.2], [2.8,2.3,1.7,2.3,2.8,2.8,2.8,2.8,1.8,2.3,1.2,2.3,2.8,2.5,2.8,1.9], [2.8,2.3,1.7,2.3,2.8,2.8,2.8,2.8,1.8,2.3,1.2,2.3,2.8,2.5,2.8,1.9], [2.8,2.3,2.3,2.3,2.8,2.8,2.8,2.8,2.4,2.3,1.2,2.3,2.8,2.5,2.8,1.9], [2.8,2.3,1.7,2.3,2.8,2.8,2.8,2.8,1.8,2.3,1.2,2.3,2.8,2.5,2.8,1.9], [2.8,2.3,2.3,2.3,2.8,2.8,2.8,2.8,2.4,2.3,1.2,2.3,2.8,2.5,2.8,1.9], [1.4,1.0,0.4,1.0,1.4,2.0,1.4,2.0,0.5,1.0,1.2,1.0,1.4,1.7,1.4,0.6], [2.8,2.3,1.7,2.3,2.8,2.8,2.8,2.8,1.8,2.3,1.2,2.3,2.8,2.5,2.8,1.9], [1.5,1.0,1.7,1.0,1.5,1.5,1.5,1.5,1.8,1.0,2.5,1.0,1.5,1.2,1.5,1.9], [2.8,2.3,1.7,2.3,2.8,2.8,2.8,2.8,1.8,2.3,1.2,2.3,2.8,2.5,2.8,1.9], [2.8,2.3,1.7,2.3,2.8,2.8,2.8,2.8,1.8,2.3,1.2,2.3,2.8,2.5,2.8,1.9], [2.8,2.3,2.3,2.3,2.8,2.8,2.8,2.8,2.4,2.3,1.2,2.3,2.8,2.5,2.8,1.9], [2.8,2.3,1.7,2.3,2.8,2.8,2.8,2.8,1.8,2.3,1.2,2.3,2.8,2.5,2.8,1.9], [3.4,2.3,1.7,2.3,2.8,2.8,2.8,2.8,1.8,2.3,2.5,2.3,2.8,2.5,2.8,1.9] ];
	dict['UCGG'] = [ [1.9,1.5,-0.2,1.5,1.5,1.5,1.5,1.5,0.4,1.5,0.1,1.5,1.5,1.6,1.5,1.4], [2.1,1.9,0.1,1.9,1.8,1.9,1.8,1.9,0.7,1.9,0.5,1.9,1.8,1.9,1.8,1.1], [2.4,2.2,0.4,2.2,2.1,2.8,2.1,2.8,1.0,2.2,2.1,2.2,2.1,2.8,2.1,1.4], [2.1,1.9,0.1,1.9,1.8,1.9,1.8,1.9,0.7,1.9,0.5,1.9,1.8,1.9,1.8,1.1], [2.1,1.9,0.1,1.9,1.8,1.9,1.8,1.9,0.7,1.9,0.5,1.9,1.8,1.9,1.8,1.1], [2.1,1.9,0.7,1.9,1.8,1.9,1.8,1.9,1.3,1.9,0.5,1.9,1.8,1.9,1.8,1.1], [2.1,1.9,0.1,1.9,1.8,1.9,1.8,1.9,0.7,1.9,0.5,1.9,1.8,1.9,1.8,1.1], [2.1,1.9,0.7,1.9,1.8,1.9,1.8,1.9,1.3,1.9,0.5,1.9,1.8,1.9,1.8,1.1], [0.8,0.5,-1.2,0.5,0.5,1.1,0.5,1.1,-0.6,0.5,0.4,0.5,0.5,1.2,0.5,-0.2], [2.1,1.9,0.1,1.9,1.8,1.9,1.8,1.9,0.7,1.9,0.5,1.9,1.8,1.9,1.8,1.1], [0.8,0.6,0.1,0.6,0.5,0.6,0.5,0.6,0.7,0.6,1.8,0.6,0.5,0.6,0.5,1.1], [2.1,1.9,0.1,1.9,1.8,1.9,1.8,1.9,0.7,1.9,0.5,1.9,1.8,1.9,1.8,1.1], [2.1,1.9,0.1,1.9,1.8,1.9,1.8,1.9,0.7,1.9,0.5,1.9,1.8,1.9,1.8,1.1], [2.1,1.9,0.7,1.9,1.8,1.9,1.8,1.9,1.3,1.9,0.5,1.9,1.8,1.9,1.8,1.1], [2.1,1.9,0.1,1.9,1.8,1.9,1.8,1.9,0.7,1.9,0.5,1.9,1.8,1.9,1.8,1.1], [2.7,1.9,0.1,1.9,1.8,1.9,1.8,1.9,0.7,1.9,1.8,1.9,1.8,1.9,1.8,1.1] ];
	dict['UGGC'] = [ [1.6,1.6,0.7,1.6,2.0,1.9,2.0,1.7,0.7,1.6,0.1,1.6,2.0,1.7,2.0,1.4], [2.0,1.9,1.0,1.9,2.4,2.2,2.4,2.1,1.0,1.9,0.5,1.9,2.4,2.1,2.4,1.2], [2.3,2.2,1.3,2.2,2.7,3.1,2.7,3.0,1.3,2.2,2.1,2.2,2.7,3.0,2.7,1.5], [2.0,1.9,1.0,1.9,2.4,2.2,2.4,2.1,1.0,1.9,0.5,1.9,2.4,2.1,2.4,1.2], [2.0,1.9,1.0,1.9,2.4,2.2,2.4,2.1,1.0,1.9,0.5,1.9,2.4,2.1,2.4,1.2], [2.0,1.9,1.6,1.9,2.4,2.2,2.4,2.1,1.6,1.9,0.5,1.9,2.4,2.1,2.4,1.2], [2.0,1.9,1.0,1.9,2.4,2.2,2.4,2.1,1.0,1.9,0.5,1.9,2.4,2.1,2.4,1.2], [2.0,1.9,1.6,1.9,2.4,2.2,2.4,2.1,1.6,1.9,0.5,1.9,2.4,2.1,2.4,1.2], [0.6,0.6,-0.3,0.6,1.0,1.5,1.0,1.3,-0.3,0.6,0.4,0.6,1.0,1.3,1.0,-0.1], [2.0,1.9,1.0,1.9,2.4,2.2,2.4,2.1,1.0,1.9,0.5,1.9,2.4,2.1,2.4,1.2], [0.7,0.6,1.0,0.6,1.1,0.9,1.1,0.8,1.0,0.6,1.8,0.6,1.1,0.8,1.1,1.2], [2.0,1.9,1.0,1.9,2.4,2.2,2.4,2.1,1.0,1.9,0.5,1.9,2.4,2.1,2.4,1.2], [2.0,1.9,1.0,1.9,2.4,2.2,2.4,2.1,1.0,1.9,0.5,1.9,2.4,2.1,2.4,1.2], [2.0,1.9,1.6,1.9,2.4,2.2,2.4,2.1,1.6,1.9,0.5,1.9,2.4,2.1,2.4,1.2], [2.0,1.9,1.0,1.9,2.4,2.2,2.4,2.1,1.0,1.9,0.5,1.9,2.4,2.1,2.4,1.2], [2.6,1.9,1.0,1.9,2.4,2.2,2.4,2.1,1.0,1.9,1.8,1.9,2.4,2.1,2.4,1.2] ];
	dict['UGGU'] = [ [2.1,2.4,1.1,2.4,2.4,2.4,2.4,2.4,2.7,2.4,1.1,2.4,2.4,2.4,2.4,3.0], [2.4,2.8,1.4,2.8,2.8,2.8,2.8,2.8,3.1,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [2.7,3.1,1.7,3.1,3.1,3.7,3.1,3.7,3.4,3.1,3.1,3.1,3.1,3.7,3.1,3.1], [2.4,2.8,1.4,2.8,2.8,2.8,2.8,2.8,3.1,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [2.4,2.8,1.4,2.8,2.8,2.8,2.8,2.8,3.1,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [2.4,2.8,2.0,2.8,2.8,2.8,2.8,2.8,3.7,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [2.4,2.8,1.4,2.8,2.8,2.8,2.8,2.8,3.1,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [2.4,2.8,2.0,2.8,2.8,2.8,2.8,2.8,3.7,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [1.1,1.4,0.1,1.4,1.4,2.0,1.4,2.0,1.7,1.4,1.4,1.4,1.4,2.0,1.4,1.4], [2.4,2.8,1.4,2.8,2.8,2.8,2.8,2.8,3.1,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [1.1,1.5,1.4,1.5,1.5,1.5,1.5,1.5,3.1,1.5,2.8,1.5,1.5,1.5,1.5,2.8], [2.4,2.8,1.4,2.8,2.8,2.8,2.8,2.8,3.1,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [2.4,2.8,1.4,2.8,2.8,2.8,2.8,2.8,3.1,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [2.4,2.8,2.0,2.8,2.8,2.8,2.8,2.8,3.7,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [2.4,2.8,1.4,2.8,2.8,2.8,2.8,2.8,3.1,2.8,1.5,2.8,2.8,2.8,2.8,2.8], [3.0,2.8,1.4,2.8,2.8,2.8,2.8,2.8,3.1,2.8,2.8,2.8,2.8,2.8,2.8,2.8] ];
	dict['UUGA'] = [ [2.4,2.2,1.2,2.2,2.3,2.2,2.3,2.2,1.9,2.2,0.7,2.2,2.3,2.2,2.3,1.9], [2.8,2.5,1.5,2.5,2.6,2.6,2.6,2.6,2.2,2.5,1.0,2.5,2.6,2.6,2.6,1.7], [3.1,2.8,1.8,2.8,2.9,3.5,2.9,3.5,2.5,2.8,2.6,2.8,2.9,3.5,2.9,2.0], [2.8,2.5,1.5,2.5,2.6,2.6,2.6,2.6,2.2,2.5,1.0,2.5,2.6,2.6,2.6,1.7], [2.8,2.5,1.5,2.5,2.6,2.6,2.6,2.6,2.2,2.5,1.0,2.5,2.6,2.6,2.6,1.7], [2.8,2.5,2.1,2.5,2.6,2.6,2.6,2.6,2.8,2.5,1.0,2.5,2.6,2.6,2.6,1.7], [2.8,2.5,1.5,2.5,2.6,2.6,2.6,2.6,2.2,2.5,1.0,2.5,2.6,2.6,2.6,1.7], [2.8,2.5,2.1,2.5,2.6,2.6,2.6,2.6,2.8,2.5,1.0,2.5,2.6,2.6,2.6,1.7], [1.4,1.2,0.2,1.2,1.3,1.8,1.3,1.8,0.9,1.2,1.0,1.2,1.3,1.8,1.3,0.3], [2.8,2.5,1.5,2.5,2.6,2.6,2.6,2.6,2.2,2.5,1.0,2.5,2.6,2.6,2.6,1.7], [1.5,1.2,1.5,1.2,1.3,1.3,1.3,1.3,2.2,1.2,2.3,1.2,1.3,1.3,1.3,1.7], [2.8,2.5,1.5,2.5,2.6,2.6,2.6,2.6,2.2,2.5,1.0,2.5,2.6,2.6,2.6,1.7], [2.8,2.5,1.5,2.5,2.6,2.6,2.6,2.6,2.2,2.5,1.0,2.5,2.6,2.6,2.6,1.7], [2.8,2.5,2.1,2.5,2.6,2.6,2.6,2.6,2.8,2.5,1.0,2.5,2.6,2.6,2.6,1.7], [2.8,2.5,1.5,2.5,2.6,2.6,2.6,2.6,2.2,2.5,1.0,2.5,2.6,2.6,2.6,1.7], [3.4,2.5,1.5,2.5,2.6,2.6,2.6,2.6,2.2,2.5,2.3,2.5,2.6,2.6,2.6,1.7] ];
	dict['UUGG'] = [ [3.6,2.7,1.9,2.7,2.7,2.7,2.7,2.7,3.6,2.7,1.4,2.7,2.7,2.7,2.7,3.3], [3.4,3.1,2.3,3.1,3.1,3.1,3.1,3.1,2.7,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [3.7,3.4,2.6,3.4,3.4,4.0,3.4,4.0,3.0,3.4,3.4,3.4,3.4,4.0,3.4,3.4], [3.4,3.1,2.3,3.1,3.1,3.1,3.1,3.1,2.7,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [3.4,3.1,2.3,3.1,3.1,3.1,3.1,3.1,2.7,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [3.4,3.1,2.9,3.1,3.1,3.1,3.1,3.1,3.3,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [3.4,3.1,2.3,3.1,3.1,3.1,3.1,3.1,2.7,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [3.4,3.1,2.9,3.1,3.1,3.1,3.1,3.1,3.3,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [2.2,1.7,0.2,1.7,1.7,2.3,1.7,2.3,1.3,1.7,1.7,1.7,1.7,2.3,1.7,1.7], [3.4,3.1,2.3,3.1,3.1,3.1,3.1,3.1,2.7,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [2.1,1.8,2.3,1.8,1.8,1.8,1.8,1.8,2.7,1.8,3.1,1.8,1.8,1.8,1.8,3.1], [3.4,3.1,2.3,3.1,3.1,3.1,3.1,3.1,2.7,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [3.4,3.1,2.3,3.1,3.1,3.1,3.1,3.1,2.7,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [3.4,3.1,2.9,3.1,3.1,3.1,3.1,3.1,3.3,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [3.4,3.1,2.3,3.1,3.1,3.1,3.1,3.1,2.7,3.1,1.8,3.1,3.1,3.1,3.1,3.1], [4.0,3.1,2.3,3.1,3.1,3.1,3.1,3.1,2.7,3.1,3.1,3.1,3.1,3.1,3.1,3.1] ];
		
	return dict;

}




if (RUNNING_FROM_COMMAND_LINE){


	module.exports = {
		ELONGATION_MODELS: FE_JS.ELONGATION_MODELS,
		currentElongationModel: FE_JS.currentElongationModel,
		TRANSLOCATION_MODELS: FE_JS.TRANSLOCATION_MODELS,
		currentTranslocationModel: FE_JS.currentTranslocationModel,
		initFreeEnergy_WW: FE_JS.initFreeEnergy_WW,
		getElongationModels_WW: FE_JS.getElongationModels_WW,
		userInputModel_WW: FE_JS.userInputModel_WW,
		getNTPparametersAndSettings_WW: FE_JS.getNTPparametersAndSettings_WW,
		calculateAllBarrierHeights_WW: FE_JS.calculateAllBarrierHeights_WW,
		getSlidingHeights_WW: FE_JS.getSlidingHeights_WW,
		update_slidingPeakHeights_WW: FE_JS.update_slidingPeakHeights_WW,
		update_slidingTroughHeights_WW: FE_JS.update_slidingTroughHeights_WW,
		getStateDiagramInfo_WW: FE_JS.getStateDiagramInfo_WW,
		getTranslocationCanvasData_WW: FE_JS.getTranslocationCanvasData_WW,
		getReleaseRate: FE_JS.getReleaseRate,
		getCatalysisRate: FE_JS.getCatalysisRate,
		getNTPCanvasData_WW: FE_JS.getNTPCanvasData_WW,
		getDeactivationCanvasData_WW: FE_JS.getDeactivationCanvasData_WW,
		getSlippageCanvasData_WW: FE_JS.getSlippageCanvasData_WW,
		RT: FE_JS.RT,
		BasePairParams: FE_JS.BasePairParams,
		LoopParams1x1: FE_JS.LoopParams1x1,
		LoopParams2x1: FE_JS.LoopParams2x1,
		LoopParams2x2: FE_JS.LoopParams2x2,
		SpecialHairpinParams: FE_JS.SpecialHairpinParams,
		TerminalMismatchParams: FE_JS.TerminalMismatchParams,

	}




}
