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

MFE_JS = {};


MFE_JS.MFE_W = {};
MFE_JS.MFE_V = {};

// MFE algorithm based on:
//
// Zuker, Michael, and Patrick Stiegler. 
// "Optimal computer folding of large RNA sequences using thermodynamics and auxiliary information." 
// Nucleic acids research 9.1 (1981): 133-148.

 MFE_JS.getMFESequenceBonds_WW = function(resolve = function() { }, msgID = null){


	var result = MFE_JS.calculateMFESequence_WW(WW_JS.currentState);

	//console.log("Energy", result["energy"]);

	var graphInfo = null;
	if (result != null && result["structure"] != ""){
		var structure = result["structure"];
		var primerSeq = result["primerSeq"];
		graphInfo = MFE_JS.getSecondaryStructureBonds_WW(WW_JS.currentState, primerSeq, structure);
	}
	
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(graphInfo));
	}else{
		resolve(graphInfo);
	}
	

}







 MFE_JS.calculateMFESequence_WW = function(state){
	

	// Calculate secondary structure for previous nbpToFold only
	var primerSeq = "";
	var startAt = Math.max(1, state["leftMBase"] - PARAMS_JS.PHYSICAL_PARAMETERS["nbpToFold"]["val"]);
	//for (var i = startAt; i < state["leftMBase"] - PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]; i ++){
	for (var i = startAt; i < state["leftMBase"]; i ++){
			if (primerSequence[i] == null) break;
			primerSeq += primerSequence[i]["base"];
	}

	if (SEQS_JS.all_sequences[sequenceID]["primer"].substring(2) == "DNA" || SEQS_JS.all_sequences[sequenceID]["primer"] == "dsRNA" || primerSeq == "") return {structure: "", primerSeq: "", energy: 0};
		
	
	if (MFE_JS.MFE_W[primerSeq] == null){
	
		MFE_JS.init_MFE_WW(primerSeq);

		// Want to find W(1, L)
		for (var k = 6; k <= primerSeq.length; k ++){
			//console.log("k = ", k);
			MFE_JS.calc_MFE_WW(primerSeq, k);
			//console.log("MFE_JS.MFE_W", MFE_JS.MFE_W, "MFE_JS.MFE_V", MFE_JS.MFE_V)
		}
	
	}
		//console.log("MFE_JS.MFE_W", MFE_JS.MFE_W, "MFE_JS.MFE_V", MFE_JS.MFE_V)


	var structure = MFE_JS.MFE_W[primerSeq]["structure"];


	// Add the ignores bases to the structure string as unbound bases
	var unboundStructure = ""
	for (var i = 1; i < startAt; i ++) unboundStructure += ".";
	structure = unboundStructure + structure;  


	return {structure: structure, primerSeq: primerSeq, energy: MFE_JS.MFE_W[primerSeq]["mfe"] / FE_JS.RT};


	

	
}


 MFE_JS.getSecondaryStructureBonds_WW = function(state, primerSeq, structureString){


	console.log(structureString);
	
	// Create bond objects between each consecutive base
	var bonds = [];
	var vertices = [];
	var startX = 3 * HTMLobjects["pol"]["x"] / 4;
	var startY = 300;
	vertices.push({src: "5", startX: startX, startY: startY});//, fx: primerSequence[0]["x"], fy: primerSequence[0]["y"]});
	bonds.push({ source: 0, target: 1 });

	var toHide = ["#m0"];
	
	//for (var i = 1; i < state["leftMBase"] - PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]; i ++){
	for (var i = 1; i < state["leftMBase"]; i ++){
		bonds.push({ source: i, target: i+1 });
		vertices.push({src: primerSequence[i]["src"], startX: startX, startY: startY});
		toHide.push("#" + primerSequence[i]["id"]);
		
	}
	
	//var anchoredNode = primerSequence[state["leftMBase"] - PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]];
	var anchoredNode = primerSequence[state["leftMBase"]];

	vertices.push({src: anchoredNode["src"], fx: anchoredNode["x"] - startX, fy: anchoredNode["y"] - 100 - startY, fixed: true, startX: startX, startY: startY });
	//$("#" + anchoredNode["id"]).hide(true);

	
	// Recursively add bonds as specified by the structure
	var index = MFE_JS.findBondsRecurse_WW(0, structureString, bonds);
	//while (index != "DONE" && index < structureString.length) findBondsRecurse(index, structureString, bonds);
	
	
	
	// Set indices of bond numbers to reflect the list of vertices
	for (var bondNum = structureString.length - primerSeq.length; bondNum < bonds.length; bondNum++){
		//bonds[bondNum]["source"] --;
		//bonds[bondNum]["target"] --;
		
		
	}
	
	console.log("bonds", bonds, "vertices", vertices);
	
	
	

	
	return {bonds: bonds, vertices:vertices, toHide:toHide};
	


	
	
}


 MFE_JS.findBondsRecurse_WW = function(index, structureString, bonds){
	
	while (structureString[index] == ".") index++;
	
	
	if (structureString[index] == "("){
		var bracketClosing = MFE_JS.findBondsRecurse_WW(index + 1, structureString, bonds);
		bonds.push({source: index+1, target: bracketClosing+1, bp:true});
		console.log("Adding bond between", index+1, "and", bracketClosing+1);
		index = bracketClosing + 1;
		while (structureString[index] == ".") index++;
		
		if (structureString[index] == "(") {
			return MFE_JS.findBondsRecurse_WW(index, structureString, bonds)
		}
		
	}

	
	if (structureString[index] == ")") return index;

	console.log("DONE");
	return "DONE";
	
	
	
}



MFE_JS.init_MFE_WW = function(seq){
	
	// Fill in tables for all observed k-nt substrings where k = 1,2,3,4
	var kDots = "";
	for (var k = 1; k <=4; k ++){
		kDots += ".";
		
		for (var i = 0; i < seq.length-k+1; i++){

			var subseq = seq.substring(i,i+k);
			
			// W table
			if (MFE_JS.MFE_W[subseq] == null){
				MFE_JS.MFE_W[subseq] = {mfe: 0, structure: kDots};
			}
			
			// V table
			if (MFE_JS.MFE_V[subseq] == null){
				MFE_JS.MFE_V[subseq] = {mfe: Infinity, structure: kDots};
			}
			
			
		}
	
		
	}
	
	// Fill in tables for all observed 5-nt substrings
	for (var i = 0; i < seq.length-4; i++){
		
		var subseq = seq.substring(i,i+5);
		var Si = subseq[0];
		var Sj = subseq[4];
		
		
		// W table
		if (MFE_JS.MFE_W[subseq] == null){
			MFE_JS.MFE_W[subseq] = {mfe: 0, structure: "....."};
		}
		
		// V table
		if (MFE_JS.MFE_V[subseq] == null){
			if ( (Si == "U" && Sj == "A") || (Si == "A" && Sj == "U") ) MFE_JS.MFE_V[subseq] = {mfe: 8, structure: "(...)"};
			else if ( (Si == "G" && Sj == "C") || (Si == "C" && Sj == "G") ) MFE_JS.MFE_V[subseq] = {mfe: 8.4, structure: "(...)"};
			else MFE_JS.MFE_V[subseq] = {mfe: 0, structure: "....."};
		}
		
	}

}


 MFE_JS.calc_MFE_WW = function(seq, k){
	
	
	// Fill in tables for all observed k-nt substrings
	for (var i = 0; i < seq.length-k+1; i++){
	
		var j = i+k;
		var subseq = seq.substring(i,j);
		var Si = subseq[0];
		var Sj = subseq[k-1];
		
		//console.log("CURRENT SUBSEQ", subseq)
		
		
		// V table
		if (MFE_JS.MFE_V[subseq] == null){
			
			
			// If not a basepair then set this structure's mfe to infinity
			if (correctPairs[Si + Sj] == null && !((Si == "G" && Sj =="U") || (Si == "U" && Sj =="G"))) {
				MFE_JS.MFE_V[subseq] = {mfe: Infinity};
			}else{
			
			
				// Case 1: i and j basepair with each other, no basepairs in between them (ie. a hairpin loop)
				var struct1 = "(";
				for (var ki = 1; ki <= k-2; ki++) struct1 += ".";
				struct1 += ")";
				var energy1 = MFE_JS.getFreeEnergyOfHairpin_WW(subseq); // Get energy of the hairpin
				var str1 = {mfe: energy1, structure: struct1, from: 1};
			
			
				// Case 2: i and j basepair with each other and do does i' and j' (for some i < i' < j' < j) but only these two basepairs
				var str2 = {mfe: Infinity};
				for (var iPrime = i+1; iPrime < j-2; iPrime++){
					for (var jPrime = iPrime+1; jPrime < j-1; jPrime++){
					
						var Siprime = seq[iPrime];
						var Sjprime = seq[jPrime];
					
						//console.log("Do", Siprime, Sjprime, "match", Si + Siprime + Sjprime + Sj, FE_JS.BasePairParams[Si + Siprime + Sjprime + Sj]);
						if (correctPairs[Siprime + Sjprime] == null) continue;
					
						var basePairEnergy = MFE_JS.getFreeEnergyOfFace_WW(i, j-1, iPrime, jPrime, seq); 
						//console.log("Free energy of face", basePairEnergy);
						var obj2a = MFE_JS.MFE_V[seq.substring(iPrime, jPrime+1)];
					
					
						if (basePairEnergy + obj2a["mfe"] < str2["mfe"]){
						
							var structString = "("; // Basepair between i and j
							for (var ki = i+1; ki < iPrime; ki++) structString += "."; // No basepairs
							structString += obj2a["structure"]; // MFE structure of bases between i' and j'
							for (var ki = jPrime+1; ki < j-1; ki++) structString += "."; // No basepairs
							structString += ")"; // Basepair between i and j
						
							//console.log("subseq", subseq, subseq.length, "str", structString, structString.length, obj2a["structure"]);
							str2 = {mfe: basePairEnergy + obj2a["mfe"], structure: structString, from: 2}
						
						}

					}
				}
			
			
			
			
				// Case 3: i and j basepair with each other and so do at least 2 other pairs
				var str3 = {mfe: Infinity};
				for (var iPrime = i+2; iPrime < j-2; iPrime++){
				
					var obj3a = MFE_JS.MFE_W[seq.substring(i+1, iPrime+1)];
					var obj3b = MFE_JS.MFE_W[seq.substring(iPrime+1, j-1)];
				
					if (obj3a["mfe"] + obj3b["mfe"] < str3["mfe"]){
						str3 = {mfe: obj3a["mfe"] + obj3b["mfe"], structure: "(" + obj3a["structure"] + obj3b["structure"] + ")", from: 3}
					}
				
				}
			
			
				// V(i,j) is the structure with the minimum free energy for cases 1-3
				var strMFE = str1;
				if (str2["mfe"] < strMFE["mfe"]) strMFE = str2;
				if (str3["mfe"] < strMFE["mfe"]) strMFE = str3;
			
			
				MFE_JS.MFE_V[subseq] = strMFE;
			
			
			}
			
			
		}
		
		
		
		
		
		// W table
		if (MFE_JS.MFE_W[subseq] == null){

			// Case 1: i is left as a dangling end. Use the structure from i+1 to j
			var obj1 = MFE_JS.MFE_W[seq.substring(i+1, j)];
			var str1 = {mfe: obj1["mfe"], structure: "." + obj1["structure"]};
			
			// Case 2: j is left as a dangling end. Use the structure from i to j-1
			var obj2 = MFE_JS.MFE_W[seq.substring(i+1, j)];
			var str2 = {mfe: obj2["mfe"], structure: obj2["structure"] + "."};
			
			// Case 3: i and j basepair with each other
			var str3 = MFE_JS.MFE_V[seq.substring(i, j)];
			
			// Case 4: i and j basepair but not with each other
			var str4 = {mfe: Infinity};
			for (var iPrime = i+1; iPrime < j-1; iPrime++){
				
				
				
				var obj4a = MFE_JS.MFE_W[seq.substring(i, iPrime+1)];
				var obj4b = MFE_JS.MFE_W[seq.substring(iPrime+1, j)];
				
				//console.log("subseq",subseq, "iPrime",iPrime, "obj4a", obj4a, "obj4b", obj4b, seq.substring(iPrime+1, j), MFE_JS.MFE_W[seq.substring(iPrime+1, j)]);
				if (obj4a["mfe"] + obj4b["mfe"] < str4["mfe"]){
					str4 = {mfe: obj4a["mfe"] + obj4b["mfe"], structure: obj4a["structure"] + obj4b["structure"]};
				}
				
			}
			
			
			// W(i,j) is the structure with the minimum free energy for cases 1-4
			var strMFE = str1;
			if (str2["mfe"] < strMFE["mfe"]) strMFE = str2;
			if (str3["mfe"] < strMFE["mfe"]) strMFE = str3;
			if (str4["mfe"] < strMFE["mfe"]) strMFE = str4;
			
			
			MFE_JS.MFE_W[subseq] = strMFE;
			
		}
	
	
	
	}
	
}


// Assumes that form of structure is
// subseq = 1234567
//          (.....)
MFE_JS.getFreeEnergyOfHairpin_WW = function(subseq){
	
	// Source: http://rna.urmc.rochester.edu/NNDB/turner04/hairpin.html
	
	// If the hairpin is in the special list of hairpins then use the parameters there
	if (FE_JS.SpecialHairpinParams[subseq] != null) return FE_JS.SpecialHairpinParams[subseq];
	
	var n = subseq.length - 2;
	if (n < 3) return Infinity;
	
	var initalisationPenalty = n == 3 ? 5.4 : n == 4 ? 5.6 : n == 5 ? 5.7 : n == 6 ? 5.4 : n == 7 ? 6.0 : n == 8? 5.5 : n == 9 ? 6.4 : 6; // If greater than 9 then set to 6kcal/mol
	
	var allC = subseq.substring(1, subseq.length-1).replace(/C/g, "").length == 0;
	var allCPenalty = allC && n == 3 ? 1.5 : allC ? 0.3*n + 1.6 : 0; // If the loop has all C's then add the all C penalty
	var terminalMismatchPenalty = FE_JS.TerminalMismatchParams[subseq[0] + subseq[1] + subseq[n+1] + subseq[n]];  //  5' 12																								//  3' 34
	var firstMismatchPenalty = subseq[1] == "G" && subseq[n] == "G" ? -0.8 : 0; // See if sequence is in form xGxxxxxxGx
	if (firstMismatchPenalty == 0) firstMismatchPenalty = ((subseq[1] == "U" && subseq[n] == "U") || (subseq[1] == "G" && subseq[n] == "A")) ? -0.9 : 0; // See if sequence is in form xGxxxxxxAx or xUxxxxxxUx
	var closurePenalty = subseq[0] == "G" && subseq[n+1] == "U" ? -2.2 : (subseq[0] == "A" && subseq[n+1] == "U") || (subseq[0] == "U" && subseq[n+1] == "A") ? 0.45 : 0;	// Bonus if the last basepair is GU, penalty if AU or UA													
	
	return initalisationPenalty + allCPenalty + terminalMismatchPenalty + firstMismatchPenalty + closurePenalty;
	
	
}


// Calculate the free energy of the face bounded by basepairs i, j, i' and j'
// where i and j basepair, and i' and j' basepair
// and 5'-- i < i' < j' < j --3'
 MFE_JS.getFreeEnergyOfFace_WW = function(i, j, iPrime, jPrime, seq){
	
	var Si = seq[i];
	var Sj = seq[j];
	var Siprime = seq[iPrime];
	var Sjprime = seq[jPrime];


	//console.log("Calculating face", seq.substring(i, iPrime+1) + "/" + seq.substring(jPrime, j+1));
	
	
	// If these 2 basepairs comprise the entire face then we only require the nearest neighbour basepair term
	if (i+1 == iPrime && j-1 == jPrime) {
		//console.log("Adding basepairs", Si + Siprime + Sj + Sjprime);
		return FE_JS.BasePairParams[Si + Siprime + Sj + Sjprime];
	}
	
	// Bulge between i and i'
	if (i+1 < iPrime && jPrime+1 == j) {
		return MFE_JS.getFreeEnergyOfBulge_WW(seq.substring(i, iPrime+1), reverseString_WW(seq.substring(jPrime, j+1)));
	}
	
	// Bulge between j' and j
	if (i+1 == iPrime && jPrime+1 < j) {
		return MFE_JS.getFreeEnergyOfBulge_WW(seq.substring(jPrime, j+1), reverseString_WW(seq.substring(i, iPrime+1)));
	}


	// 1x1 loop
	if (iPrime - i == 2 && j - jPrime == 2){
		var xIndex = seq[i+1] == "A" ? 0 : seq[i+1] == "C" ? 1 : seq[i+1] == "G" ? 2 : 3;
		var yIndex = seq[j-1] == "A" ? 0 : seq[j-1] == "C" ? 1 : seq[j-1] == "G" ? 2 : 3;
		//console.log("Adding 1x1 loop", FE_JS.LoopParams1x1[Si + Siprime + Sj + Sjprime][xIndex][yIndex]);
		return FE_JS.LoopParams1x1[Si + Siprime + Sj + Sjprime][xIndex][yIndex];
	}


	// 2x1 loop
	if (iPrime - i == 3 && j - jPrime == 2){
		var xIndexFirst = seq[i+1];
		var xIndexSecond = seq[i+2] == "A" ? 0 : seq[i+2] == "C" ? 1 : seq[i+2] == "G" ? 2 : 3;
		var yIndex = seq[j-1] == "A" ? 0 : seq[j-1] == "C" ? 1 : seq[j-1] == "G" ? 2 : 3;
		//console.log("Adding 2x1 loop", FE_JS.LoopParams2x1[Sjprime + Sj + Siprime + Si][xIndexFirst][yIndex][xIndexSecond]);
		return FE_JS.LoopParams2x1[Sjprime + Sj + Siprime + Si][xIndexFirst][yIndex][xIndexSecond];
	}


	// 1x2 loop
	if (iPrime - i == 2 && j - jPrime == 3){
		var xIndexFirst = seq[j-1];
		var xIndexSecond = seq[i+1] == "A" ? 0 : seq[i+1] == "C" ? 1 : seq[i+1] == "G" ? 2 : 3;
		var yIndex = seq[j-2] == "A" ? 0 : seq[j-2] == "C" ? 1 : seq[j-2] == "G" ? 2 : 3;
		//console.log("Adding 1x2 loop", FE_JS.LoopParams2x1[Si + Siprime + Sj + Sjprime][xIndexFirst][xIndexSecond][yIndex]);
		return FE_JS.LoopParams2x1[Si + Siprime + Sj + Sjprime][xIndexFirst][xIndexSecond][yIndex];
	}


	// 2x2 loop
	if (iPrime - i == 3 && j - jPrime == 3){
		var xIndexFirst = seq[i+1] == "A" ? 0 : seq[i+1] == "C" ? 1 : seq[i+1] == "G" ? 2 : 3;
		var xIndexSecond = seq[i+2] == "A" ? 0 : seq[i+2] == "C" ? 1 : seq[i+2] == "G" ? 2 : 3;
		var xIndex = xIndexFirst*4 + xIndexSecond; // Convert AA into 0, AC into 1, ... , UU into 15


		var yIndexFirst = seq[j-2] == "A" ? 0 : seq[j-2] == "C" ? 1 : seq[j-2] == "G" ? 2 : 3;
		var yIndexSecond = seq[j-1] == "A" ? 0 : seq[j-1] == "C" ? 1 : seq[j-1] == "G" ? 2 : 3;
		var yIndex = yIndexFirst*4 + yIndexSecond;
		//console.log("Adding 2x2 loop", FE_JS.LoopParams2x2[Si + Siprime + Sj + Sjprime][xIndex][yIndex]);
		return FE_JS.LoopParams2x2[Si + Siprime + Sj + Sjprime][xIndex][yIndex];
	}


	// Other sized loop
	var loopSizes = [iPrime - i + 1, j - jPrime + 1];
	var loopEnergy = loopSizes[0] + loopSizes[1] == 4 ? 1.1 : 2.0;
	loopEnergy += Math.abs(loopSizes[0] - loopSizes[1]) * 0.6; // Asymmetry penalty
	return loopEnergy;


		
	
	
	
}


// Provide string of bulged bases plus the 1 basepair on either side
// eg bulgedSeq = 5' "123456" 3' where this bulge is of size 4
// nonBulgedSeq = 3' "AB" 5'     where 1-A and 6-B basepair
 MFE_JS.getFreeEnergyOfBulge_WW = function(bulgedSeq, nonBulgedSeq){
	
	var bulgeSize = bulgedSeq.length-2;
	var freeEnergy = 0;
	if (bulgeSize == 1 && bulgedSeq == "C") freeEnergy += -0.9; // Special C bulge
	if (bulgeSize == 1) {
		freeEnergy += 3.81;
		freeEnergy += FE_JS.BasePairParams[bulgedSeq[0] + bulgedSeq[bulgedSeq.length-1] + nonBulgedSeq];
		if (FE_JS.BasePairParams[bulgedSeq[0] + bulgedSeq[bulgedSeq.length-1] + nonBulgedSeq] == null) console.log("ERROR bulge no basepair!", bulgedSeq[0] + bulgedSeq[bulgedSeq.length-1] + nonBulgedSeq);
	}
	else if (bulgeSize == 2) freeEnergy += 2.80;
	else freeEnergy += 3.2 + 0.4*(bulgeSize - 3);
	
	return freeEnergy;
	
	
}






function reverseString_WW(str) {
	return str.split("").reverse().join("");
}







if (RUNNING_FROM_COMMAND_LINE){


	module.exports = {
		MFE_W: MFE_JS.MFE_W,
		MFE_V: MFE_JS.MFE_V,
		getMFESequenceBonds_WW: MFE_JS.getMFESequenceBonds_WW,
		calculateMFESequence_WW: MFE_JS.calculateMFESequence_WW,
		getSecondaryStructureBonds_WW: MFE_JS.getSecondaryStructureBonds_WW,
		findBondsRecurse_WW: MFE_JS.findBondsRecurse_WW,
		init_MFE_WW: MFE_JS.init_MFE_WW,
		calc_MFE_WW: MFE_JS.calc_MFE_WW,
		getFreeEnergyOfHairpin_WW: MFE_JS.getFreeEnergyOfHairpin_WW,
		getFreeEnergyOfFace_WW: MFE_JS.getFreeEnergyOfFace_WW,
		getFreeEnergyOfBulge_WW: MFE_JS.getFreeEnergyOfBulge_WW

	}

}




