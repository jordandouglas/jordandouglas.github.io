

DATA = {};
FADE_TIME = 50;


AA_COLS = {A: "#80a0f0", I: "#80a0f0", L: "#80a0f0", M: "#80a0f0", F: "#80a0f0", W: "#80a0f0", V: "#80a0f0",
          K: "#f01505", R: "#f01505",
          D: "#c048c0", E: "#c048c0",
          N: "#15c015", S: "#15c015", Q: "#15c015", T: "#15c015",
          C: "#f08080",
          G: "#f09048",
          P: "#c0c000",
          H: "#15a4a4", Y: "#15a4a4"};



// http://bioinformatica.isa.cnr.it/SUSAN/NAR2/dsspweb.html#:~:text=DSSP%20assigns%20seven%20different%20secondary,no%20secondary%20structure%20is%20recognized
AA_COLS_2 = {E: "#fe2c54", H: "#0d98ba", G: "#0d98ba",  T:"#d3d3d3", L: "white", S: "#d3d3d3", I: "#0d98ba", B: "#d3d3d3"};


MIN_SSE_LEN = 4;


SVG_WIDTH = 800;
NT_WIDTH = 14;
NT_HEIGHT = 14;
FEATURE_HEIGHT = 20;
SEC_WIDTH = 1.2;
SEC_HEIGHT = 20;
NT_FONT_SIZE = 11;
ALN_LABEL_WIDTH = 300;

LEVEL_1_COL = "#FFA500dd";
LEVEL_2_COL = "#696969";
LEVEL_3_COL = "#d3d3d3";

STRAND_ARROW_HEAD_LEN_1 = 7;
STRAND_ARROW_HEAD_LEN_2 = 8;
STRAND_ARROW_BASE_WIDTH = 8;
STRAND_ARROW_HEAD_WIDTH = 15;

function renderaaRS(aaRS, aaRS_full_name){


  console.log("rendering", aaRS, aaRS_full_name)


  // Page title
  $("title").html(aaRS_full_name);


  // Main header
  var main = $("#main");
  main.children("h1").html(aaRS_full_name + " (" + aaRS + ")");



  loadAllFiles(function(){


    console.log(DATA);
    renderAlignment($("#alignment"), "Primary structure", true);
    renderAlignment($("#alignment2"), "Secondary structure", false);
    renderSecondary($("#secondary"));


  // Synchronise scroll bars
  $("#alignment").parent().scroll(function () { 
    $("#alignment2").parent().scrollTop($("#alignment").parent().scrollTop());
    $("#alignment2").parent().scrollLeft($("#alignment").parent().scrollLeft());
  });
  $("#alignment2").parent().scroll(function () { 
    $("#alignment").parent().scrollTop($("#alignment2").parent().scrollTop());
    $("#alignment").parent().scrollLeft($("#alignment2").parent().scrollLeft());
  });


  })


}


function renderSecondary(svg){


    // Number of sequences
    var alignment = DATA.secondary;
    var accessions = DATA.accessions;
    var nseq = accessions.length;
    var nsites = alignment[accessions[0]].length;
    var features = DATA.features;


    console.log("rendering alignment with", nseq, nsites)


    svg.hide();
    svg.html("");
    svg.height(SEC_HEIGHT*(nseq+1) + FEATURE_HEIGHT*3);
    svg.width(SEC_WIDTH*(nsites+10) + ALN_LABEL_WIDTH);


     // Features
    for (var feature in features){

      var range = features[feature].range;
      var level = features[feature].level;
      if (range == "") continue;
      range = range.split("-")
      var y = SEC_HEIGHT*(nseq+1) + FEATURE_HEIGHT*(level-0.5);
      var x1 = SEC_WIDTH*(parseFloat(range[0])) + ALN_LABEL_WIDTH;
      var x2 = x1 + NT_WIDTH;
      if (range.length == 2){
        x2 = SEC_WIDTH*(parseFloat(range[1]) + 1) + ALN_LABEL_WIDTH;
      }


      var textCol = "black";
      var col = level == 1 ? LEVEL_1_COL : level == 2 ? LEVEL_2_COL : LEVEL_3_COL;
      var txt = feature;
      if (level == 0){
        continue;
      }else{
        drawSVGobj(svg, "rect", {x: x1-SEC_WIDTH, y: SEC_HEIGHT, width: x2-x1, height:SEC_HEIGHT*nseq, style:"stroke-width:0px; stroke:black; fill:" + col});
      }



      drawSVGobj(svg, "text", {x: x1-SEC_WIDTH + (x2-x1)/2, y: y, style: "text-anchor:middle; dominant-baseline:central; font-size:16px; fill:" + textCol}, value=txt)

    }


  // Site numbering
    for (var site = 0; site < nsites; site++){
      if (site == 0 || (site+1) % 50 == 0){
        var y = SEC_HEIGHT*0.5;
        var x = SEC_WIDTH*(site) + ALN_LABEL_WIDTH;
        drawSVGobj(svg, "text", {x: x, y: y, style: "text-anchor:start; dominant-baseline:central; font-family:Courier New; font-size:" + NT_FONT_SIZE + "px"}, value=site+1)
      }
    }

    // Sequence labels
    for (var seqNum = 0; seqNum < nseq; seqNum++){
      var acc = accessions[seqNum];
      var y = SEC_HEIGHT*(seqNum+1.5)
      var x = ALN_LABEL_WIDTH - 10;
      var url = DATA.urls[acc];


      var accPrint = acc.replace(".pdb", "");
      var cls = DATA.isAlpha[[acc]] ? "alpha" : "pdb";
      var textEle = drawSVGobj(svg, "a", {x: x, y: y, href: url, target:"_blank"})
      drawSVGobj(textEle, "text", {x: x, y: y, class: cls, style: "text-anchor:end; dominant-baseline:central; font-size:" + NT_FONT_SIZE + "px"}, value=accPrint)

    }


    // Secondary structure
    for (var seqNum = 0; seqNum < nseq; seqNum++){
      var acc = accessions[seqNum];
      var seq = alignment[acc];
      var y = SEC_HEIGHT*(seqNum+1.5)


      // Find contiguous regions of helix, strand, loop, or gap
      var SSEs = [];
      var symbol = seq[0];
      var start = 0;
      for (var site = 1; site < nsites; site++){

        var symbol2 = seq[site];
        if (symbol != symbol2){

          var sse = {start: start, stop: site-1, element: symbol};
          symbol = symbol2;
          start = site;
          SSEs.push(sse);

        }
      }


      // Plot them
      for (var i = 0; i < SSEs.length; i ++){

        var sse = SSEs[i];


        var startX = (sse.start-1)*SEC_WIDTH + ALN_LABEL_WIDTH;
        var endX = (sse.stop+1)*SEC_WIDTH + ALN_LABEL_WIDTH;


        // Gap - do nothing
        if (sse.element == "-"){
          //console.log(acc, "gaps", sse);


        }

        // Helix
        else if ((sse.element == "H" || sse.element == "G" || sse.element == "I")  && sse.stop - sse.start + 1 >= MIN_SSE_LEN){

          //console.log(acc, "helix", sse);
          drawSVGobj(svg, "rect", {x: startX, y: y-STRAND_ARROW_HEAD_WIDTH/2, width: endX-startX, height: STRAND_ARROW_HEAD_WIDTH, style: "stroke-width:0px; stroke:black; fill:" + AA_COLS_2["H"]} )

        }

        // Strand
        else if (sse.element == "E" && sse.stop - sse.start + 1 >= MIN_SSE_LEN){

          // Arrow
          var x2 = endX - STRAND_ARROW_HEAD_LEN_1;
          var x3 = endX - STRAND_ARROW_HEAD_LEN_2;


          var points = startX + "," + (y-STRAND_ARROW_BASE_WIDTH/2);
          points += " " + x2 + "," + (y-STRAND_ARROW_BASE_WIDTH/2);
          points += " " + x3 + "," + (y-STRAND_ARROW_HEAD_WIDTH/2);
          points += " " + endX + "," + y;
          points += " " + x3 + "," + (y+STRAND_ARROW_HEAD_WIDTH/2);
          points += " " + x2 + "," + (y+STRAND_ARROW_BASE_WIDTH/2);
          points += " " + startX + "," + (y+STRAND_ARROW_BASE_WIDTH/2);

          drawSVGobj(svg, "polygon", {points: points, style: "stroke-width:0px; stroke:black; fill:" + AA_COLS_2["E"]} )

        }

        // Loop etc
        else{


          //console.log(acc, "loop", sse);

          drawSVGobj(svg, "line", {x1: startX, x2: endX, y1: y, y2: y, style: "stroke-width:1px; stroke:black"} )

        }

      }


      //console.log("SSE", SSEs);



    }




    svg.show();


}


function renderAlignment(svgAlign, main, isPrimary = true){



    // Number of sequences
    var alignment = isPrimary ? DATA.alignment : DATA.secondary;
    var accessions = DATA.accessions;
    var nseq = accessions.length;
    var nsites = alignment[accessions[0]].length;

    var features = DATA.features;

    //nsites = 800;

    console.log("rendering alignment with", nseq, nsites)


    // Render the alignment onto svg
    
    svgAlign.hide();
    svgAlign.html("");
    svgAlign.height(NT_HEIGHT*(nseq+1) + FEATURE_HEIGHT*3);
    svgAlign.width(NT_WIDTH*(nsites+2) + ALN_LABEL_WIDTH);



    // Sequence labels
    for (var seqNum = 0; seqNum < nseq; seqNum++){
      var acc = accessions[seqNum];
      var y = NT_HEIGHT*(seqNum+1.5)
      var x = ALN_LABEL_WIDTH - 10;
      var url = DATA.urls[acc];


      var accPrint = acc.replace(".pdb", "");
      var cls = DATA.isAlpha[[acc]] ? "alpha" : "pdb";
      var textEle = drawSVGobj(svgAlign, "a", {x: x, y: y, href: url, target:"_blank"})
      drawSVGobj(textEle, "text", {x: x, y: y, class: cls, style: "text-anchor:end; dominant-baseline:central; font-size:" + NT_FONT_SIZE + "px"}, value=accPrint)

    }

    // Site numbering
    for (var site = 0; site < nsites; site++){
      if (site == 0 || (site+1) % 10 == 0){
        var y = NT_HEIGHT*0.5;
        var x = NT_WIDTH*(site) + ALN_LABEL_WIDTH;
        drawSVGobj(svgAlign, "text", {x: x, y: y, style: "text-anchor:start; dominant-baseline:central; font-family:Courier New; font-size:" + NT_FONT_SIZE + "px"}, value=site+1)
      }
    }


    // Draw the alignment
    for (var seqNum = 0; seqNum < nseq; seqNum++){

      var acc = accessions[seqNum];
      var seq = alignment[acc];
      var y = NT_HEIGHT*(seqNum+1.5)
      //console.log(acc, seq);
      for (var site = 0; site < nsites; site++){
        var x = NT_WIDTH*(site+0.5) + ALN_LABEL_WIDTH;
        var aa = seq[site];


        //if (aa == "-" && !isPrimary) continue;
        if (aa == "-") continue;


        // Rect
        if (aa != "-") {
          var col = "white";
          if (isPrimary){
            col = AA_COLS[aa];
          }else{
            col = AA_COLS_2[aa];
          }
          drawSVGobj(svgAlign, "rect", {x: x-NT_WIDTH/2, y: y-NT_HEIGHT/2, width: NT_WIDTH, height:NT_HEIGHT, style:"fill:" + col})
        }



        // Text
        drawSVGobj(svgAlign, "text", {x: x, y: y, style: "text-anchor:middle; dominant-baseline:central; font-family:Courier New; font-size:12px"}, value=aa)

      }


    }


    // Features
    for (var feature in features){

      var range = features[feature].range;
      var level = features[feature].level;
      if (range == "") continue;
      range = range.split("-")
      var y = NT_HEIGHT*(nseq+1) + FEATURE_HEIGHT*(level-0.5);
      var x1 = NT_WIDTH*(parseFloat(range[0])) + ALN_LABEL_WIDTH;
      var x2 = x1 + NT_WIDTH;
      if (range.length == 2){
        x2 = NT_WIDTH*(parseFloat(range[1]) + 1) + ALN_LABEL_WIDTH;
      }

      console.log(feature, range, x1, x2);

      var textCol = level == 1 || level == 3 ? "black" : "white";
      var col = level == 1 ? LEVEL_1_COL : level == 2 ? LEVEL_2_COL : LEVEL_3_COL;
      var txt = feature;
      if (level == 0){
        txt = "*";
        textCol = "black";
        y = y + FEATURE_HEIGHT;
      }else{
        drawSVGobj(svgAlign, "rect", {x: x1-NT_WIDTH, y: y-FEATURE_HEIGHT/2, width: x2-x1, height:FEATURE_HEIGHT, style:"fill:" + col});
      }



      drawSVGobj(svgAlign, "text", {x: x1-NT_WIDTH + (x2-x1)/2, y: y, style: "text-anchor:middle; dominant-baseline:central; font-size:16px; fill:" + textCol}, value=txt)

    }


  svgAlign.show();


  // Download fasta
  svgAlign.parent().before("<h2>" + main + "</h2>");
  if (isPrimary) svgAlign.parent().after("<a href='data/align.ali' style='float:right'>Download fasta</a>");


}



function loadAllFiles(resolve = function() { }){

  DATA = {};

  // Load features
  fetch("data/features.tsv").then(response => response.text()).then(text => loadFeatures(text, resolve));



}



function loadFeatures(tsv, resolve = function() { }){


  var features = {};
  var lines = tsv.split("\n");
  for (var i = 0; i < lines.length; i++){


    var line = lines[i].trim();
    if (line == "" || line[0] == "#") continue;
    var feature = line.split("\t")[0];
    var range = line.split("\t")[1];
    var level = parseFloat(line.split("\t")[2]);
    features[feature] = {range: range, level: level};



  }

  DATA.features = features;


  // Load alignment
  fetch("data/align.ali").then(response => response.text()).then(text => loadAlignment(text, resolve));


}


function loadAlignment(fasta, resolve = function() { }){

  //console.log("loading alignment", fasta)
  var lines = fasta.split("\n");
  var sequences = {};
  var acc = "seq";
  var accessions = [];
  var isAlpha = {};
  var urls = {};
  for (var i = 0; i < lines.length; i ++){

    var line = lines[i];

    if (line.trim() == "") continue;

    if (line[0] == ">"){
      acc = line.substring(1, line.length).trim();
      acc = acc.replace("structures/", "");
    }else{
      sequences[acc] = line;
      accessions.push(acc);

      // PDB or genbank?
      var accSplit = acc.split(".");
      var url = "";
      if (accSplit.length >= 4 && accSplit[1].length == 1){

        // Genbank
         var accession = accSplit[3];
         //url = "https://www.ncbi.nlm.nih.gov/nuccore/" + accession;
         url = "data/structures/" + acc;
         isAlpha[acc] = true;

      }else{

        // PDB
        var pdb = acc.split("_")[2];
        url = "https://www.rcsb.org/structure/" + pdb;
        isAlpha[acc] = false;

      }
      urls[acc] = url;


    }

  }


  DATA.isAlpha = isAlpha;
  DATA.urls = urls;
  DATA.accessions = accessions;
  DATA.alignment = sequences;

  // Load all pdb files
  fetch("data/structures.txt").then(response => response.text()).then(text => loadStructures(text, resolve));

}


function loadStructures(listOfStructures, resolve){


    // Load dssp files with secondary structure
    var lines = listOfStructures.split("\n");
    var structures = [];
    for (var i = 0; i < lines.length; i ++){

      var fileName = lines[i];
      if (fileName == "" || fileName[0] == "#") continue;
      fileName = fileName.replace("structures/", "dssp/");
      fileName = "data/" + fileName + ".dssp";

      structures.push(fileName);

    }



    DATA.secondary = {};
    loadStructure(structures, resolve);



}





/*
 * Recursively load a list of pdb structures in dssp
*/
function loadStructure(structures, resolve = function() { } ){

  if (structures.length == 0){
    resolve();
    return;
  }

  var fileName = structures.pop();


  fetch(fileName).then(response => response.text()).then(text => {

    console.log("loading pdb", fileName);



    // Find the table
    var lines = text.split("\n");
    var firstLine = -1;
    for (var i = 0; i < lines.length; i ++){

      var line = lines[i];
      if (line.match("#  RESIDUE AA STRUCTURE")){
        //console.log("line 1 is", line);
        firstLine = i;
        break;
      }

    }

    if (firstLine != -1){


      var acc = fileName.replace("data/dssp/", "").replace(".dssp", "");

      // Put secondary stucture into alignment
      var sequence = "";
      var alignmentSequence = DATA.alignment[acc];
      var siteNum = 0;
      for (var alnSiteNum = 0; alnSiteNum < alignmentSequence.length; alnSiteNum++){

        var alnChar = alignmentSequence[alnSiteNum];
        if (alnChar == "-"){

          sequence += "-";
        }else{

          var line = lines[firstLine + siteNum];
          var ss = line.substring(16, 17);
          if (ss == " ") ss = "L";
          sequence += ss;
          siteNum ++;

        }
      }


      DATA.secondary[acc] = sequence;

      //console.log(acc, "has 2nd structure", sequence);


    }else{
      console.log("warning cannot load dssp table for", fileName)
    }


    loadStructure(structures, resolve);

  });



}






  function drawSVGobj(svg, type, attr, val = null){

    //console.log("attr", attr);
    var newObj = document.createElementNS('http://www.w3.org/2000/svg', type);


    for (var a in attr){
      if (a == "text_anchor") newObj.setAttribute("text-anchor", attr[a]);
      else if (a == "alignment_baseline") newObj.setAttribute("alignment-baseline", attr[a]);
      else if (a == "stroke_dasharray") newObj.setAttribute("stroke-dasharray", attr[a]);
      else newObj.setAttribute(a, attr[a]);
    }
    if (val != null) newObj.innerHTML = val;
    newObj.setAttribute("animatable", "true");


    // Set some of the styles as attributes because safari and IE do not like styles for svgs
    var styles = getComputedStyle(newObj);
    //if (styles.fill != null) newObj.setAttribute("fill", styles.fill);
    if (styles.stroke != null) newObj.setAttribute("stroke", styles.stroke);
    if (styles["stroke-width"] != null) newObj.setAttribute("stroke-width", styles["stroke-width"]);
    //console.log(styles["stroke-width"]);

    //window.requestAnimationFrame(function() {
    svg.append(newObj);
    $(newObj).hide().fadeIn(FADE_TIME); 
    
    
    
    
    return newObj;

  } 
