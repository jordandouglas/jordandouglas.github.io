
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





function beginPauser(resume_simulation = false){

    console.log("Beginning Pauser")


    // Change the description of the begin Pauser button
    $("#beginPauser").val("Stop Pauser");
    $("#beginPauser").attr("onclick", "stop_controller()");




    // Initialise the simulation
    startPauser_controller(resume_simulation, function() {

        // Change the description of the begin Pauser button
        $("#beginPauser").val("Resume Pauser");
        $("#beginPauser").attr("onclick", "beginPauser(true)");

    });




}


function resetResults(){

    // Change the description of the begin Pauser button
    $("#beginPauser").val("Begin Pauser");
    $("#beginPauser").attr("onclick", "beginPauser(false)");
    $("#beginPauser").css("background-color", "");
    $("#beginPauser").css("cursor", "");
     
     
    // Clear the progress bar
    var canvas = document.getElementById("progressSimCanvas");
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    
    $(".beginPauserFirst").hide(0);
    $(".finishPauserFirst").hide(0);
    $("#nTrialsTotal").html(0);
    $("#currentSequenceProgress").html(0);
    $("#nTrialsComplete").html(0);
    $("#nSequencesComplete").html(0);
    

}



function downloadClassifications(){

    getResultsFileString_controller(function(result) {
    
        console.log("downloadClassifications", result);
        if (result.output != "" && result.output != null){
            var output = result.output.split("|").join("\n"); // Replace the |'s with linebreaks
            download("PauserResults.csv", output);
        
        }
        
    
    
    });


}





function download(filename, text) {


    // Open in new window
    if (filename == null || filename == ""){

        var wnd = window.open("data:text/html," + encodeURIComponent(text),  "_blank", "width=800,height=500");
        wnd.document.title = 'testing';
        wnd.focus();

    }

    // Download file
    else{

        var pom = document.createElement('a');
        pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        pom.setAttribute('download', filename);


        if (document.createEvent) {
            var event = document.createEvent('MouseEvents');
            event.initEvent('click', true, true);
            pom.dispatchEvent(event);
        }
        else {
            pom.click();
        }
    }
}