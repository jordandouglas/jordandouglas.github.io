
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
*/



function initWebAssembly(){


	ASM_FILE_LOCATION = "src/asm/simpol_asm.wasm";


	// Override some of the simpol_asm.js functions
	Module['print'] = function(x){
		console.log(x);
		document.getElementById("output_asm").innerHTML = document.getElementById("output_asm").innerHTML + x + "<br>";
		//setTimeout(function(){
			//$("#output_asm").append(x + "<br>");
		//}, 0);
	}

	document.querySelector('.mybutton').addEventListener('click', function(){
		var result = Module.ccall('main', // name of C function 
	                         "int", // return type
	                         ["int", "char**"], // argument types
	                         [2, null]); // arguments



	});


}
