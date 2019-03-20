
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





// Upload a NBC parameters from a URL. csv format
function uploadNBCFromURL(url, resolve = function() { }){
    
    console.log("Trying to open", url);
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          
            if (xhttp == null || xhttp.responseXML == "") return;
            
            parseNBC(xhttp.responseText, resolve);
           
        }
    };
    xhttp.open("GET", url, true);
    xhttp.send();
    
    
}



// Parse NBC parameters
function parseNBC(nbc_str, resolve = function() { }){


    // Send the validated fasta through to the webassembly module
    parseNBC_controller(nbc_str.replace(/(\r\n|\n|\r)/gm, "|"), function(parseResult){

        
        if (parseResult.error == null){
        
            getThresholds_controller();
            
            resolve();

        }

        else {


            alert(parseResult.error);
            return;

        }

    });

}

