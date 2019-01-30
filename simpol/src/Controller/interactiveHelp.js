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



/*
    Contains a series of dialogs to guide the user through the website
    Used in conjunction with biophys journal publication examples
*/




function begin_tutorial(tut_id = null){

    if (tut_id == null) return;
    console.log("Beginning tutorial", tut_id)
    
    
    switch(tut_id){
    
        case "biophys1":
            begin_biophys1();
            break;
    
        case "biophys2":
            begin_biophys2();
            break;  
    
    }



}

// Perform 30 transcription elongation simulations of the first 50 nt of the E. coli lacZ gene.
function begin_biophys1(){
    var sessionFileLocation = "http://www.polymerase.nz/simpol/about/Examples/biophys1.xml";
    var toDoAfterLoadSession = function() {
        
        
        
        addTutorialTemplate("SimPol: An engine for visualisation, simulation, and inference of RNA polymerase kinetics", 
        "Example 1: simulating transcription elongation.",
        `Welcome to SimPol. This series of examples is complementary to the above article. <br><br> 
        
        To begin the simulation, press the <img id='startTrials' src='../src/Images/dice.png' style='vertical-align: middle; width:20px; height:20px;'>
        button on the far left. See the plots further down this page to visualise the simulation results.`,
        "This example was loaded from: <a style='color:#008cba' href='http://www.polymerase.nz/simpol/?biophys=1'>www.polymerase.nz/simpol/?biophys=1</a>");
    
       
        // Add a glow around the simulate button
        var btn = $("#simulateBtn");

        var intervalID = window.setInterval(function() {  
            btn.toggleClass('glowing');
        }, 1000);
        
        
       
        
        window.setTimeout(function(){
        
            btn.click(function(){
                window.clearInterval(intervalID);
                btn.removeClass("glowing");
                btn.unbind('click');
            });
        
        }, 50);
        
        
    };
    

    loadSessionFromURL(sessionFileLocation, toDoAfterLoadSession);

}




// Visualise the simulated change in RNA structure during transcription elongation.
function begin_biophys2(){


}




function addTutorialTemplate(tutorialName, tutorialSubtitle, tutorialMessage, tutorialFootnote){

    closeAllDialogs();
    
    $("#main").css("opacity", 0.5);
    $("#mySidenav").css("opacity", 0.5);
    
    var popupHTML = getTutorialDialogTemplate();
    popupHTML = popupHTML.replace("XX_tutname_XX", tutorialName);
    popupHTML = popupHTML.replace("XX_tutorialSubtitle_XX", tutorialSubtitle);
    popupHTML = popupHTML.replace("XX_tutmessage_XX", tutorialMessage);
    popupHTML = popupHTML.replace("XX_tutfootnote_XX", tutorialFootnote);
    
    $(popupHTML).appendTo('body');
    
    window.setTimeout(function(){
        
        $("#main").click(function(){
            closeTutorialDialog();
        });
        
        $("#mySidenav").click(function(){
            closeTutorialDialog();
        });
        
    }, 50);


}


function closeTutorialDialog(){
    
    $("#mySidenav").unbind('click');
    $("#main").unbind('click');
    $("#tutorialDialog").remove();
    $("#main").css("opacity", 1);
    $("#mySidenav").css("opacity", 1);
    
}


function getTutorialDialogTemplate(){



    return `
        <div id='tutorialDialog' style='background-color:008cba; padding: 10 10; position:fixed; width: 36vw; left:32vw; top:10vh; z-index:5' plotNum="XX_plotNum_XX">
            <div style='background-color: white; padding: 15 15; text-align:left; font-size:15; font-family:Arial; overflow-y:auto'>
                <b style='font-size: 22px'> XX_tutname_XX </b>
                <span class="blueDarkblueCloseBtn" title="Close" style="right: 15px; top: 4px;" onclick='closeTutorialDialog()'>&times;</span>
                <div style='padding-top: 10px; font-size:18px;'> XX_tutorialSubtitle_XX </div>
                
                
                <div style='padding:20; font-size:14px'>
                    XX_tutmessage_XX
                </div>
                
                
                <span style='vertical-align:bottom; padding-left:20; padding-right:20; font-size:12px'>
                    XX_tutfootnote_XX
                </span>
                

                <span style="float:right">
                    <input type=button class="operation" onClick="closeTutorialDialog()" value='OK' title="OK" style="width:60px;"></input>
                </span>
            </div>
        </div>
    `;





}
