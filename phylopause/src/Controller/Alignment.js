
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



function parseAlignment(align_str){



	NUCLEOTIDE_ALIGNMENT = {};
	NUCLEOTIDE_ALIGNMENT_NSITES = 0;
    

    // Send the validated fasta through to the webassembly module
    parseMSA_controller(align_str.replace(/(\r\n|\n|\r)/gm, "|"), function(parseResult){

        //console.log("Parsed MSA", parseResult)

        
        if (parseResult.error == null){

            $(".uploadAlignmentFirst").show(300);
            $(".beforeUploadingAlignment").hide(0);


            NUCLEOTIDE_ALIGNMENT = parseResult.alignment;
            NUCLEOTIDE_ALIGNMENT_NSITES = parseResult.nsites;
            NUCLEOTIDE_ALIGNMENT_NSEQS = parseResult.nseqs;

            // $("#alignmentLoading").html(getLoaderTemplate("alignmentLoader", "Loading alignment..."));
            $("#alignmentLoading").show(50);
         

            renderAlignment(); 

         


        }

        else {


            alert(parseResult.error);
            return;

        }



    });



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
        

        $("#conservationMSA").append(getMSArowTemplate(acc.substr(1), seq.weight, seq.MSAsequence));


    }


	resolve();



}


// Add pause sites to the multiple sequence alignment on the DOM
renderPauseSitesOnAlignment = function(){



    getPauseSites_controller(function(pauseSites){


       // console.log("pauseSites", pauseSites);
        for (var acc in pauseSites){

            var row = $(`[rowid="` + acc.substr(1) + `"]`);


            //console.log(acc, "row", row, row.children(`[colid]`));

            for (var i = 0; i < pauseSites[acc].length; i++){

                var siteNum = pauseSites[acc][i];
                var site = row.children(`[colid="` + siteNum + `"]`);
                //console.log(siteNum, "site", site);
                site.css("background-color", "black");
                site.addClass("nucleotideHighlighted");


                $("#e" + siteNum).html("*");
                
            }



        }


    });



}






function getMSAheaderTemplate(nsites){


    var evidenceRow = `

     <tr style="font-size:16px">
            <td><td>
            <td title="Strength of evidence of a pause site." style="text-align:right">Evidence:</td> 


    `;

	var row = `


        

		<tr style="font-size:16px">
			<td title="The weight of the sequence, calculated from the phylogenetic tree." style="text-align:right;">Weight<td>
			<td title="The name of the sequence." style="text-align:right">Sequence&nbsp;&nbsp;</td> 

	`;


	for (var i = 0; i < nsites; i ++){
    

		row += `<td style="width: 20px;text-align:center; position:relative">`;

		if ((i+1) % 10 == 1)  row += `<span style="position:absolute; top:0; left:2">` + (i+1) + `</span>`;

		row += `</td>`;

        evidenceRow += `<td id="e` + (i+1) + `"></td>`;


	}


	return evidenceRow + `</tr>` + row + `</tr>`;


} 


function getMSArowTemplate(name, weight, seq){


	var row = `

		<tr rowid="` + name + `">
			<td style="font-size:16px; text-align:center; color:#808D82;">` + weight + `<td>
			<td style="font-size:16px; text-align:right"> ` + name + `&nbsp;&nbsp;</td> 

	`;

    
    var baseIndex = 1;
	for (var i = 0; i < seq.length; i ++){

		var col = NUCLEOTIDE_COLOURS[seq[i]];
        

		row += `<td colid="` + (i+1) + `" style="width: 20px;text-align:center; background-color:` + col + `;"`;

        if (seq[i] != "-") {
            row += `title="Site ` + baseIndex + `"`;
            baseIndex ++;
        }
        row += `>` + seq[i] + `</td>`;


        

	}


	return row + `</tr>`;


} 