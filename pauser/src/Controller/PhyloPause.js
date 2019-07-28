
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



function downloadROC(){


    // Remove the temporary canvas if it already exists
    $("#ROCcanvasTempDIV").remove();
    
    // Create an invisible canvas with a large size
    console.log("making a canvas png");
    
    var canvasHTML = `
                    <div class="scrollbar" id="ROCcanvasTempDIV"  style="display:none; height:170px; display:block; overflow-x:scroll; overflow-y:auto;  position:relative"> 
                        <div id="plotCanvasContainer5"> 
                            <canvas id="ROCcanvasTemp" width="1" height="1"></canvas> 
                        </div>
                    </div>`;
    $("#main").after(canvasHTML);
    
    
    plotROC("ROCcanvasTemp", 4, function() {
    
    
        // Save the temporary canvas to a file
        var tempCanvas = document.getElementById("ROCcanvasTemp");
    
    
        tempCanvas.toBlob(function(blob) {
            saveAs(blob, "ROCplot.png");
        }, "image/png");
        
        
        // Delete the temporary canvas
        $("#ROCcanvasTempDIV").remove();
    
    
    }); 
   
    

}


// Plot ROC curve and AUC
function plotROC(canvasID = "ROC_curve_canvas", canvasSizeMultiplier = 1, resolve = function() { }){

    if (!$("#ROC_curve_cont").is(":visible")) return;

    getROCanalysis_controller(function(result) {
    
        //console.log("plotROC", result);
    
        var values = {};
        if (result.simpol_ROC != null) values["SimPol"] = {x: result.simpol_ROC.FP, y: result.simpol_ROC.TP, col: "#008cba", AUC: result.simpol_AUC};
        if (result.nbc_ROC != null) values["NBC"] = {x: result.nbc_ROC.FP, y: result.nbc_ROC.TP, col: "#FFA500", AUC: result.nbc_AUC};
        
        // Plot the ROC curve
        ROC_plot(values, [0,1,0,1], canvasID, canvasSizeMultiplier, "False positive rate", "True positive rate");
       
        
        // Annotations
        //$("#ROC_curve_annotation").html("AUC = " + roundToSF(result.simpol_AUC));
        resolve();
        
    
    });



}


// Plot the values of x and y onto a ROC plot
function ROC_plot(values, range, id, canvasSizeMultiplier = 1, xlab = "Variable 1", ylab = "Variable 2") {
    

    


    var axisGap = 45 * canvasSizeMultiplier;
    var topGap = 20 * canvasSizeMultiplier;
    var classifierGap = 20 * canvasSizeMultiplier;
    
    var canvas = $('#' + id)[0];
    if (canvas == null) return;
    

    canvas.width = 400 * canvasSizeMultiplier;
    canvas.height = 400 * canvasSizeMultiplier;
    
    

    var ctx = canvas.getContext('2d');
    ctx.globalAlpha = 1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    var plotWidth = canvas.width - axisGap - topGap;
    var plotHeight = canvas.height - axisGap - topGap;


    var widthScale = plotWidth;
    var heightScale = plotHeight;
    
    
    // Draw diagonal line with AUC=0.5
    ctx.setLineDash([5  * canvasSizeMultiplier, 15  * canvasSizeMultiplier])
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2 * canvasSizeMultiplier;
    ctx.beginPath();
    ctx.moveTo(axisGap, canvas.height - axisGap);
    ctx.lineTo(canvas.width - topGap, topGap);
    ctx.stroke();
    ctx.setLineDash([])
    
    
    
    // Plot the TP/FP curve for each classifer
    var AUC_y = canvas.height - axisGap - classifierGap;
    for (var classifier_id in values){
    
        var xvals = values[classifier_id].x;
        var yvals = values[classifier_id].y;
        var col = values[classifier_id].col;
        var AUC = values[classifier_id].AUC;
    
        // Plot the xy values
        if (xvals != null && xvals.length > 0 && yvals != null && yvals.length > 0) {

            ctx.beginPath();
            
            
            var xPrime = widthScale * (xvals[0] - range[0]) + axisGap;
            var yPrime = canvas.height - heightScale * (yvals[0] - range[2]) - axisGap;
            
            
            ctx.strokeStyle = col;
            ctx.lineWidth = 3 * canvasSizeMultiplier;
            ctx.beginPath();
            ctx.moveTo(xPrime, yPrime);
            for (var valIndex = 1; valIndex < Math.min(xvals.length, yvals.length); valIndex ++){
            
                xPrime = widthScale * (xvals[valIndex] - range[0]) + axisGap;
                yPrime = canvas.height - heightScale * (yvals[valIndex] - range[2]) - axisGap;
                ctx.lineTo(xPrime, yPrime);
            
            }
            
            ctx.stroke();
            
        }
        
        
        // Print the AUC legend in bottom right corner
        if (AUC != null){
        
            // Print AUC
            ctx.textAlign="right";
            ctx.font = 15 * canvasSizeMultiplier + "px Arial";
            ctx.fillStyle = "black";
            ctx.textBaseline="middle"; 
            var text = classifier_id + " (AUC=" + roundToSF(AUC, 2) + ")";
            ctx.fillText(text, canvas.width, AUC_y);
            
            
            // Draw a legend line of the appropriate colour
            ctx.strokeStyle = col;
            ctx.lineWidth = 4 * canvasSizeMultiplier;
            var x2 = canvas.width - ctx.measureText(text).width - canvasSizeMultiplier*5;
            ctx.beginPath();
            ctx.moveTo(x2, AUC_y);
            ctx.lineTo(x2 - canvasSizeMultiplier*30, AUC_y);
            ctx.stroke();
            
            AUC_y -= classifierGap;
            
        
        }
        
    }
    
    
    
    
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3 * canvasSizeMultiplier;
    var labelPos = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    

    // X min and max
    var axisPointMargin = 6 * canvasSizeMultiplier;
    ctx.font = 10 * canvasSizeMultiplier + "px Arial";
    ctx.textBaseline="top"; 
    ctx.textAlign="center"; 
    var tickLength = 10 * canvasSizeMultiplier;
    ctx.lineWidth = 1 * canvasSizeMultiplier;

    for (var labelID = 0; labelID < labelPos.length; labelID++){
        var x0 = widthScale * (labelPos[labelID] - range[0]) + axisGap;
        ctx.fillText(labelPos[labelID], x0, canvas.height - axisGap + axisPointMargin);

        // Draw a tick on the axis
        ctx.beginPath();
        ctx.moveTo(x0, canvas.height - axisGap - tickLength/2);
        ctx.lineTo(x0, canvas.height - axisGap + tickLength/2);
        ctx.stroke();
        
    }



    // Y min and max
    ctx.textBaseline="bottom"; 
    ctx.textAlign="center"; 

    ctx.save()
    ctx.translate(axisGap - axisPointMargin, canvas.height - axisGap);
    ctx.rotate(-Math.PI/2);
    for (var labelID = 0; labelID < labelPos.length; labelID++){
        var y0 = heightScale * (labelPos[labelID] - range[2]);
        ctx.fillText(labelPos[labelID], y0, 0);
        
        // Draw a tick on the axis
        ctx.beginPath();
        ctx.moveTo(y0, axisPointMargin - tickLength/2);
        ctx.lineTo(y0, axisPointMargin + tickLength/2);
        ctx.stroke();
        
        
    }
    ctx.restore();

    
    
    
    
    
    // X label
    ctx.globalAlpha = 1;
    ctx.textBaseline="top";
    var xlabXPos = (canvas.width - axisGap) / 2 + axisGap;
    var xlabYPos = canvas.height - axisGap / 2;
    ctx.fillStyle = "black";
    ctx.textAlign="center"; 
    ctx.font = 20 * canvasSizeMultiplier + "px Arial";
    ctx.fillText(xlab, xlabXPos, xlabYPos);

    
    // Y label
    ctx.textBaseline="bottom"; 
    var ylabXPos = 2 * axisGap / 3 - 5*canvasSizeMultiplier;
    var ylabYPos = canvas.height - (canvas.height - axisGap - topGap) / 2 - axisGap;
    ctx.save()
    ctx.translate(ylabXPos, ylabYPos);
    ctx.rotate(-Math.PI/2);
    ctx.fillStyle = "black";
    ctx.textAlign="center"; 
    ctx.font = 20 * canvasSizeMultiplier + "px Arial";
    ctx.fillText(ylab, 0, 0);
    ctx.restore();


    
    ctx.lineWidth = 3*canvasSizeMultiplier;
    
    // Axes
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(axisGap, topGap);
    ctx.lineTo(axisGap, canvas.height - axisGap);
    ctx.lineTo(canvas.width - topGap, canvas.height - axisGap);
    ctx.stroke();
    
    
    

}

