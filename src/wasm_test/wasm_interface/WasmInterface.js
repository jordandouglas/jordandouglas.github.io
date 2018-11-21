
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


/*
    Interface functions
*/





// Instructs the animation / simulation to stop
add = function(n1, n2, msgID = null){
    
    // Create the callback function
   var toDoAfterCall = function(resultStr){
        if (msgID != null) postMessage(msgID + "~X~" + resultStr);
    }

    WASM_MESSAGE_LISTENER[msgID] = {resolve: toDoAfterCall};
    Module.ccall("add", [], ["number", "number", "number"], [n1, n2, msgID]); // Can parse number or string
    
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

