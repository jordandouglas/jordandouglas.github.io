
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



self.importScripts('simpol_asm.js');
WASM_MESSAGE_LISTENER = {};


// Send a message back to the original JS module to inform that the program has initialised
onRuntimeInitialised = function(){
	postMessage("wasm_initialised");
}
Module['onRuntimeInitialized'] = onRuntimeInitialised;


// Receive a message from the webassembly module
messageFromWasmToJS = function(msg, msgID = null){

	//console.log(msg, msgID);


	// See if the message has a callback
	if (msgID != null && WASM_MESSAGE_LISTENER[msgID] != null){

		// Convert the message into a string that can be parsed directly by JSON
		msg = msg.replace(/"/g, '\\"').replace(/,/g, '","').replace(/:/g,'":"').replace(/}/g,'"}').replace(/{/g,'{"').replace(/"{/g,'{').replace(/}"/g,'}');
		msg = msg.replace(/"false"/g, 'false').replace(/"true"/g, 'true'); // Convert string bools into bool bools 
		WASM_MESSAGE_LISTENER[msgID].resolve(msg)
		WASM_MESSAGE_LISTENER[msgID] = null;
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


loadSessionFromXML = function(xmlData, msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	
	Module.ccall("loadSessionFromXML", null, ["string", "number"], [xmlData, msgID]);
}

stopWebAssembly = function(msgID = null){
	
	
	// Create the callback function
	var toDoAfterCall = function(resultStr){
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	
	Module.ccall("stopWebAssembly");
	
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


	var result = Module.ccall("userInputSequence", "number", ["string", "string", "string", "number", "number"],  [newSeq, newTemplateType, newPrimerType, (inputSequenceIsNascent ? 1 : 0), msgID]); 
	var toReturn = {succ: result == 1}; 
	postMessage(msgID + "~X~" + JSON.stringify(toReturn));


}

// Select the sequencefrom list
userSelectSequence = function(newSequenceID, msgID = null){

	// Create the callback function
	var toDoAfterCall = function(resultStr){
		//console.log("Returning", JSON.parse(resultStr));
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};


	Module.ccall("userSelectSequence", null, ["string"],  [newSequenceID]); 

	var toReturn = {succ: true}; 
	postMessage(msgID + "~X~" + JSON.stringify(toReturn));

}


// Saves the parameter's distribution name and args to the module
saveParameterDistribution = function(paramID, distributionName, distributionParams, msgID = null){



	var array_cpp = getCppArrayFromDict(distributionParams);


	Module.ccall("saveParameterDistribution", // name of C++ function 
                         null, // return type
                         ["string", "string", "string", "number", "number", "number"], // argument types
                         [paramID, distributionName, array_cpp.keys, array_cpp.vals, array_cpp.len, msgID]); // arguments




	// Clear allocated heap data to avoid memory leaks
	Module._free(array_cpp.vals)
	
	
	// Return parameters
	getAllParameters(msgID);
	
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


// Perform N simulations
startTrials = function(N, msgID = null){
	
	// Create the callback function
	var toDoAfterCall = function(resultStr){
		//console.log(JSON.parse(resultStr));
		if (msgID != null) postMessage(msgID + "~X~" + resultStr);
	}
	WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
	Module.ccall("startTrials", null, ["number", "number", "number"], [N, 4, msgID]);
	
	
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


