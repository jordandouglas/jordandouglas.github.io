


#include "../model/Calculations.h"



#include <emscripten.h>
#include <iostream>
#include <string>




using namespace std;



// Send a message to javascript
void messageFromWasmToJS(const string & msg) {
	EM_ASM_ARGS({
    	var msg = Pointer_stringify($0); // Convert message to JS string                              
    	messageFromWasmToJS(msg);                                            
  	}, msg.c_str());
}


void messageFromWasmToJS(const string & msg, int msgID) {
	if (msgID == -1) return;
	EM_ASM_ARGS({
    	var msg = Pointer_stringify($0); // Convert message to JS string                              
    	messageFromWasmToJS(msg, $1);                                       
  	}, msg.c_str(), msgID);
}



// Interface between javascript and cpp for webassembly
extern "C" {


	void EMSCRIPTEN_KEEPALIVE add(double n1, double n2, int msgID){
        

 		Calculations* calculator = new Calculations();
    		double sum = calculator->add(5, 20);
    		cout << "5 + 20 = " << sum << endl;
	


    		// If you create something using 'new' you have to delete it (and all of its * references) or you will get a memory leak!
    		delete calculator;


	

		// Make sure you use " to open the string, and any string you have within the JSON must be encased by '.
		// If you mismatch the quote marks here the regex won't work later
		string JSON = "{'sum':" + sum + ",'sky':'blue'}"; 


		messageFromWasmToJS(JSON, msgID);

	


	}
    

}







