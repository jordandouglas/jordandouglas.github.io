
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


#ifndef WASMMESSENGER_H
#define WASMMESSENGER_H



#include <string>


using namespace std;


// This class exists to send messages directly to javascript. 
// Do not use any of these functions if not using WebAssembly
// WasmMessenger.ccp should not be compiled if you are not using emscripten since #include <emscripten.h> will throw an error
class WasmMessenger{


    public:
    	static void printLogFileLine(const string & msg, bool append);

};




#endif

