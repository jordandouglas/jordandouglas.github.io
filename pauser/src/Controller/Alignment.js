
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


NUCLEOTIDE_COLOURS = {"A" : "#ed1c24", "U" : "#00aeef", "T" : "#1c75bc", "G" : "#00a14b", "C" : "#f7941e", "X" : "#ec008c"}

NUCLEOTIDE_ALIGNMENT = {};
NUCLEOTIDE_ALIGNMENT_NSITES = 0;
NUCLEOTIDE_ALIGNMENT_NSEQS = 0;
MAX_NUCLEOTIDE_ALIGNMENT_NSEQS_UNTIL_MINIMISE = 100;








// Upload an alignment from a URL
function uploadAlignmentFromURL(url, resolve = function() { }){
    
    console.log("Trying to open", url);
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
        
        
          
            if (xhttp == null || xhttp.responseXML == "") return;
            
            parseAlignment(xhttp.responseText, resolve);
           
        }
    };
    xhttp.open("GET", url, true);
    xhttp.send();
    
    
}




// Upload an alignment
function uploadAlignment(fileLocation = null){
	
	document.getElementById("uploadAlignment").addEventListener('change', loadAlignmentFile, false);
	if(fileLocation == null) $("#uploadAlignment").click();
	 
	 function loadAlignmentFile(evt) {

	 	if (evt.target.files.length == 0) return;

		var fileName = evt.target.files[0]; 
			
		var reader = new FileReader();

		// Closure to capture the file information.
		reader.onload = (function(theFile) {
			return function(e) {
				
				if (e == null || e.target.result == "") return;


				parseAlignment(e.target.result);

			};

		})(fileName);

		reader.readAsText(fileName);


		$("#uploadAlignment").val("");

	 }


}



function parseAlignment(align_str, resolve = function() { }){


	NUCLEOTIDE_ALIGNMENT = {};
	NUCLEOTIDE_ALIGNMENT_NSITES = 0;
    

    // Send the validated fasta through to the webassembly module
    parseMSA_controller(align_str.replace(/(\r\n|\n|\r)/gm, "`"), function(parseResult){

        console.log("Parsed MSA", parseResult)

        
        if (parseResult.error == null){

            $(".uploadAlignmentFirst").show(300);
            $(".beforeUploadingAlignment").hide(0);
            
            $(".deleteUponNewAlignment").remove();
            
            
            resetResults();
            

            NUCLEOTIDE_ALIGNMENT = parseResult.alignment;
            NUCLEOTIDE_ALIGNMENT_NSITES = parseResult.nsites;
            NUCLEOTIDE_ALIGNMENT_NSEQS = parseResult.nseqs;

            // $("#alignmentLoading").html(getLoaderTemplate("alignmentLoader", "Loading alignment..."));
            $("#alignmentLoading").show(50);
         

            renderAlignment(); 
            renderPredictionSummary(); 
            renderAdequacyTable();
            plotROC();
            resolve();
            
            
            // If too many sequences then hide the panels which grow with sequence length, as a default
            if (NUCLEOTIDE_ALIGNMENT_NSEQS > MAX_NUCLEOTIDE_ALIGNMENT_NSEQS_UNTIL_MINIMISE) {
            	minimiseSection($("#classifierAdequacyBtn"), false);
            	minimiseSection($("#pauseSitePredictionsBtn"), false);
            	minimiseSection($("#sequencesPanelBtn"), false);
            	
            	alert("That is a lot of sequences! For best performance, it is recommended you run Pauser from the command line. \n\nSee www.polymerase.nz/pauser/about");
            	
            }
            
                    
        
         


        }

        else {


            alert(parseResult.error);
            return;

        }

    });

}




// Construct a table which shows the locations of the pause site predictions in each sequence, and the locations of the true pause sites
function renderPredictionSummary(resolve = function() { }){

	if ($("#pauseSitePredictionsBtn").val() == "+") {
		resolve();
		return;
	}


    console.log("renderPredictionSummary", NUCLEOTIDE_ALIGNMENT);
    
    
    // Add a loading wheel
    $("#predictionSummaryTable").before(getLoaderTemplate("prePredictionsLoader"));
    
    
    // Clear and hide the table
    $("#predictionSummaryTable").html("");
    $("#predictionSummaryTable").hide(0);
    


	$("#predictionSummaryTable").append(getPredictionSummaryHeaderTemplate());

    var odd = true;
    for (var acc in NUCLEOTIDE_ALIGNMENT){

        
        var seq = NUCLEOTIDE_ALIGNMENT[acc];
        //console.log(acc, seq);
        
        $("#predictionSummaryTable").append(getPredictionSummaryRowTemplate(acc.substr(1), odd, seq.known_pauseSites));
        odd = !odd;

    }
    
    
	// Remove loading wheel and show the table
	$("#prePredictionsLoader").remove();
	$("#predictionSummaryTable").show(0);
	
	resolve();
    

}


// Draw the classification adequacy table. Cells will not be populated.
function renderAdequacyTable(){



    // Check if any uploaded sequences actually contain known pause site information
    var thereAreTruePauseSites = false;
    for (var acc in NUCLEOTIDE_ALIGNMENT){
        var seq = NUCLEOTIDE_ALIGNMENT[acc];
        if (seq.known_pauseSites != null) {
            thereAreTruePauseSites = true;
            break;
        }

    }
    if (!thereAreTruePauseSites) {
        $("#classifierAdequacy_nodata").show(100);
        $("#classifierAdequacyTable").hide(0);
        minimiseSection($("#classifierAdequacyBtn"), false);
        minimiseSection($("#pauseSitePredictionsBtn"), NUCLEOTIDE_ALIGNMENT_NSEQS <= MAX_NUCLEOTIDE_ALIGNMENT_NSEQS_UNTIL_MINIMISE);
        $("#ROC_curve_cont").hide();
        return;
    }
    
    minimiseSection($("#pauseSitePredictionsBtn"), false);
    $("#classifierAdequacy_nodata").hide(0);
    $("#ROC_curve_cont").show();
    
    
    
  
    // Create the table
    for (var acc in NUCLEOTIDE_ALIGNMENT){
        var seq = NUCLEOTIDE_ALIGNMENT[acc];
        if (seq.known_pauseSites == null) continue;
        $("#classifierAdequacyTable").append(getClassifierAdequacyRowTemplate(acc.substr(1)));
    }
    
   
     
    // Total row
    $("#classifierAdequacyTable").append(getClassifierAdequacyRowTemplate("Average", true));
    
    
	// Show the table
	$("#classifierAdequacyTable").show(0);



}







// Draw the multiple sequence alignment onto the DOM (not including pause sites)
function renderAlignment(resolve = function() { }){

	
	if ($("#sequencesPanelBtn").val() == "+") {
		resolve();
		return;
	}
	
	
	console.log("renderAlignment", NUCLEOTIDE_ALIGNMENT);
    
    // Update the number of sequences and number of trials per sequence on the DOM
    $("#nSequencesTotal").html(NUCLEOTIDE_ALIGNMENT_NSEQS);


    
    // Add a loading wheel
    $("#conservationMSA").before(getLoaderTemplate("preMSAloader"));
    
    
    // Clear and hide the table
    $("#conservationMSA").html("");
    $("#conservationMSA").hide(0);


	$("#conservationMSA").append(getMSAheaderTemplate(NUCLEOTIDE_ALIGNMENT_NSITES));
    

    for (var acc in NUCLEOTIDE_ALIGNMENT){

        
        var seq = NUCLEOTIDE_ALIGNMENT[acc];
        //console.log(acc, seq);

        appendMSArowTemplate("#conservationMSA", acc.substr(1), seq.MSAsequence, seq.known_pauseSites);


    }

	// Remove loading wheel and show the table
	$("#preMSAloader").remove();
	$("#conservationMSA").show(0);

	resolve();



}





// Add pause sites to the multiple sequence alignment on the DOM
updatePauserResultDisplays = function(){


	// Do not get results if the relevant panels are hidden
	if ($("#classifierAdequacy").is(":hidden") && $("#sequencesPanel").is(":hidden") && $("#pauseSitePredictions").is(":hidden")) return;
    
    getPauserResults_controller(function(result){
    
        NUCLEOTIDE_ALIGNMENT = result.sequences.alignment;
        
        
        $(".positive_class").remove();
        
       // console.log("updatePauserResultDisplays", result);
        
        
        
        // Average precision, recall, and accuracy
        var average_simpol_precision = 0;
        var average_simpol_recall = 0;
        var average_simpol_accuracy = 0;
        var average_nbc_precision = 0;
        var average_nbc_recall = 0;
        var average_nbc_accuracy = 0;
        
        
        // Update classifier tables and alignment 
        var nTruePauseSites = 0;
        var nSimPolPauseSites = 0;
        var nNBCPauseSites = 0;
        var nNucleotides = 0;
        for (var acc in NUCLEOTIDE_ALIGNMENT){
        
            var seq = NUCLEOTIDE_ALIGNMENT[acc];
            
        
        
        	//var simpol_pauseSites_html = seq.simpol_pauseSites.join(", ");
        	//var pauser_pauseSites_html = seq.nbc_pauseSites.join(", ");
    		//$("#simpol_summary_" + acc.substr(1)).html(seq.simpol_pauseSites == null ? "" : simpol_pauseSites_html);
            //$("#nbc_summary_" + acc.substr(1)).html(seq.nbc_pauseSites == null ? "" : pauser_pauseSites_html);
        
        
            // Update the summary table
            $("#simpol_summary_" + acc.substr(1)).html(seq.simpol_pauseSites == null ? "" : convertListToCommaString(seq.simpol_pauseSites));
            $("#nbc_summary_" + acc.substr(1)).html(seq.nbc_pauseSites == null ? "" : convertListToCommaString(seq.nbc_pauseSites));
            
           
            
            // Update the adequacy table
            if (seq.known_pauseSites != null && !$("#classifierAdequacy").is(":hidden")) {
            
                var adequacy_row = $(`[rowid="ad_` + acc.substr(1) + `"]`);
                if (seq.pauser_finished) {
                
                
                    
                    // Update DOM for SimPol accuracy, recall, precision
                    adequacy_row.children(".simpol_recall").html(roundToSF(seq.simpol_recall));
                    adequacy_row.children(".simpol_precision").html(roundToSF(seq.simpol_precision));
                    adequacy_row.children(".simpol_accuracy").html(roundToSF(seq.simpol_accuracy));
                    
                    
                    // Update DOM for NBC accuracy, recall, precision
                    adequacy_row.children(".nbc_recall").html(roundToSF(seq.nbc_recall));
                    adequacy_row.children(".nbc_precision").html(roundToSF(seq.nbc_precision));
                    adequacy_row.children(".nbc_accuracy").html(roundToSF(seq.nbc_accuracy));
                    
                    
                    // For computing mean accuracy, recall, precision
                    nTruePauseSites += seq.known_pauseSites.length;
                    nSimPolPauseSites += seq.simpol_pauseSites.length;
                    nNBCPauseSites += seq.nbc_pauseSites.length;
                    nNucleotides += seq.seq.length;
                    
                    
                    // SimPol average precision, recall, and accuracy
                    average_simpol_recall += seq.simpol_recall * seq.known_pauseSites.length;
                    average_simpol_precision += seq.simpol_precision * seq.simpol_pauseSites.length;
                    average_simpol_accuracy += seq.simpol_accuracy * seq.seq.length;
                    
                    
                    // NBC average precision, recall, and accuracy
                    average_nbc_recall += seq.nbc_recall * seq.known_pauseSites.length;
                    average_nbc_precision += seq.nbc_precision * seq.nbc_pauseSites.length;
                    average_nbc_accuracy += seq.nbc_accuracy * seq.seq.length;
                    
                    
                }
                 
                
            }
            
            if (!$("#sequencesPanel").is(":hidden")) {
            
            
	            // Plot whether each cell is a pause site or not
	            var aln_row = $(`[rowid="` + acc.substr(1) + `"]`);
	            
	            
	            // A SimPol pause site
	            for (var i = 0; i < seq.simpol_pauseSites.length; i++){
	                var siteNum = seq.simpol_pauseSites[i];
	                
	                // Check if it is also an NBC pause site
	                var isNBC = false;
	                for (var j = 0; j < seq.nbc_pauseSites.length; j++){
	                    if (siteNum == seq.nbc_pauseSites[j]){
	                        isNBC = true;
	                        break;
	                    }
	                }
	                
	                if (isNBC) showPauseSiteClassification(aln_row.children(".sequenceTD"), siteNum, "simpol_class_dot NBC_class_dot", "The above position was classified as a pause site by both SimPol and NBC.");
	                else showPauseSiteClassification(aln_row.children(".sequenceTD"), siteNum, "simpol_class_dot", "The above position was classified as a pause site by SimPol.");
	            }
	            
	            
	            
	            // An NBC pause site
	            for (var i = 0; i < seq.nbc_pauseSites.length; i++){
	                var siteNum = seq.nbc_pauseSites[i];
	                
	                // Check if it is also a SimPol pause site
	                var isSimPol = false;
	                for (var j = 0; j < seq.simpol_pauseSites.length; j++){
	                    if (siteNum == seq.simpol_pauseSites[j]){
	                        isSimPol = true;
	                        break;
	                    }
	                }
	                
	                if (!isSimPol) showPauseSiteClassification(aln_row.children(".sequenceTD"), siteNum, "NBC_class_dot", "The above position was classified as a pause site by NBC.");
	            }
	            
            
            }
            

            

        }
        
        
        
        
        // Finalise average precision, recall, and accuracy calculations
        average_simpol_precision /= nSimPolPauseSites;
        average_simpol_recall /= nTruePauseSites;
        average_simpol_accuracy /= nNucleotides;
        average_nbc_precision /= nNBCPauseSites;
        average_nbc_recall /= nTruePauseSites;
        average_nbc_accuracy /= nNucleotides;
        
        
        var average_row = $(`[rowid="ad_Average"]`);
        average_row.children(".simpol_precision").html(roundToSF(average_simpol_precision));
        average_row.children(".simpol_recall").html(roundToSF(average_simpol_recall));
        average_row.children(".simpol_accuracy").html(roundToSF(average_simpol_accuracy));
        
        average_row.children(".nbc_precision").html(roundToSF(average_nbc_precision));
        average_row.children(".nbc_recall").html(roundToSF(average_nbc_recall));
        average_row.children(".nbc_accuracy").html(roundToSF(average_nbc_accuracy));
        
        
        plotROC();
        
    });


}


/*

// Input lists of pause sites
// Output html formats for simpol and pauser predictions. Highlighted if true prediction. Underlined if predicted by both Simpol and Pauser
function getPauseSitePredictionsListHTML(predictedPausesSimpol, predictedPausesPauser, knownPauses = []){


	for (var i = 0; i < predictedPausesSimpol.length; i ++){
	
		for (var j = 0; j < predictedPausesPauser.length; j ++){
		
		
			if (predictedPausesSimpol[i] == predictedPausesPauser[j]) {
				
			
			}
		
		
		
		}
	
	}

}

*/


// Add dots below the sequence showing that a classifier classified it as a pause site
function showPauseSiteClassification(td_ele, pauseSite, classes, title){

    // If this is also an NBC pause site, then add both colours to the circle
    var classes = "positive_class dot " + classes; 
    var x = pauseSite - 0.75;
    var dot = `<span title="` + title + `" class="` + classes + `" style="top:20px; left:` + x + `ch"></span>`
    td_ele.append(dot);

}


function getMSAheaderTemplate(nsites){


    // Add site numberings onto the top row. Every 20th site labelled.
    var index_str = "";
    var tooManySpaces = 0;
    for (var i = 0; i < nsites; i ++){
    
        if ((i+1) % 20 == 1)  {
            tooManySpaces = ("" + (i+1)).length - 1;
            index_str += (i+1)
        }
        else {
            if (tooManySpaces > 0) tooManySpaces --
            else index_str += "&nbsp";
        }

    }

	var row = `

		<tr  class="deleteUponNewAlignment">
			<td title="The accession id of the sequence." style="font-size:16px; text-align:right">Accession&nbsp;&nbsp;</td> 
            <td style="text-align:left;">` + index_str + `</td>
         </tr>
	`;
   

	return row;


} 



function getClassifierAdequacyRowTemplate(name, average = false){
    
    
    var name_html = average ? "<b>" + name + "</b>" : name;
    
    var row = `
        <tr rowid="ad_` + name + `" class="deleteUponNewAlignment" onclick="$('[rowid=ad_` + name + `]').toggleClass('selected')">
            <td rowspan="2">` + name_html + `</td>
            
            <td  style="padding-top:10px">SimPol</td>
            <td title="The probability of a known pause site being classified as one by SimPol, under the current threshold." class="simpol_recall"></td> 
            <td title="The probability of a site classified as a pause site by SimPol actually being one, under the current threshold." class="simpol_precision"></td> 
            <td title="The overall proportion of correct classifications under the current threshold." class="simpol_accuracy"></td> 
            
        </tr>
        <tr rowid="ad_` + name + `" class="deleteUponNewAlignment"  onclick="$('[rowid=ad_` + name + `]').toggleClass('selected')">
            
            <td  style="padding-bottom:10px">NBC</td>
            <td title="The probability of a known pause site being classified as one by NBC under the current threshold." class="nbc_recall"></td> 
            <td title="The probability of a site classified as a pause site by NBC actually being one, under the current threshold." class="nbc_precision"></td> 
            <td title="The overall proportion of correct classifications under the current threshold." class="nbc_accuracy"></td> 
            
        </tr>
    `;
    
    return row;

}



function getPredictionSummaryHeaderTemplate(){

	return `
		 <tr style="color:#0B522D">
		    <td style="min-width:100px;">
		         Accession       
		    </td>
		            
		            
		    <td style="max-width:300px; width:300px;" title="The predicted locations of pause sites, as classified by SimPol.">
		         SimPol    
		    </td>
		            
		            
		    <td style="max-width:300px; width:300px;" title="The predicted locations of pause sites, as classified by the Naive Bayes classifier.">
		         NBC
		    </td>
		            
		        
		    <td style="max-width:300px; width:300px;" title="The known locations of pause sites. These are optionally specified when uploading the .fasta file.">
		         Known pause sites
		    </td>
		            
		</tr>
	`;

}


function getPredictionSummaryRowTemplate(name, odd, known_pauseSites){

    var known_pauseSites_str = "";
    if (known_pauseSites != null){
        known_pauseSites_str = convertListToCommaString(known_pauseSites);
    }
    
    
    
	var row = `
    
        <tr class="deleteUponNewAlignment" onclick="$(this).toggleClass('selected')">
            <td>` + name + `</td>
            <td id="simpol_summary_` + name + `"></td> 
            <td id="nbc_summary_` + name + `"></td> 
            <td>` + known_pauseSites_str + `</td> 
        </tr>
    `;
    
    return row;


} 




function appendMSArowTemplate(appendTo, name, seq, known_pauseSites = null, simpol_pauseSites = null, NBC_pauseSites = null){

    
    simpol_pauseSites = [22, 51, 55];
    NBC_pauseSites = [15,16, 40, 22, 55]
    
    
    var seq_list = seq.split("");
    
    // Annotate the sites by true locations of pause sites
    if (known_pauseSites != null){
        for (var i = 0; i < known_pauseSites.length; i ++){
            var pauseSite = known_pauseSites[i];
            seq_list[pauseSite-1] = `<span class="truePauseSite" title="According to the uploaded .fasta file, this site is a pause site.">` + seq_list[pauseSite-1] + `</span>`;
        }
    }
    
 
   
    
    var row = `
    
        <tr class="deleteUponNewAlignment" rowid="` + name + `">
            <td style="font-size:16px; text-align:right"> ` + name + `&nbsp;&nbsp;</td> 
            <td class="sequenceTD" style="position:relative; text-align:left;">` + seq_list.join("") + `</td>
        </tr>
        
    `;
    $(appendTo).append(row);
    
    
    
} 



// Assumes input list is sorted
// Input: numeric array: [1,2,5,6,7,8,9,10]
// Output: string: "1,2,5-10"
function convertListToCommaString(list){

    if (typeof list === "string") list = list = JSON.parse("[" + list + "]");
    //console.log("Parsing list", list);
    var string = "";
    for (var i = 0; i < list.length; i ++){
        var thisNum = list[i];
        var nextNum = list[i+1];

        // If the next number is not the following integer then move on 
        if (nextNum == null || thisNum+1 != nextNum){
            string += nextNum != null ? (thisNum + ", ") : thisNum;
            continue;
        }

        // Otherwise we keep looping intil the next integer is not 1 greater than this one
        var incrSize = 1;
        while (i < list.length-1){
            if (thisNum + incrSize + 1 != list[i+incrSize + 1]) break;
            incrSize++;
        }
        nextNum = list[i+incrSize];
        i += incrSize;
        string += i < list.length-1 ? (thisNum + "-" + nextNum + ", ") : (thisNum + "-" + nextNum);

    }
    return string;


}



// Input: string: "1,2,5-10"
// Output: numeric array: [1,2,5,6,7,8,9,10]
function convertCommaStringToList(string){


    var list = [];
    var bits = string.split(",");
    for (var i = 0; i < bits.length; i ++){
        bit = bits[i].trim();
        if (bit == "") continue;

        if (bit.match("-")){
            var lowerUpper = bit.split("-");
            var lower = parseFloat(lowerUpper[0].trim());
            var upper = parseFloat(lowerUpper[1].trim());
            if (isNaN(lower) || isNaN(upper)) continue; // Don't add non-numbers
            for (var j = lower; j <= upper; j ++){
                if (list.indexOf(j) == -1) list.push(j); // Don't add duplicates
            } 

        }else {
            var floatBit = parseFloat(bit);
            if (!isNaN(floatBit) && list.indexOf(floatBit == -1)) list.push(floatBit); // Don't add non-numbers or duplicates
        }

    }

    function sortNumber(a,b) {
            return a - b;
    }


    // TODO: remove duplicates
    return list.sort(sortNumber);


}


