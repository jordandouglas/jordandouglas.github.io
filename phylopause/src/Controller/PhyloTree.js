
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




// Upload a tree
function uploadTree(fileLocation = null){
    
    document.getElementById("uploadTree").addEventListener('change', loadNexusFile, false);
    if(fileLocation == null) $("#uploadTree").click();
     
     function loadNexusFile(evt) {

        if (evt.target.files.length == 0) return;

        var fileName = evt.target.files[0]; 
            
        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function(theFile) {
            return function(e) {
                
                if (e == null || e.target.result == "") return;

                parseTree(e.target.result);

            };

        })(fileName);

        reader.readAsText(fileName);


        $("#uploadTree").val("");

     }


}



function parseTree(nexus_str){



    // Send the validated fasta through to the webassembly module
    parseTree_controller(nexus_str.replace(/(\r\n|\n|\r)/gm, "|"), function(parseResult){

        console.log("Parsed Tree", parseResult);

        
        if (parseResult.error == null || parseResult.error == ""){

            $(".uploadTreeFirst").show(300);
            $(".beforeUploadingTree").hide(0);
         

            // Update the alignment sequence weights
            renderSequenceWeights(function(){
                renderPauseSitesOnAlignment();
            });

            // Draw the tree
            renderTree(); 

        }

        else {


            alert(parseResult.error);
            return;

        }



    });



}



// Draw the tree
function renderTree(resolve = function() { }){

    
    console.log("renderTree");

    resolve();

}
