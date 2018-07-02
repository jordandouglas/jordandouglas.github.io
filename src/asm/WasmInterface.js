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


ANIMATION_TIME = 60;
IS_MOBILE = false;
self.importScripts('simpol_asm.js');
WASM_MESSAGE_LISTENER = {};


// Send a message back to the original JS module to inform that the program has initialised
onRuntimeInitialised = function(){
	Module.ccall("initGUI", null, ["number"], [IS_MOBILE]); // Initialise the WASM module for GUI use
	postMessage("wasm_initialised");
}
Module['onRuntimeInitialized'] = onRuntimeInitialised;


// Receive a message from the webassembly module
messageFromWasmToJS = function(msg = null, msgID = null){

	//console.log(msg, msgID);



	// See if the message has a callback
	if (msgID != null && WASM_MESSAGE_LISTENER[msgID] != null){


		if (msg == null || msg == ""){
			WASM_MESSAGE_LISTENER[msgID].resolve("done");
		}else{

			//console.log("msg", msg);

			// Convert the message into a string that can be parsed directly by JSON
			msg = msg.replace(/'/g, '\"').replace(/'/g, "\\'").replace(/"\[/g, "[").replace(/\]"/g, "]");

			//console.log("msg", msgID, msg);

			WASM_MESSAGE_LISTENER[msgID].resolve(msg)

		}

		// Do not delete the message listener event if requested 
		if (WASM_MESSAGE_LISTENER[msgID] != null && (WASM_MESSAGE_LISTENER[msgID].remove == null || WASM_MESSAGE_LISTENER[msgID].remove == true)){
			WASM_MESSAGE_LISTENER[msgID] = null;
		}
	}

}


// Converts a javascript object into three parts: 
// 		- A string containing all the dict names (separated by ,)
//		- A buffer containing the values. Can be double, int or string
//		- A number containing the length of the array
getCppArrayFromDict = function(dict, dataType = "double"){


	// Convert dict into js list
	var dictKeyString = "";
	var arrayDataToParse = [];
	for (key in dict){
		dictKeyString += key + ",";
		arrayDataToParse.push(dict[key]);
	}
	dictKeyString = dictKeyString.substring(0, dictKeyString.length-1); // Remove the final ,



	// Convert the js list into a typed list
	var typedArray = dataType == "double" ? new Float64Array(arrayDataToParse.length) : dataType == "int" ? new Int32Array(arrayDataToParse.length) : "";
	for (var i = 0; i < arrayDataToParse.length; i++) {
        if (dataType != "string") typedArray[i] = arrayDataToParse[i];
		else {
			typedArray += arrayDataToParse[i];
			if (i < arrayDataToParse.length-1) typedArray += ",";
		}
	}


	// Assign data to the heap
	var buffer;// = Module._malloc(typedArray.length * typedArray.BYTES_PER_ELEMENT)
	if (dataType == "double") Module.HEAPF64.set(typedArray, buffer >> 2);
	else if(dataType == "int") Module.HEAP32.set(typedArray, buffer >> 2);
	else if(dataType == "string") buffer = typedArray;

	// Return object
	return {keys: dictKeyString, vals: buffer, len: arrayDataToParse.length};


}

/*
	Interface functions
*/





// Toggle between displaying or not displaying the folded mRNA
showFoldedRNA = function(showFolding, msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		//console.log("MFE", resultStr);
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	
	Module.ccall("showFoldedRNA", null, ["number", "number"], [showFolding, msgID]);

}


// Returns a JSON object containing how to fold the mRNA
getMFESequenceBonds = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		//console.log("MFE", resultStr);
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	
	Module.ccall("getMFESequenceBonds", null, ["number"], [msgID]);

}




// Returns a JSON string with all unrendered objects and removes these objects from the list
getUnrenderedobjects = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		//console.log("unrendered", JSON.parse(resultStr));
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	
	Module.ccall("getUnrenderedobjects", null, ["number"], [msgID]);

}


// Loads a session from an XML string
loadSessionFromXML = function(xmlData, msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};


	
	Module.ccall("loadSessionFromXML", null, ["string", "number"], [xmlData, msgID]);
}


// Provides all information necessary to construct an XML string so the user can download the current session
getSaveSessionData = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	
	Module.ccall("getSaveSessionData", null, ["number"], [msgID]);
}


// Refresh the current state
refresh = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(){
		if (msgID != null) postMessage(msgID + "~X~done" );
	}

	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("refresh", [], ["number"], [msgID]);

}


// Instructs the animation / simulation to stop
stopWebAssembly = function(msgID = null){
	
	// Create the callback function
	var toDoAfterCall = function(){
		if (msgID != null) postMessage(msgID + "~X~done" );
	}

	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	//console.log("STOPPING JS");
	Module.ccall("stopWebAssembly", [], ["number"], [msgID]);
	
}



// Get all sequences from the model
getSequences = function(msgID = null) {

	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};


	Module.ccall("getSequences", null, ["number"],  [msgID]); 

}


// User enter their own sequence. Return whether or not it worked
userInputSequence = function(newSeq, newTemplateType, newPrimerType, inputSequenceIsNascent, msgID = null){



	// Create the callback function
	var toDoAfterCall = function(toReturn){
		//console.log("Returning", JSON.parse(resultStr));
		if (msgID != null) {
			postMessage(msgID + "~X~" + toReturn);
		}
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};


	Module.ccall("userInputSequence", null, ["string", "string", "string", "number", "number"],  [newSeq, newTemplateType, newPrimerType, (inputSequenceIsNascent ? 1 : 0), msgID]); 


}

// Select the sequencefrom list
userSelectSequence = function(newSequenceID, msgID = null){

	// Create the callback function
	var toDoAfterCall = function(){
		//console.log("Returning", JSON.parse(resultStr));
		if (msgID != null) {
			var toReturn = {succ: true}; 
			postMessage(msgID + "~X~" + JSON.stringify(toReturn));
		}

	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};


	Module.ccall("userSelectSequence", null, ["string", "number"],  [newSequenceID, msgID]); 


}


// Get the list of polymerases and the currently selected one
getPolymerases = function(msgID = null){
	

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		//console.log("Returning", JSON.parse(resultStr));
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};


	Module.ccall("getPolymerases", null, ["int"],  [msgID]); 


}


// Select the current RNA polymerase to use
userChangePolymerase = function(selectedPolymeraseID, msgID = null){


	// Create the callback function
	var toDoAfterCall = function(){
		//console.log("Returning", JSON.parse(resultStr));
		if (msgID != null) postMessage(msgID + "~X~done");
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};


	Module.ccall("userChangePolymerase", null, ["string", "int"],  [selectedPolymeraseID, msgID]); 

}


// Saves the parameter's distribution name and args to the module
saveParameterDistribution = function(paramID, distributionName, distributionParams, msgID = null){



	var array_cpp = getCppArrayFromDict(distributionParams);


	Module.ccall("saveParameterDistribution", // name of C++ function 
                         null, // return type
                         ["string", "string", "string", "number", "number"], // argument types
                         [paramID, distributionName, array_cpp.keys, array_cpp.vals, array_cpp.len]); // arguments




	// Clear allocated heap data to avoid memory leaks
	Module._free(array_cpp.vals)
	
	
	// Return parameters
	getAllParameters(msgID);
	
}





bendDNA = function(msgID = null){
	
	
	// Create the callback function
	var toDoAfterCall = function(resultStr){
		//console.log("Returning", JSON.parse(resultStr));
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	
	Module.ccall("bendDNA", null, ["number"],  [msgID]); 


	
}




// Initialise ABC for the first time
initABC = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		console.log("Returning", resultStr);
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};


	Module.ccall("initABC", null, ["number"], [msgID]); 


}






// Begin/resume ABC with the specified settings
resumeABC = function(msgID = null){




	// Pause for a bit in case user requests to stop
	setTimeout(function(){


		// Create the callback function
		var toDoAfterCall = function(resultStr){
			//console.log("Returning", resultStr);
			var result = JSON.parse(resultStr);

			// Exit now
			if (result.stop){
				if (msgID != null) {
					postMessage(msgID + "~X~" + resultStr);
					WASM_MESSAGE_LISTENER[msgID] = null;
				}
			}

			else{

				// Resume the trials and tell the messenger to not delete the message
				if (msgID != null) postMessage(msgID + "~X~" + resultStr);
				//resumeABC(msgID);

			}
		}


		WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall, remove: false};
		Module.ccall("resumeABC", null, ["number"], [msgID]); 

	}, 1);


}


// Get posterior distribution summary (geometric medians etc)
getPosteriorSummaryData = function(msgID = null){
	
	
	// Create the callback function
	var toDoAfterCall = function(resultStr){
		console.log("Returning getPosteriorSummaryData", JSON.parse(resultStr));
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	
	Module.ccall("getPosteriorSummaryData", null, ["number"],  [msgID]); 

}


// Get posterior distribution list
getPosteriorDistribution = function(msgID = null){
	
	
	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	
	Module.ccall("getPosteriorDistribution", null, ["number"],  [msgID]); 

}


// Generate the full ABC output
getABCoutput = function(msgID = null){
	
	
	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	
	Module.ccall("getABCoutput", null, ["number", "number"],  [msgID, 0]); 

}


// Get all parameters in the specified posterior distribution. 0 = regular distribution, 1,2,3, ... refer to gel calibrations
getParametersInPosteriorDistribution = function(posteriorID, msgID = null){
	
	
	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	
	Module.ccall("getParametersInPosteriorDistribution", null, ["number", "number"],  [posteriorID, msgID]); 

}



// Get the names of all posterior distributions
getPosteriorDistributionNames = function(msgID = null){
	
	
	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	
	Module.ccall("getPosteriorDistributionNames", null, ["number"],  [msgID]); 

}


// Upload the ABC file
uploadABC = function(TSVfile, msgID = null){
	

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		console.log("uploadABC", resultStr);
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	// Clear all ABC data first
	Module.ccall("uploadABC", null, ["string", "number"],  [TSVfile, msgID]); 


}


// Perform MCMC to infer the parameters of the gel lanes (ie. build a linear model of MW vs migration distance)
initGelCalibration = function(fitID, priors, msgID = null){
	
	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};


	/*
	for (var i = 0; i < lanes.length; i ++){

		var lane = lanes[i];

		console.log("lane", lane);


		// Save the lane
		Module.ccall("addGelLane", null, ["string", "number", "number", "string"],  [fitID, lane.laneNum, lane.time, lane.densities.toString()]); 

	}
	*/

	
	Module.ccall("initGelCalibration", null, ["number", "string", "number"],  [(fitID + "").substring(3), priors, msgID]); 


}



// Resume MCMC to infer the parameters of the gel lanes (ie. build a linear model of MW vs migration distance)
resumeGelCalibration = function(msgID = null){


	console.log("Resuming");

	// Pause for a bit in case user requests to stop
	setTimeout(function(){


		// Create the callback function
		var toDoAfterCall = function(resultStr){
			//console.log("Returning", resultStr);
			var result = JSON.parse(resultStr);

			// Exit now
			if (result.stop){
				if (msgID != null) {
					postMessage(msgID + "~X~" + resultStr);
					WASM_MESSAGE_LISTENER[msgID] = null;
				}
			}

			else{

				// Resume the trials and tell the messenger to not delete the message
				if (msgID != null) postMessage(msgID + "~X~" + resultStr);
				//resumeABC(msgID);

			}
		}


		WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall, remove: false};
		Module.ccall("resumeGelCalibration", null, ["number"], [msgID]); 

	}, 1);


}



// Returns the posterior distribution for calibrating this gel
getGelPosteriorDistribution = function(fitID, msgID = null){

	
	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};


	
	Module.ccall("getGelPosteriorDistribution", null, ["number", "number"],  [(fitID + "").substring(3), msgID]); 

}



// Return a list of all parameters which are being estimated in the posterior distribution
getParametersWithPriors = function(msgID = null){
	
	// Create the callback function
	var toDoAfterCall = function(resultStr){
		//console.log("Returning", JSON.parse(resultStr));
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	
	Module.ccall("getParametersWithPriors", null, ["number"],  [msgID]); 


	
}




// Change the burn-in
update_burnin = function(burnin){

	Module.ccall("update_burnin", null, ["number"],  [burnin]); 

}

setModelSettings = function(tosend, msgID = null){
	
	var array_cpp = getCppArrayFromDict(tosend, "string");

	
	// Create the callback function
	var toDoAfterCall = function(resultStr){
		//console.log("Returning", JSON.parse(resultStr));
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	
	Module.ccall("setModelSettings", null, ["number", "string", "string"],  [msgID, array_cpp.keys, array_cpp.vals]); 


	
}


// Returns length of the template
getTemplateSequenceLength = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);

	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	Module.ccall("getTemplateSequenceLength", null, ["number"], [msgID]);

}



// Returns all parameters and their information as a js object
getAllParameters = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		//console.log(JSON.parse(resultStr));
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);

	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("getAllParameters", null, ["number"], [msgID]);


}


// Returns all model settings
getModelSettings = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		//console.log(JSON.parse(resultStr));
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);

	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("getModelSettings", null, ["number"], [msgID]);

}


// Returns all parameters and model settings
getParametersAndModelSettings = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		//console.log(JSON.parse(resultStr));
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);

	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	Module.ccall("getParametersAndModelSettings", null, ["number"], [msgID]);

}


// Perform N simulations and then return to js after a timeout (~1000ms) has been reached to check if user has requested to stop
startTrials = function(N, msgID = null){
	
	// Create the callback function
	var toDoAfterCall = function(resultStr){


		//console.log("Returning", resultStr);
		var result = JSON.parse(resultStr);

		// Exit now
		if (result.stop){
			if (msgID != null) {
				postMessage(msgID + "~X~" + resultStr);
				WASM_MESSAGE_LISTENER[msgID] = null;
			}
		}


		else{


			// Animated mode. Perform the actions specified and then sample more actions 
			if (result.animationTime > 0 && result.actions != null) {
				applyReactions(result.actions, function() { 
					if (msgID != null) postMessage(msgID + "~X~" + resultStr);
					//resumeTrials(msgID);
				}, null);
			}

			// Hidden mode. Resume the trials and tell the messenger to not delete the message
			else {
				if (msgID != null) postMessage(msgID + "~X~" + resultStr);
				resumeTrials(msgID);
			}
		}
	}


	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall, remove: false};
	Module.ccall("startTrials", null, ["number", "number"], [N, msgID]);
	//Module.ccall("getPlotDataJSON", null, [], []);
	
}



// Resume simulations from before continuing from the current state and time elapsed
resumeTrials = function(msgID = null){



	// Pause for a bit in case user requests to stop
	setTimeout(function(){

		// Create the callback function
		var toDoAfterCall = function(resultStr){
			var result = JSON.parse(resultStr);
			// Exit now

			if (result.stop){
				if (msgID != null) {
					postMessage(msgID + "~X~" + resultStr);
					WASM_MESSAGE_LISTENER[msgID] = null;
				}
			}

			else{

				
				// Animated mode. Perform the actions specified and then sample more actions 
				if (result.animationTime > 0 && result.actions != null) {
					applyReactions(result.actions, function() { 
						if (msgID != null) postMessage(msgID + "~X~" + resultStr);
						//resumeTrials(msgID);
					}, null);
				}

				// Hidden mode. Resume the trials and tell the messenger to not delete the message
				else {
					if (msgID != null) postMessage(msgID + "~X~" + resultStr);
					resumeTrials(msgID);
				}

			}
		}

		WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall, remove: false};
		Module.ccall("resumeTrials", null, ["number"], [msgID]);
		//Module.ccall("getPlotDataJSON", null, [], []);




	}, 1);
	
}


// Returns all unsent plot data and all plot display settings
getPlotData = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		//console.log("plotdata", resultStr);
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);

	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	Module.ccall("getPlotData", null, ["number"], [msgID]);

}



// Save the current plot settings (by pressing 'Save' on the plot settings dialog)
savePlotSettings = function(plotNum, values, msgID = null) {

	
	// Create the callback function
	var toDoAfterCall = function(resultStr){
		//var whichPlotInWhichCanvas = JSON.parse(resultStr).whichPlotInWhichCanvas
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);

	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};


	// Convert list (of lists?) into a string where each element in the main list is separated by |
	// And each element in a sublist is separated by ,
	var values_str = "";
	for (var i = 0; i < values.length; i ++){
		if (values[i] == null) values_str += "null";
		else values_str += values[i].toString();
		if (i < values.length-1) values_str += "|";

	}

	Module.ccall("savePlotSettings", null, ["number", "string", "number"], [plotNum, values_str, msgID]);



}




// Show or hide the sitewise plot
showSitewisePlot = function(hidden){
	Module.ccall("showSitewisePlot", null, ["number"], [(hidden ? 1 : 0)]);
}



// Show or hide all current plots. While all plots of a given type are hidden then data will no longer be sent to the controller
showPlots = function(hidden){
	Module.ccall("showPlots", null, ["number"], [(hidden ? 1 : 0)]);
}


// Select the speed of the animation. Slow, medium, fast or hidden
changeSpeed = function(speed, msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}

	//console.log("Changing speed to", speed);
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("changeSpeed", null, ["string", "number"], [speed, msgID]);


}


// Set the current posterior distribution id
setCurrentLoggedPosteriorDistributionID = function(id, msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}

	//console.log("Changing speed to", speed);
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("setCurrentLoggedPosteriorDistributionID", null, ["number", "number"], [id, msgID]);


}



// User selects which base to add next manually
userSetNextBaseToAdd = function(ntpToAdd, msgID = null){

	// Create the callback function
	var toDoAfterCall = function(){
		if (msgID != null) postMessage(msgID + "~X~done");
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	Module.ccall("userSetNextBaseToAdd", null, ["string", "number"], [ntpToAdd, msgID]);


}


// Gets the next base to add 
getNextBaseToAdd = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	Module.ccall("getNextBaseToAdd", null, ["number"], [msgID]);


}


// Returns an object which contains the sizes of each object in the cache that can be cleared
getCacheSizes = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("getCacheSizes", null, ["number"], [msgID]);


}


// Deletes all plot data of the specified types
deletePlots = function(distanceVsTime_cleardata, timeHistogram_cleardata, timePerSite_cleardata, customPlot_cleardata, ABC_cleardata, sequences_cleardata, msgID = null){


	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("deletePlots", null, ["number", "number", "number", "number", "number", "number", "number"], [distanceVsTime_cleardata, timeHistogram_cleardata, timePerSite_cleardata, customPlot_cleardata, ABC_cleardata, sequences_cleardata, msgID]);

}





// User selects which plot should be displayed at a particular plot slot
userSelectPlot = function(plotNum, value, deleteData, msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("userSelectPlot", null, ["number", "string", "number", "number"], [plotNum, value, (deleteData ? 1 : 0), msgID]);


}


// Calculates the mean pre-posttranslocated equilibrium constant (kfwd / kbck) across the whole sequence
calculateMeanTranslocationEquilibriumConstant = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("calculateMeanTranslocationEquilibriumConstant", null, ["number"], [msgID]);

}



// Gets all information necessary to plot rates onto the state diagram 
getStateDiagramInfo = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("getStateDiagramInfo", null, ["number"], [msgID]);

}




// Recursively applies the actions in the list. Pauses in between actions to allow the DOM to animate the change
applyReactions = function(actionsList, resolve = null, msgID = null){

	if (actionsList.length == 0){

		// If there is a callback perform it now
		if (resolve != null) resolve();

		// Inform the controller that this action has finished
		if (msgID != null && WASM_MESSAGE_LISTENER[msgID] != null) {
			postMessage(msgID + "~X~done");
			WASM_MESSAGE_LISTENER[msgID] = null;
		}
		return;
	}



	actionToDo = actionsList.shift();

	var animationTime = Module.ccall("getAnimationTime", "number");
	var toStop = Module.ccall("applyReaction", "number", ["number"], [actionToDo]);


	// If need to stop then deplete the list of actions so that it stops after performing this action
	if (toStop == 1) actionsList = [];

	// Wait animationTime before proceeding
	setTimeout(function() {
		applyReactions(actionsList, resolve, msgID);
	}, animationTime + 2);


}


// Transcribe N bases. This is done by first finding the actions to perform, and then allowing the controller to render one at a time
transcribe = function(N, msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){


		// Hidden mode -> return to controller now
		if (resultStr == "" || resultStr == "done"){
			postMessage(msgID + "~X~done");
			WASM_MESSAGE_LISTENER[msgID] = null;
		}
		// Animated mode -> animate each action one at a time
		else{
			var result = JSON.parse(resultStr);
			//console.log("result", result, result.animationTime);
			applyReactions(result.actions, null, msgID);
		}

	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall, remove: false};

	Module.ccall("getTranscriptionActions", null, ["number", "number"], [N, msgID]);

}


// Stutter N times. This is done by first finding the actions to perform, and then allowing the controller to render one at a time
stutter = function(N, msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){


		// Hidden mode -> return to controller now
		if (resultStr == "" || resultStr == "done"){
			postMessage(msgID + "~X~done");
			WASM_MESSAGE_LISTENER[msgID] = null;
		}
		// Animated mode -> animate each action one at a time
		else{
			var result = JSON.parse(resultStr);
			//console.log("result", result, result.animationTime);
			applyReactions(result.actions, null, msgID);
		}

	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall, remove: false};

	Module.ccall("getStutterActions", null, ["number", "number"], [N, msgID]);

}


// Move the polymerase forwards
translocateForward = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("translocateForward", null, ["number"], [msgID]);

}

// Move the polymerase backwards
translocateBackwards = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("translocateBackwards", null, ["number"], [msgID]);

}


// Bind NTP or add it onto the chain if already bound
bindOrCatalyseNTP = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(){
		if (msgID != null) postMessage(msgID + "~X~done");
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("bindOrCatalyseNTP", null, ["number"], [msgID]);

}

// Release NTP or remove it from the chain if already added
releaseOrRemoveNTP = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(){
		if (msgID != null) postMessage(msgID + "~X~done");
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("releaseOrRemoveNTP", null, ["number"], [msgID]);

}


// Activate the polymerase from its catalytically inactive state
activatePolymerase = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(){
		if (msgID != null) postMessage(msgID + "~X~done");
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("activatePolymerase", null, ["number"], [msgID]);

}


// Deactivate the polymerase by putting it into a catalytically inactive state
deactivatePolymerase = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(){
		if (msgID != null) postMessage(msgID + "~X~done");
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("deactivatePolymerase", null, ["number"], [msgID]);

}



// Cleave the 3' end of the nascent strand if backtracked
cleaveNascentStrand = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(){
		if (msgID != null) postMessage(msgID + "~X~done");
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("cleaveNascentStrand", null, ["number"], [msgID]);

}


// Form / diffuse / fuse / fissure / absorb bulge with id S to the left
slipLeft = function(S = 0, msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	Module.ccall("slipLeft", null, ["number", "number"], [S, msgID]);

}


// Form / diffuse / fuse / fissure / absorb bulge with id S to the right
slipRight = function(S = 0, msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	Module.ccall("slipRight", null, ["number", "number"], [S, msgID]);

}



// Returns all data needed to draw the translocation navigation canvas
getTranslocationCanvasData = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("getTranslocationCanvasData", null, ["number"], [msgID]);

}

// Returns all data needed to draw the NTP bind/release navigation canvas
getNTPCanvasData = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		//console.log("resultStr", resultStr);
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("getNTPCanvasData", null, ["number"], [msgID]);

}

// Returns all data needed to draw the activate/deactivate navigation canvas
getDeactivationCanvasData = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		//console.log("resultStr", resultStr);
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("getDeactivationCanvasData", null, ["number"], [msgID]);

}


// Returns all data needed to draw the cleavage navigation canvas
getCleavageCanvasData = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		//console.log("resultStr", resultStr);
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("getCleavageCanvasData", null, ["number"], [msgID]);

}


// Returns all data needed to draw the slippage navigation canvas
getSlippageCanvasData = function(S = 0, msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		//console.log("resultStr", resultStr);
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("getSlippageCanvasData", null, ["number", "number"], [S, msgID]);

}




// Returns the trough and peak heights of the translocation energy landscape
getTranslocationEnergyLandscape = function(msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		//console.log("resultStr", resultStr);
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

	Module.ccall("getTranslocationEnergyLandscape", null, ["number"], [msgID]);

}



onmessage = function(e) {

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

