

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







// Loads a session from the XML file stored at url
function loadSessionFromURL(url, resolve = function() { }){
    
    console.log("Trying to open", url);
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          
            if (xhttp == null || xhttp.responseXML == "") return;

            //console.log("xhttp.responseText", xhttp.responseText);
            var XMLstring = xhttp.responseText.replace(/(\r\n|\n|\r)/gm,"");
            loadSessionFromString(XMLstring, resolve);

           
        }
    };
    xhttp.open("GET", url, true);
    xhttp.send();
    
    
}




// Upload an alignment
function uploadSession(){

    var updateDOM = true;

    document.getElementById("uploadSession").addEventListener('change', loadAlignmentFile, false);
   $("#uploadSession").click();

     
    function loadAlignmentFile(evt) {

        if (evt.target.files.length == 0) return;

        var fileName = evt.target.files[0]; 


        console.log("fileName", fileName);
        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function(theFile) {

            return function(e) {

                console.log(e);
                
                if (e == null || e.target.result == "") return;


                var parseResult = loadSessionFromString(e.target.result);

                if (parseResult == true || parseResult == null){


                    console.log("Successfully uploaded session", fileName);
                    resetResults();

                    $(".uploadSessionFirst").show(300);
                    $(".beforeUploadingSession").hide(0);

                    //$("#alignmentLoading").html(getLoaderTemplate("alignmentLoader", "Loading alignment..."));
                    //$("#alignmentLoading").show(50);


                }

                else {

                    alert(parseResult);
                    return;

                }

            };

        })(fileName);

        reader.readAsText(fileName);

       

     }


}





function loadSessionFromString(XMLstring, resolve = function() { }){

    //console.log("loadSessionFromString", XMLstring);

    XMLstring = XMLstring.replace(/(\r\n|\n|\r)/gm,"");

    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(XMLstring, "text/xml");
    var imgTags = xmlDoc.getElementsByTagName("img");
    for (var j = 0; j < imgTags.length; j ++){

        // Delete image nodes from the XML
        imgTags[j].remove();
    }


    XMLstring = XMLToString(xmlDoc).replace(/(\r\n|\n|\r)/gm,"");
    loadSession_controller(XMLstring, resolve);


}


function XMLToString(oXML) {

     //Code for IE
     if (window.ActiveXObject) {
        var oString = oXML.xml; 
        return oString;
     } 

     // Code for Chrome, Safari, Firefox, Opera, etc.
     else {
         return (new XMLSerializer()).serializeToString(oXML);
     }
 }
