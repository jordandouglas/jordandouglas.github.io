
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


#include "WasmMessenger.h"

#include <emscripten.h>
#include <iostream>
#include <string>



using namespace std;


// Send the next log file line to javascript so it can print it
void WasmMessenger::printLogFileLine(const string & msg, bool append) {
	EM_ASM_ARGS({
    	var msg = Pointer_stringify($0); // Convert message to JS string                              
    	printLogFileLine(msg, $1);                                            
  	}, msg.c_str(), append);
}


