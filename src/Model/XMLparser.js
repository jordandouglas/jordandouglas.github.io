
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



XML_JS = {};
XML_JS.ABC_EXPERIMENTAL_DATA = {};


// Modified from http://xmljs.sourceforge.net/website/sampleApplications-sax.html
 XML_JS.loadSession_WW = function(XMLstring, resolve = function() {}, msgID = null){



	var arr, src='' ,parser = new SAXDriver();
	var handler = new xmlHandler();


	// pass handlers to the sax2 parser
	parser.setDocumentHandler(handler);
	parser.setErrorHandler(handler);
	parser.setLexicalHandler(handler);

	parser.parse(XMLstring);// start parsing

	// get errors from sax2 parser
	var err='\n'+handler.getError();

	//xmlTextArray=handler.getText_Array()
	//xmlCDataArray=handler.getCDATA_Array()
	xmlAttrArray=handler.getAttr_Array()


	var speedVal = "medium";
	arr=handler.getPath_Array();
	XML_JS.N = xmlAttrArray[arr[0]]["N"];
	var speedVal = xmlAttrArray[arr[0]]["speed"];
	nABCfits = 0;


	
	for (var i=0;i<arr.length;i++){
		
		var splitArr = arr[i].split("/");
		if (splitArr[2] == "sequence") parseXML_sequence_WW(xmlAttrArray[arr[i]]);
		else if (splitArr[2] == "parameters" && splitArr.length == 4) parseXML_param_WW(splitArr[3], xmlAttrArray[arr[i]]);
		else if (splitArr[2] == "elongation-model" && splitArr.length == 3) FE_JS.currentElongationModel = xmlAttrArray[arr[i]]["id"]; // Model id
		else if (splitArr[2] == "elongation-model" && splitArr.length == 4) parseXML_model_WW(splitArr[3], xmlAttrArray[arr[i]]["val"]); // Model property
		//else if (splitArr[2] == "state") compactState = parseXML_state_WW(xmlAttrArray[arr[i]]); // Current state
		else if (splitArr[2] == "plots" && splitArr.length == 3) parseXML_plot_main_WW(xmlAttrArray[arr[i]]); 
		else if (splitArr[2] == "plots" && splitArr.length == 4) parseXML_plots_WW(splitArr[3], xmlAttrArray[arr[i]]); 
		else if (splitArr[2] == "ABC" && splitArr.length == 3) parseXML_ABCmain_WW(xmlAttrArray[arr[i]]); 
		else if (splitArr[2] == "ABC" && splitArr.length == 4) parseXML_ABCfit_WW(xmlAttrArray[arr[i]]); 
		
		
	}


	//console.log("Parsed", XML_JS.showRejectedParameters);



	ABC_JS.ABC_EXPERIMENTAL_DATA = XML_JS.ABC_EXPERIMENTAL_DATA;

	var toReturn = {seq: SEQS_JS.all_sequences[sequenceID], model: FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel], N: XML_JS.N, speed: speedVal, whichPlotInWhichCanvas: PLOTS_JS.whichPlotInWhichCanvas, ABC_EXPERIMENTAL_DATA: XML_JS.ABC_EXPERIMENTAL_DATA,
						showPlots: !PLOTS_JS.plotsAreHidden};
	toReturn["seq"]["seqID"] = sequenceID;
	if (msgID != null){
		postMessage(msgID + "~X~" + JSON.stringify(toReturn));
	}else{
		resolve(toReturn);
	}



}


function parseXML_plot_main_WW(values){
	if (values["hidden"] != null){
		PLOTS_JS.plotsAreHidden = (values["hidden"] == "true");
	} 

}


function parseXML_plots_WW(attr, values){
	

	var plotNum = parseFloat(attr.substring(4)); // Convert plotx into x where x is a number from 1 to 4
	
	PLOTS_JS.selectPlot_WW(plotNum, values["name"], null, false); // Initialise the plot
	for (var prop in values){
		if (prop != "name") PLOTS_JS.whichPlotInWhichCanvas[plotNum][prop] = values[prop]; // Copy all the settings over
	}

	
}

function parseXML_model_WW(attr, val){

	var val = val == "true" ? true : val == "false" ? false : val;
	FE_JS.ELONGATION_MODELS[FE_JS.currentElongationModel][attr] = val; 
}



function parseXML_state_WW(stateAttr){

	var compactState = [parseFloat(stateAttr["nascentLen"]), parseFloat(stateAttr["activeSitePosition"]), stateAttr["NTPbound"] == "true", stateAttr["activated"] == "true"];
	return compactState;

}


function parseXML_sequence_WW(sequenceNode){

	//console.log("Parsing", sequenceNode);

	sequenceID = sequenceNode["seqID"];
	SEQS_JS.all_sequences[sequenceID] = {};
	SEQS_JS.all_sequences[sequenceID]["seq"] = sequenceNode["seq"];
	SEQS_JS.all_sequences[sequenceID]["template"] = sequenceNode["TemplateType"];
	SEQS_JS.all_sequences[sequenceID]["primer"] = sequenceNode["PrimerType"];

	// Reset secondary structure calculations
	MFE_JS.MFE_W = {};
	MFE_JS.MFE_V = {};

	PARAMS_JS.setStructuralParameters_WW();



}


// Parse the global ABC settings
function parseXML_ABCmain_WW(ABCnode){

	XML_JS.ABC_EXPERIMENTAL_DATA = {};
	XML_JS.ABC_EXPERIMENTAL_DATA["ntrials"] = ABCnode["ntrials"];
	XML_JS.ABC_EXPERIMENTAL_DATA["testsPerData"] = ABCnode["testsPerData"];
	XML_JS.showRejectedParameters = ABCnode["showRejectedParameters"] == null ? false : ABCnode["showRejectedParameters"] == "true";
	XML_JS.ABC_EXPERIMENTAL_DATA["fits"] = {};

}


// Parse the ABC force-velocity fit settings
function parseXML_ABCfit_WW(fitNode){

	nABCfits++;
	var fitID = "fit" + nABCfits;
		
	XML_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID] = {vals: []};
	XML_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["dataType"] = fitNode["dataType"];
	XML_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["RSSthreshold"] = parseFloat(fitNode["RSSthreshold"]);
	XML_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["ATPconc"] = parseFloat(fitNode["ATPconc"]);
	XML_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["CTPconc"] = parseFloat(fitNode["CTPconc"]);
	XML_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["GTPconc"] = parseFloat(fitNode["GTPconc"]);
	XML_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["UTPconc"] = parseFloat(fitNode["UTPconc"]);
	if (fitNode["dataType"] == "ntpVelocity") XML_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["force"] = parseFloat(fitNode["force"]);

	for (var obsID in fitNode){

		if (obsID.substring(0, 3) != "obs") continue;
		var X_axis_value = parseFloat(fitNode[obsID].split(",")[0]);
		var velocity = parseFloat(fitNode[obsID].split(",")[1]);

		if (fitNode["dataType"] == "forceVelocity") XML_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["vals"].push({force: X_axis_value, velocity: velocity});
		else if (fitNode["dataType"] == "ntpVelocity") XML_JS.ABC_EXPERIMENTAL_DATA["fits"][fitID]["vals"].push({ntp: X_axis_value, velocity: velocity});

	}


}

function parseXML_param_WW(paramID, paramNode){

	//console.log("Parsing", paramID, paramNode);


	var val = parseFloat(paramNode["val"]);
	var val = val == "true" ? true : val == "false" ? false : parseFloat(val);
	var distribution = paramNode["distribution"];
	var fixedDistnVal = paramNode["fixedDistnVal"]; 
	var uniformDistnLowerVal = paramNode["uniformDistnLowerVal"]; 
	var uniformDistnUpperVal = paramNode["uniformDistnUpperVal"];
	var ExponentialDistnVal = paramNode["ExponentialDistnVal"];
	var normalMeanVal = paramNode["normalMeanVal"]; 
	var normalSdVal = paramNode["normalSdVal"];
	var lognormalMeanVal = paramNode["lognormalMeanVal"];
	var lognormalSdVal = paramNode["lognormalSdVal"];
	var gammaShapeVal = paramNode["gammaShapeVal"];
	var gammaRateVal = paramNode["gammaRateVal"]
	var poissonRateVal = paramNode["poissonRateVal"]; 


	PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["val"] = val;
	PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["distribution"] = distribution;

	if (fixedDistnVal != null) PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["fixedDistnVal"] = parseFloat(fixedDistnVal);
	if (uniformDistnLowerVal != null) PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["uniformDistnLowerVal"] = parseFloat(uniformDistnLowerVal);
	if (uniformDistnUpperVal != null) PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["uniformDistnUpperVal"] = parseFloat(uniformDistnUpperVal);
	if (ExponentialDistnVal != null) PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["ExponentialDistnVal"] = parseFloat(ExponentialDistnVal);
	if (normalMeanVal != null) PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["normalMeanVal"] = parseFloat(normalMeanVal);
	if (normalSdVal != null) PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["normalSdVal"] = parseFloat(normalSdVal);
	if (lognormalMeanVal != null) PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["lognormalMeanVal"] = parseFloat(lognormalMeanVal);
	if (lognormalSdVal != null) PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["lognormalSdVal"] = parseFloat(lognormalSdVal);
	if (gammaShapeVal != null) PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["gammaShapeVal"] = parseFloat(gammaShapeVal);
	if (gammaRateVal != null) PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["gammaRateVal"] = parseFloat(gammaRateVal);
	if (poissonRateVal != null) PARAMS_JS.PHYSICAL_PARAMETERS[paramID]["poissonRateVal"] = parseFloat(poissonRateVal);




}




if (RUNNING_FROM_COMMAND_LINE){


	module.exports = {
		loadSession_WW: XML_JS.loadSession_WW,
		ABC_EXPERIMENTAL_DATA: XML_JS.ABC_EXPERIMENTAL_DATA,
		showRejectedParameters: XML_JS.showRejectedParameters

	}

}





/***************************************************************************************
                                        SAX EVENT HANDLER
***************************************************************************************/
xmlHandler = function() {
	/*************************************************************************************
    Function:       xmlHandler

    author:         xwisdom@yahoo.com

    description:
    	constructor for the xmlHandler object

    ************************************************************************************/
	this.m_strError=''
		this.m_treePath=[]
		this.m_xPath=[''] // stores current path info
		this.m_text=['']
		this.m_cdata=['']
		this.m_attr=['']
		this.m_pi=['']
		this.cdata=false

} // end function xmlHandler


	xmlHandler.prototype.characters = function(data, start, length) {
	/*************************************************************************************
    Function:       object.characters(String data, Int start, Int length)
					-> data: xml data
					-> start of text/cdata entity
					-> length of text/cdata entity

    author:         xwisdom@yahoo.com

    description:
    	this event is triggered whenever a text/cdata entity is encounter by the sax2 parser

    ************************************************************************************/

	// capture characters from CDATA and Text entities
	var text=data.substr(start, length);
	if (text=='\n' ) return null // get ride of blank text lines
		if (this.m_treePath.length>0){
			if(this.cdata==false){
				if (!this.m_text[this.m_xPath.join('/')]) {
					this.m_text[this.m_xPath.join('/')]='';
				}
				this.m_text[this.m_xPath.join('/')]+=text;
			}
			else {
				if (!this.m_cdata[this.m_xPath.join('/')]) {
					this.m_cdata[this.m_xPath.join('/')]='';
				}
				this.m_cdata[this.m_xPath.join('/')]+=text;
			}
		}

} // end function characters


	xmlHandler.prototype.comment = function(data, start, length) {
	/*************************************************************************************
    Function:       object.comment(String data, Int start, Int length)

    author:         xwisdom@yahoo.com

    description:
		triggered whenever a comment <!-- text --> is found. Same as the character event

    ************************************************************************************/

	var comment=data.substr(start, length)

} // end function comment


	xmlHandler.prototype.endCDATA = function() {
	/*************************************************************************************
    Function:       object.endCDATA()

    author:         xwisdom@yahoo.com

    description:
    	triggered at the end of cdata entity

    ************************************************************************************/

	// end of CDATA entity
	this.cdata=false

} // end function endCDATA


	xmlHandler.prototype.endDocument = function() {
	/*************************************************************************************
    Function:       object.endDocument()

    author:         xwisdom@yahoo.com

    description:
    	end of document parsing - last event triggered by the sax2 parser

    ************************************************************************************/

} // end function end Document


	xmlHandler.prototype.endElement = function(name) {
	/*************************************************************************************
    Function:       object.endElement(String tagname)
					-> tagname: name of tag

    author:         xwisdom@yahoo.com

    description:
    	last event trigger when a node is encounter by the sax2 parser

    ************************************************************************************/

	this.m_xPath=this.m_xPath.slice(0,-1)

} // end function endElement


	xmlHandler.prototype.error = function(exception) {
	/*************************************************************************************
    Function:       object.error(String exception)

    author:         xwisdom@yahoo.com

    description:
		triggered whenever an error is encounter by the sax2 parser

    ************************************************************************************/

	this.m_strError+='Error:'+exception.getMessage()+'\n'

} // end function error


	xmlHandler.prototype.fatalError = function(exception) {
	/*************************************************************************************
    Function:       object.fatalError(String exception)

    author:         xwisdom@yahoo.com

    description:
		triggered whenever an error is encounter by the sax2 parser

    ************************************************************************************/

	this.m_strError+='fata error:'+exception.getMessage()+'\n'

} // end function fatalError


	xmlHandler.prototype.getAttr_Array= function() {
	/*************************************************************************************
    Function:       getAttr_Array

    author:         xwisdom@yahoo.com
    ************************************************************************************/

	return this.m_attr;

}   // end function getAttr_Array


	xmlHandler.prototype.getCDATA_Array= function() {
	/*************************************************************************************
    Function:       getCDATA_Array

    author:         xwisdom@yahoo.com
    ************************************************************************************/
	return this.m_cdata;

}  // end function getCDATA_Array


	xmlHandler.prototype.getError = function() {
	/*************************************************************************************
    Function:       getError

    author:         xwisdom@yahoo.com
    ************************************************************************************/

	return this.m_strError;

}  // end function getError


	xmlHandler.prototype.getPath_Array = function() {
	/*************************************************************************************
    Function:       getError

    author:         xwisdom@yahoo.com
    ************************************************************************************/
	return this.m_treePath;
}  // end function getPath_Array


	xmlHandler.prototype.getText_Array = function() {
	/*************************************************************************************
    Function:       getText_Array

    author:         xwisdom@yahoo.com
    ************************************************************************************/
	return this.m_text;

} // getTextArray


	xmlHandler.prototype.processingInstruction = function(target, data) {
	/*************************************************************************************
    Function:       object.processingInstruction(String target, String data)
						-> target: is tagname of the pi
						-> data: is the content of the pi

    author:         xwisdom@yahoo.com

    description:
    	capture PI data here

    ************************************************************************************/

} // end function processingInstruction


	xmlHandler.prototype.setDocumentLocator = function(locator) {
	/*************************************************************************************
    Function:       object.setDocumentLocator(SAXDriver locator)

    author:         xwisdom@yahoo.com

    description:
		passes an instance of the SAXDriver to the handler

    ************************************************************************************/

	this.m_locator = locator;

}  // end function setDocumentLocator


	xmlHandler.prototype.startCDATA = function() {
	/*************************************************************************************
    Function:       object.startCDATA()

    author:         xwisdom@yahoo.com

    description:
    	triggered whenever a cdata entity is encounter by the sax2 parser

    ************************************************************************************/


	// start of CDATA entity
	this.cdata=true

} // end function startCDATA


	xmlHandler.prototype.startDocument = function() {
	/*************************************************************************************
    Function:       object.startDocument()

    author:         xwisdom@yahoo.com

    description:
    	start of document - first event triggered by the sax2 parser

    ************************************************************************************/

} // end function startDocument


	xmlHandler.prototype.startElement = function(name, atts) {
	/*************************************************************************************
    Function:       object.startElement(String tagname,Array content)
					-> tagname: name of tag
					-> content: [["attribute1", "value1"], ["attribute2", "value2"],....,n]

    author:         xwisdom@yahoo.com

    description:
    	First event trigger when a node is encounter by the sax2 parser
    	the name and attribute contents are passed to this event

    ************************************************************************************/

	// Note: the following code is used to store info about the node
	// into arrays for use the xpath layout

	var cpath,att_count=atts.getLength()
		this.m_xPath[this.m_xPath.length]=name
		cpath=this.m_xPath.join('/')
		this.m_treePath[this.m_treePath.length]=cpath

		if (att_count) {
			var attr=[]
				for (i=0;i<att_count;i++){
					attr[atts.getName(i)]=atts.getValue(i)
				}
					this.m_attr[this.m_xPath.join('/')]=attr;
		}

		} // end function startElement


	xmlHandler.prototype.warning = function(exception) {
	/*************************************************************************************
    Function:       object.warninng(String exception)

    author:         xwisdom@yahoo.com

    description:
		triggered whenever an error is encounter by the sax2 parser

    ************************************************************************************/

	this.m_strError+='Warning:'+exception.getMessage()+'\n'

} // end function warning






