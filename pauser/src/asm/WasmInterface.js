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
//      - A string containing all the dict names (separated by ,)
//      - A buffer containing the values. Can be double, int or string
//      - A number containing the length of the array
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




// Get the number of trials being performed
getNtrials = function(msgID = null){
    
    // Create the callback function
    var toDoAfterCall = function(resultStr){
        if (msgID != null) postMessage(msgID + "~X~" + resultStr);
    }

    WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
    Module.ccall("getNtrials", [], ["number"], [msgID]);
    
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



// Return a JSON string of the cumulatively calculated pause sites
getPauseSites = function(msgID = null){

    // Create the callback function
    var toDoAfterCall = function(resultStr){
        if (msgID != null) postMessage(msgID + "~X~" + resultStr);
    }
    WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

    
    Module.ccall("getPauseSites", null, ["number"], [msgID]);
}




// Parse an MSA in .fasta format
parseMSA = function(fasta, msgID = null){

    // Create the callback function
    var toDoAfterCall = function(resultStr){
        if (msgID != null) postMessage(msgID + "~X~" + resultStr);
    }
    WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};

    
    Module.ccall("parseMSA", null, ["string", "number"], [fasta, msgID]);
}








// Begin the PhyloPause simulations and return to js after a timeout (~1000ms) has been reached to check if user has requested to stop
startPauser = function(resume = false, msgID = null){
    
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
            resumePhyloPause(msgID);
        }
    }



    WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall, remove: false};
    Module.ccall("startPauser", null, ["number", "number"], [(resume ? 0 : 1), msgID]);
    
}

// Returns the classifier threshold values
getThresholds = function(msgID = null){

    // Create the callback function
    var toDoAfterCall = function(resultStr){
        if (msgID != null) postMessage(msgID + "~X~" + resultStr);
    }
    WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
    
    Module.ccall("getThresholds", null, ["number"], [msgID]);


}



// Update the threshold required for a site to be classified as a pause site by SimPol
updateThreshold = function(classifier, threshold, msgID = null){

    // Create the callback function
    var toDoAfterCall = function(resultStr){
        if (msgID != null) postMessage(msgID + "~X~" + resultStr);
    }
    WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
    
    Module.ccall("updateThreshold", null, ["string", "number", "number"], [classifier, threshold, msgID]);


}


// Resume simulations from before continuing from the current state and time elapsed
resumePhyloPause = function(msgID = null){



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
             
                // Resume the trials and tell the messenger to not delete the message
                if (msgID != null) postMessage(msgID + "~X~" + resultStr);
                resumePhyloPause(msgID);
            }
        }

        WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall, remove: false};
        Module.ccall("startPauser", null, ["number", "number"], [0, msgID]);

    }, 1);



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

