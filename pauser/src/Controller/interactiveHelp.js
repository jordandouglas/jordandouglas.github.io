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
    Used in conjunction with bioinf journal publication examples
*/

function begin_tutorial(tut_id = null){

    if (tut_id == null) return;
    console.log("Beginning tutorial", tut_id)
    
    
    switch(tut_id){
    
            
        // Bioinformatics journal examples
        case "bioinf1":
            window.location.replace("../simpol/?bioinf=1");
            break;
    
        case "bioinf2":
            window.location.replace("../simpol/?bioinf=2");
            break;  
            
            
        case "bioinf3":
            window.location.replace("../simpol/?bioinf=3");
            break; 
            
            
        case "bioinf4":
            begin_bioinf4();
            break; 
            
            
        case "bioinf5":
            window.location.replace("../simpol/?bioinf=5");
            break; 
            
 
            
            
            
        case "expauser":
            begin_pauserExample();
            break; 
            
    
    }



}




function begin_bioinf4(){


    var fastaFileName = "bioinf4.fasta";
    var fastaFileLocation = "http://www.polymerase.nz/pauser/about/Examples/" + fastaFileName;
    
    addTutorialTemplate("SimPol: An engine for visualisation, simulation, and inference of RNA polymerase kinetics", 
    "Example 4: predicting transcriptional pause sites.",
    `Welcome to Pauser. This series of examples is complementary to the above article. <br><br> 
    
    To predict the locations of pause sites in the loaded sequences, press the glowing 'Begin Pauser' button below. This will predict the locations using 
    both SimPol and a Naive Bayes classifier (NBC). Because the locations of pause sites are already known<sup>1</sup>, the recall, precision, accuracy, and a ROC curve can be computed.
     <br><br>
    <sup>1</sup>Larson, Matthew H., et al. "A pause sequence enriched at translation start sites drives transcription dynamics in vivo." Science 344.6187 (2014): 1042-1047`,
    
    "This example was loaded from <a style='color:#0B522D' href='http://www.polymerase.nz/pauser/?bioinf=4'>www.polymerase.nz/pauser/?bioinf=4</a>");

   
    // Add a glow around the simulate button
    var btn = $("#beginPauser");

    var intervalID = window.setInterval(function() {  
        btn.toggleClass('glowing');
    }, 750);
   
    
    window.setTimeout(function(){
    
        btn.click(function(){
            window.clearInterval(intervalID);
            btn.removeClass("glowing");
            btn.unbind('click');
        });
    
    }, 50);



    
    uploadAlignmentFromURL(fastaFileLocation);

}




function begin_pauserExample(){


    var fastaFileName = "bioinf4.fasta";
    var fastaFileLocation = "http://www.polymerase.nz/pauser/about/Examples/" + fastaFileName;
    
    addTutorialTemplate("Evaluating the prediction accuracy SimPol and NBC", 
    "Pauser example session.",
    `To predict the locations of pause sites in the loaded sequences, press the glowing 'Begin Pauser' button below. This will predict the locations using 
    both SimPol and a Naive Bayes classifier (NBC). Because the locations of pause sites are already known, recall, precision, accuracy and a ROC curve can be computed.`,
    "");

   
    // Add a glow around the simulate button
    var btn = $("#beginPauser");

    var intervalID = window.setInterval(function() {  
        btn.toggleClass('glowing');
    }, 750);
   
    
    window.setTimeout(function(){
    
        btn.click(function(){
            window.clearInterval(intervalID);
            btn.removeClass("glowing");
            btn.unbind('click');
        });
    
    }, 50);



    
    uploadAlignmentFromURL(fastaFileLocation);

}







function addTutorialTemplate(tutorialName, tutorialSubtitle, tutorialMessage, tutorialFootnote){

    closeDialogs();
	openDialog();
	
	
	var popupHTML = getDialogTemplate(tutorialName, tutorialSubtitle, "800px");
		
		
	$(popupHTML).appendTo('body');
	
    var innerHTML = getTutorialDialogTemplate();
    innerHTML = innerHTML.replace("XX_tutmessage_XX", tutorialMessage);
    innerHTML = innerHTML.replace("XX_tutfootnote_XX", tutorialFootnote);
    
    $("#dialogBody").html(innerHTML);
    

}



function getTutorialDialogTemplate(){



    return `
    
    		<div style="text-align:left">
                <div style='padding:20; font-size:16px'>
                    XX_tutmessage_XX
                </div>
                
                
                <span style='vertical-align:bottom; padding-left:20; padding-right:20; font-size:14px'>
                    XX_tutfootnote_XX 
                </span>
                

                <span style="float:right">
                    <input type=button class="button pauser" onClick="closeDialogs()" value='OK' title="OK" style="width:60px;"></input>
                </span>
            </div>

    `;


}


function openDialog(){


	$("#main").css("opacity", 0.5);
	$("#mySidenav").css("opacity", 0.5);

	window.setTimeout(function(){
		
	
		
		$(".dialog_inner").click(function(event){
			console.log("THE PROPAGATION HAS BEEN SEVERED");
			event.stopPropagation();
		});
		
		$("body").click(function(){
			closeDialogs();
		});
		

		
	}, 50);
	
}


function closeDialogs(){

	
	$("body").unbind('click');
	$(".dialog_inner").unbind('click');
	$(".dialog_cont").remove();
	$("#main").css("opacity", 1);
	$("#mySidenav").css("opacity", 1);
	
	
}




function getDialogTemplate(header, subtitle = "", width = "1000px"){


	if (IS_MOBILE) width = "90%";

	return `
		<div class="dialog_cont pauser">
			<div class="dialog_outer pauser" style='width:` + width + `;'>
				<div class="dialog_inner pauser">
					<span style='font-size: 26px'>` + header + `</span>
					<span class="blueDarkblueCloseBtn pauser" title="Close" onclick='closeDialogs()'>&times;</span>
					<div style='padding:2; font-size:18px;'>` + subtitle + `</div>
	
					<div id="dialogBody">
					
					 	 <table  id="dialogLoader" title="Loading...">
	                        <tr>
	                            <td>
	                                <div class="loader"></div> 
	                            </td>
	                            <td>
	                                Loading...
	                            </td>
	                        </tr>
	                    </table>
						
					</div>
					
	
				</div>
			</div>
		</div>
	`;



}


