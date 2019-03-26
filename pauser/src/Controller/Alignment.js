﻿
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

        //console.log("Parsed MSA", parseResult)

        
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
         


        }

        else {


            alert(parseResult.error);
            return;

        }

    });

}




// Construct a table which shows the locations of the pause site predictions in each sequence, and the locations of the true pause sites
function renderPredictionSummary(){


    console.log("renderPredictionSummary", NUCLEOTIDE_ALIGNMENT);

    var odd = true;
    for (var acc in NUCLEOTIDE_ALIGNMENT){

        
        var seq = NUCLEOTIDE_ALIGNMENT[acc];
        //console.log(acc, seq);
        
        $("#predictionSummaryTable").append(getPredictionSummaryRowTemplate(acc.substr(1), odd, seq.known_pauseSites));
        odd = !odd;

    }

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
        return;
    }
    
    
    
    // Create the table
    $("#classifierAdequacyTable").show(100);
    $("#classifierAdequacy_nodata").hide(0);
    
  
    
    for (var acc in NUCLEOTIDE_ALIGNMENT){
        var seq = NUCLEOTIDE_ALIGNMENT[acc];
        if (seq.known_pauseSites == null) continue;
        $("#classifierAdequacyTable").append(getClassifierAdequacyRowTemplate(acc.substr(1)));
    }
    
   
     
    // Total row
    $("#classifierAdequacyTable").append(getClassifierAdequacyRowTemplate("Average", true));



}




// Draw the multiple sequence alignment onto the DOM (not including pause sites)
function renderAlignment(resolve = function() { }){

	
	console.log("renderAlignment", NUCLEOTIDE_ALIGNMENT);
    
    // Update the number of sequences and number of trials per sequence on the DOM
    $("#nSequencesTotal").html(NUCLEOTIDE_ALIGNMENT_NSEQS);



    getNtrials_controller(function(result) {
         $("#nTrialsTotal").html(result.ntrials);
    });


	$("#conservationMSA").append(getMSAheaderTemplate(NUCLEOTIDE_ALIGNMENT_NSITES));
    

    for (var acc in NUCLEOTIDE_ALIGNMENT){

        
        var seq = NUCLEOTIDE_ALIGNMENT[acc];
        //console.log(acc, seq);

        appendMSArowTemplate("#conservationMSA", acc.substr(1), seq.MSAsequence, seq.known_pauseSites);


    }


	resolve();



}





// Add pause sites to the multiple sequence alignment on the DOM
updatePauserResultDisplays = function(){


    
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
            
        
            // Update the summary table
            $("#simpol_summary_" + acc.substr(1)).html(seq.simpol_pauseSites == null ? "" : convertListToCommaString(seq.simpol_pauseSites));
            $("#nbc_summary_" + acc.substr(1)).html(seq.nbc_pauseSites == null ? "" : convertListToCommaString(seq.nbc_pauseSites));
            
            // Update the adequacy table
            if (seq.known_pauseSites != null) {
            
                
                
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
            <td class="simpol_recall"></td> 
            <td class="simpol_precision"></td> 
            <td class="simpol_accuracy"></td> 
            
        </tr>
        <tr rowid="ad_` + name + `" class="deleteUponNewAlignment"  onclick="$('[rowid=ad_` + name + `]').toggleClass('selected')">
            
            <td  style="padding-bottom:10px">NBC</td>
            <td class="nbc_recall"></td> 
            <td class="nbc_precision"></td> 
            <td class="nbc_accuracy"></td> 
            
        </tr>
    `;
    
    return row;

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
            seq_list[pauseSite-1] = `<b title="According to the uploaded .fasta file, this site is a pause site." style="color:red">` + seq_list[pauseSite-1] + `</b>`;
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


