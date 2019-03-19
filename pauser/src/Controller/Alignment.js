
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

            NUCLEOTIDE_ALIGNMENT = parseResult.alignment;
            NUCLEOTIDE_ALIGNMENT_NSITES = parseResult.nsites;
            NUCLEOTIDE_ALIGNMENT_NSEQS = parseResult.nseqs;

            // $("#alignmentLoading").html(getLoaderTemplate("alignmentLoader", "Loading alignment..."));
            $("#alignmentLoading").show(50);
         

            renderAlignment(); 
            renderPredictionSummary(); 
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
        
        $("#predictionSummaryTable").append(getPredictionSummaryRowTemplate(acc.substr(1), odd, seq.true_pauseSites));
        odd = !odd;

    }



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

        appendMSArowTemplate("#conservationMSA", acc.substr(1), seq.MSAsequence, seq.true_pauseSites);


    }


	resolve();



}




// Add pause sites to the multiple sequence alignment on the DOM
renderPauseSitesOnAlignment = function(){


    getPauseSites_controller(function(result){


        //console.log("renderPauseSitesOnAlignment", result);
        $(".positive_class").remove();
        var simpol_pause_sites = result.simpol_pause_sites;

        // Plot whether each cell is a pause site or not
        for (var acc in simpol_pause_sites){

            var row = $(`[rowid="` + acc.substr(1) + `"]`);


            for (var i = 0; i < simpol_pause_sites[acc].length; i++){
            
                var siteNum = simpol_pause_sites[acc][i];
                addSimPolPauseSite(row.children(".sequenceTD"), siteNum);
                
            }

        }

    });



}

 // Add dots below the sequence showing that SimPol classified it as a pause site
function addSimPolPauseSite(td_ele, pauseSite){

    
    // If this is also an NBC pause site, then add both colours to the circle
    var classes = "positive_class dot simpol_class_dot";
    var title = "The above position was classified as a pause site by SimPol."
    
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


function getPredictionSummaryRowTemplate(name, odd, true_pauseSites){

    var true_pauseSites_str = "";
    if (true_pauseSites != null){
        true_pauseSites_str = convertListToCommaString(true_pauseSites);
    }
    
    
    
	var row = `
    
        <tr class="deleteUponNewAlignment" onclick="$(this).toggleClass('selected')">
            <td>` + name + `</td>
            <td></td> 
            <td></td> 
            <td>` + true_pauseSites_str + `</td> 
        </tr>
    `;
    
    return row;


} 




function appendMSArowTemplate(appendTo, name, seq, true_pauseSites = null, simpol_pauseSites = null, NBC_pauseSites = null){

    
    simpol_pauseSites = [22, 51, 55];
    NBC_pauseSites = [15,16, 40, 22, 55]
    
    
    var seq_list = seq.split("");
    console.log("seq_list", seq_list);
    
    // Annotate the sites by true locations of pause sites
    if (true_pauseSites != null){
        for (var i = 0; i < true_pauseSites.length; i ++){
            var pauseSite = true_pauseSites[i];
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
    
    
    return;
    
    
    
    // NBC pause sites (but not classified by SimPol too)
    if (NBC_pauseSites != null){
        var td_ele = $(`[rowid="` + name + `"]`).children(".sequenceTD");
        for (var i = 0; i < NBC_pauseSites.length; i ++){
            var pauseSite = NBC_pauseSites[i];
            
            
            
            // If this is also a SimPol pause site, then continue because it has already been plotted
            if (simpol_pauseSites != null){
                var isSimpolPause = false;
                for (var j = 0; j < simpol_pauseSites.length; j ++){
                    var pauseSite_SimPol = simpol_pauseSites[j];
                    if (pauseSite_SimPol == pauseSite){
                        isSimpolPause = true;
                        break;
                    }
                }
                if (isSimpolPause) continue;
            }
            
            
            var x = (pauseSite-1) - 0.75;
            var dot = `<span title="The above position was classified as a pause site by NBC." class="dot NBC_class_dot" style="top:20px; left:` + x + `ch"></span>`
            td_ele.append(dot);
        }
    }
    
    
    
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


