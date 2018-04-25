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


#include "Settings.h"
#include "Parameter.h"
#include "Coordinates.h"
#include <string>

#include <iostream>
#include <random>
#include <map>
#include <math.h>


using namespace std;



Parameter::Parameter(string id, bool integer, string zeroTruncated, string name, string title, string latexName){
	this->id = id;
	this->integer = integer;
	this->zeroTruncated = zeroTruncated;
	this->name = name;
	this->title = title;
	this->latexName = latexName;
	this->init();
}


Parameter::Parameter(string id, bool integer, string zeroTruncated, string name, string title){
	this->id = id;
	this->integer = integer;
	this->zeroTruncated = zeroTruncated;
	this->name = name;
	this->title = title;
	this->latexName = "";
	this->init();
}


Parameter::Parameter(string id, bool integer, string zeroTruncated){
	this->id = id;
	this->integer = integer;
	this->zeroTruncated = zeroTruncated;
	this->title = "";
	this->name = "";
	this->latexName = "";
	this->init();
}


void Parameter::init(){

	this->distributionName = "Fixed";
	this->isHardcoded = false;
    this->hardcodedVal = 0;
    this->hasMadeProposal = false;
    this->valBeforeMakingProposal = 0;
    this->isMetaParameter = false;
    this->hidden = false;


	// Create the list of distribution parameters
	distributionParameters["fixedDistnVal"] = 1;
	distributionParameters["uniformDistnUpperVal"] = INFINITY;
	distributionParameters["uniformDistnLowerVal"] = INFINITY;
	distributionParameters["lognormalMeanVal"] = INFINITY;
	distributionParameters["lognormalSdVal"] = INFINITY;
	distributionParameters["normalMeanVal"] = INFINITY;
	distributionParameters["normalSdVal"] = INFINITY;
	distributionParameters["gammaRateVal"] = INFINITY;
	distributionParameters["gammaShapeVal"] = INFINITY;
	distributionParameters["exponentialDistnVal"] = INFINITY;
	distributionParameters["poissonRateVal"] = INFINITY;

	distributionParameters["upperVal"] =  INFINITY;
	distributionParameters["lowerVal"] = -INFINITY;

}


string Parameter::getID(){
	return this->id;
}

string Parameter::getName(){
	return this->name;
}

string Parameter::getLatexName(){
	return this->latexName;
}

Parameter* Parameter::hide(){
	this->hidden = true;
	return this;
}


Parameter* Parameter::show(){
	this->hidden = false;
	return this;
}


double Parameter::getVal(){
	if (this->isMetaParameter) return this->instances.at(this->currentInstance)->getVal();

	if (this->isHardcoded) return this->hardcodedVal;
	return this->val;
}

double Parameter::getTrueVal(){
	if (this->isMetaParameter) return this->instances.at(this->currentInstance)->getTrueVal();

	return this->val;
}

void Parameter::setVal(double val){
	if (this->isMetaParameter) this->instances.at(this->currentInstance)->setVal(val);

	else this->val = val;
}


void Parameter::setPriorDistribution(string distributionName){
	if (this->isMetaParameter) this->instances.at(this->currentInstance)->setPriorDistribution(distributionName);

	else this->distributionName = distributionName;
}

string Parameter::getPriorDistributionName(){
	if (this->isMetaParameter) return this->instances.at(this->currentInstance)->getPriorDistributionName();

	return this->distributionName;
}


// Clones the parameter, but will not recurse down to its instances 
Parameter* Parameter::clone(){

	Parameter* paramClone = new Parameter(this->id, this->integer, this->zeroTruncated, this->name, this->title, this->latexName);
	paramClone->distributionName = this->distributionName;
	paramClone->isHardcoded = this->isHardcoded;
	paramClone->hardcodedVal = this->hardcodedVal;
	paramClone->val = this->val;

	// Copy the distribution parameters
	for(std::map<string, double>::iterator iter = this->distributionParameters.begin(); iter != this->distributionParameters.end(); ++iter){
		string k =  iter->first;
		double v = iter->second;
		paramClone->setDistributionParameter(k, v);
	}

	return paramClone;

}




void Parameter::sample(){


	double prevVal = this->val;

	if (this->isMetaParameter) {
		for (int i = 0; i < this->instances.size(); i ++){
			 this->instances.at(i)->sample();
		}
	}

	else if (this->isHardcoded) {

	}

	else if (this->distributionName == "Fixed"){
		this->val = distributionParameters["fixedDistnVal"];
	}

	else if (this->distributionName == "Uniform"){
		uniform_real_distribution<> distribution{this->distributionParameters["uniformDistnLowerVal"], this->distributionParameters["uniformDistnUpperVal"]};
		this->val = distribution(generator);
	}

	else if (this->distributionName == "Normal"){
		normal_distribution<> distribution{this->distributionParameters["normalMeanVal"], this->distributionParameters["normalSdVal"]};

		this->val =  distribution(generator);
		bool withinRange = this->zeroTruncated == "false" || (this->zeroTruncated == "exclusive" && this->val > 0) || (this->zeroTruncated == "inclusive" && this->val >= 0);
		withinRange = withinRange && this->val > this->distributionParameters["lowerVal"] && this->val < this->distributionParameters["upperVal"];
		while (!withinRange) {
			this->val =  distribution(generator);
			bool withinRange = this->zeroTruncated == "false" || (this->zeroTruncated == "exclusive" && this->val > 0) || (this->zeroTruncated == "inclusive" && this->val >= 0);
			withinRange = withinRange && this->val > this->distributionParameters["lowerVal"] && this->val < this->distributionParameters["upperVal"];
		}
	}

	else if (this->distributionName == "Lognormal"){
		lognormal_distribution<> distribution{this->distributionParameters["lognormalMeanVal"], this->distributionParameters["lognormalSdVal"]};

		this->val =  distribution(generator);

		bool withinRange = this->zeroTruncated == "false" || (this->zeroTruncated == "exclusive" && this->val > 0) || (this->zeroTruncated == "inclusive" && this->val >= 0);
		withinRange = withinRange && this->val > this->distributionParameters["lowerVal"] && this->val < this->distributionParameters["upperVal"];
		while (!withinRange) {
			this->val =  distribution(generator);
			bool withinRange = this->zeroTruncated == "false" || (this->zeroTruncated == "exclusive" && this->val > 0) || (this->zeroTruncated == "inclusive" && this->val >= 0);
			withinRange = withinRange && this->val > this->distributionParameters["lowerVal"] && this->val < this->distributionParameters["upperVal"];
		}


	}

	else if (this->distributionName == "Exponential"){

		this->val = Settings::rexp(distributionParameters["exponentialDistnVal"]);

		bool withinRange = this->val > this->distributionParameters["lowerVal"] && this->val < this->distributionParameters["upperVal"];
		while (!withinRange) {
			this->val = Settings::rexp(distributionParameters["exponentialDistnVal"]);
			withinRange = this->val > this->distributionParameters["lowerVal"] && this->val < this->distributionParameters["upperVal"];
		}


		//cout << "sampled " << this->val << " from " << distributionParameters["exponentialDistnVal"] << endl;

	}


	else if (this->distributionName == "Gamma"){

  		gamma_distribution<double> distribution(distributionParameters["gammaShapeVal"], 1/distributionParameters["gammaRateVal"]);
  		this->val =  distribution(generator);

		bool withinRange = withinRange && this->val > this->distributionParameters["lowerVal"] && this->val < this->distributionParameters["upperVal"];
		while (!withinRange) {
			this->val =  distribution(generator);
			withinRange = this->val > this->distributionParameters["lowerVal"] && this->val < this->distributionParameters["upperVal"];
		}

		//cout << "sampled " << this->val << " from " << distributionParameters["gammaShapeVal"] << "," << distributionParameters["gammaRateVal"] << endl;

	}


	else if (this->distributionName == "DiscreteUniform"){

  		uniform_real_distribution<> distribution{this->distributionParameters["uniformDistnLowerVal"], this->distributionParameters["uniformDistnUpperVal"] + 1};
		this->val = std::floor(distribution(generator));
		//cout << "sampled " << this->val << " from " << distributionParameters["gammaShapeVal"] << "," << distributionParameters["gammaRateVal"] << endl;

	}

	else {

		cout << "ERROR: Unrecognised distribution: " << this->distributionName << endl;
		exit(1);
	}



	// If animating and this is the FAssist parameter then update the optical tweezer coordinates whenever this parameter changes
	if (this->id == "FAssist" && _currentStateGUI != nullptr && _animationSpeed != "hidden"){
		Coordinates::updateForceEquipment(this->val, prevVal);
	}


	// If this is the a structural parameter then the translocation cache needs to be updated
	if (prevVal != this->val && (this->id == "hybridLen" || this->id == "bubbleLeft" || this->id == "bubbleRight")) Settings::resetRateTables();


}



double Parameter::calculateLogPrior(){

	//double M_PI = 3.14159265359;


	// Sum up the prior of the sub-parameters of this meta-parameter
	if (this->isMetaParameter) {
		double logPrior = 0;
		for (int i = 0; i < this->instances.size(); i ++){
			 logPrior += this->instances.at(i)->calculateLogPrior();
		}
		return logPrior;
	}


	// Check boundaries
	if ((this->zeroTruncated == "exclusive" && this->val <= 0) || (this->zeroTruncated == "inclusive" && this->val <  0)) return -INFINITY;


	if (this->distributionName == "Fixed"){
		return 0;
	}


	else if (this->distributionName == "Uniform"){
		double lower = this->distributionParameters["uniformDistnLowerVal"];
		double upper = this->distributionParameters["uniformDistnUpperVal"];
		if (this->val < lower || this->val > upper) return -INFINITY;
		return log(1 / (upper - lower));
	}

	else if (this->distributionName == "Normal"){
		if (this->val < this->distributionParameters["lowerVal"] || this->val > this->distributionParameters["upperVal"]) return -INFINITY;
		double mu = this->distributionParameters["normalMeanVal"];
		double sd = this->distributionParameters["normalSdVal"];
		double lowerVal = max(this->distributionParameters["lowerVal"], (this->zeroTruncated != "false" ? 0 : (double)(-INFINITY))); // Lowest value this may take

		return log(Settings::getNormalDensity(this->val, mu, sd, lowerVal, this->distributionParameters["upperVal"]));
	}

	else if (this->distributionName == "Lognormal"){
		if (this->val < this->distributionParameters["lowerVal"] || this->val > this->distributionParameters["upperVal"]) return -INFINITY;
		double mu = this->distributionParameters["lognormalMeanVal"];
		double sd = this->distributionParameters["lognormalSdVal"];

		double lowerVal = max(this->distributionParameters["lowerVal"], (this->zeroTruncated != "false" ? 0 : (double)(-INFINITY))); // Lowest value this may take
		lowerVal = lowerVal <= 0 ? -INFINITY : log(lowerVal);

		double logval = log(this->val); // Convert into normal space to calculate prior
		return log( Settings::getNormalDensity(logval, mu, sd, lowerVal, log(this->distributionParameters["upperVal"])) );
	}

	else {


		cout << "ERROR: SimPol cannot calculate probability density for: " << this->distributionName << endl;
		exit(1);

		// TODO poisson, discrete uniform
		return 0;
	}
}






// Makes a proposal and changes the value of this parameter 
void Parameter::makeProposal(){

	// If this is a metaparameter, uniformly at random select an instance to make a proposal on 
	if (this->isMetaParameter) {
		double runifNum = min((int)(Settings::runif() * this->instances.size()), (int)this->instances.size()-1); // Random integer in range [0, ninstances-1]
		this->instances.at(runifNum)->makeProposal();
	}



	else if (this->distributionName == "" || this->distributionName == "Fixed"){
		this->val = this->distributionParameters["fixedDistnVal"];
	}
	else{

		// Cache the value before making the proposal
	    this->hasMadeProposal = true;
    	this->valBeforeMakingProposal = this->val;


		// Generate a heavy tailed distribution random variable.
		// Using the algorithm in section 8.3 of https://arxiv.org/pdf/1606.03757.pdf
		normal_distribution<> normDistribution{0, 1};
		double a = normDistribution(generator);
		double b = Settings::runif();
		double t = a / sqrt(-log(b));
		double n = normDistribution(generator);
		double x = pow(10, 1.5 - 3*abs(t)) * n;
		
		double stepSize = 0;
		double newVal = this->val;

			
		if (this->distributionName == "Uniform"){

			// Wrap the value so that it bounces back into the right range
			stepSize = this->distributionParameters["uniformDistnUpperVal"] - this->distributionParameters["uniformDistnLowerVal"];
			newVal = this->val + x * stepSize;
			//newVal = Settings::wrap(newVal, this->distributionParameters["uniformDistnLowerVal"],  this->distributionParameters["uniformDistnUpperVal"]);
			this->val = newVal;
		}
				
				
		else if (this->distributionName == "Normal"){

			// Use the standard deviation as the step size
			stepSize =  this->distributionParameters["normalSdVal"];
			newVal = this->val + x * stepSize;
			this->val = newVal;

		}

		else if (this->distributionName == "Lognormal"){

			// Use the standard deviation of the normal as the step size, and perform the step in normal space then transform back into a lognormal
			stepSize = this->distributionParameters["lognormalSdVal"];
			newVal = exp(log(this->val) + x * stepSize);
			this->val = newVal;

		}	

		else{

			cout << "ERROR: SimPol cannot make proposal for: " << this->distributionName << endl;
			exit(1);

		}
				
				
		// TODO: gamma, exponential, poisson
		//cout << "Changed parameter " << this->id << " from " << this->valBeforeMakingProposal  << " to " << this->val << endl;
		
	}


	
}


// Accept proposed value (if one was proposed)
void Parameter::acceptProposal(){

	// If meta-parameter then tell all sub-parameters to accept proposal 
	if (this->isMetaParameter) {
		for (int i = 0; i < this->instances.size(); i ++){
			 this->instances.at(i)->acceptProposal();
		}
		return;
	}


	this->hasMadeProposal = false;
	this->valBeforeMakingProposal = this->val;
}


// Restores parameter to previously stored value
void Parameter::rejectProposal(){


	// If meta-parameter then tell all sub-parameters to reject proposal 
	if (this->isMetaParameter) {
		for (int i = 0; i < this->instances.size(); i ++){
			 this->instances.at(i)->rejectProposal();
		}
		return;
	}


	if (!this->hasMadeProposal) return;
	this->val = this->valBeforeMakingProposal;
	this->hasMadeProposal = false;
}


// If the parameter's value is hardcoded then it will use this value. 
// This is equivalent to giving it a fixed value but without replacing the currently stored value
void Parameter::hardcodeValue(double value){

	// If meta-parameter then tell all sub-parameters to hardcode
	if (this->isMetaParameter) {
		for (int i = 0; i < this->instances.size(); i ++) this->instances.at(i)->hardcodeValue(value);
		return;
	}


	this->isHardcoded = true;
	this->hardcodedVal = value;
	//this->val = hardcodedVal;
}

void Parameter::stopHardcoding(){

	// If meta-parameter then tell all sub-parameters to stop hardcoding
	if (this->isMetaParameter) {
		for (int i = 0; i < this->instances.size(); i ++) this->instances.at(i)->stopHardcoding();
		return;
	}


	this->isHardcoded = false;
	this->hardcodedVal = 0;
	//sample();
}


Parameter* Parameter::setDistributionParameter(string name, double value){
	if (this->isMetaParameter) return this;
	if (this->distributionParameters.find(name) == this->distributionParameters.end()) return this; // Do not add if not one of the canonical parameters
	if (!value && value != 0) return this; // Do not add if this is not a number


	// Check number is not out of range
	if (name == "fixedDistnVal" && ((this->zeroTruncated == "exclusive" && value <= 0) || (this->zeroTruncated == "inclusive" && value <  0))) return this;
	if (name == "uniformDistnLowerVal" && ((this->zeroTruncated == "exclusive" && value < 0) || (this->zeroTruncated == "inclusive" && value <  0))) return this;
	if (name == "uniformDistnUpperVal" && ((this->zeroTruncated == "exclusive" && value < 0) || (this->zeroTruncated == "inclusive" && value <  0))) return this;
	if (name == "normalSdVal" && value <= 0) return this;
	if (name == "lognormalSdVal" && value <= 0) return this;
	if (name == "exponentialDistnVal" && value <= 0) return this;
	if (name == "gammaRateVal" && value <= 0) return this;
	if (name == "gammaShapeVal" && value <= 0) return this;
	if (name == "poissonRateVal" && value <= 0) return this;
	if (distributionParameters["upperVal"] < value) return this;
	if (distributionParameters["lowerVal"] > value) return this;

	this->distributionParameters[name] = value; 
	return this;
}


// Converts the parameter into a JSON string for use by javascript (not wrapped in { })
string Parameter::toJSON(){

	string JSON = "'" + this->getID() + "':{";

	JSON += "'distribution':'" + this->distributionName + "',";
	JSON += "'val':" + to_string(this->val) + ",";
	JSON += "'name':'" + this->name + "',";
	JSON += "'title':'" + this->title + "',";
	JSON += "'integer':" + string(this->integer ? "true" : "false") + ",";
	JSON += "'hidden':" + string(this->hidden ? "true" : "false") + ",";
	JSON += "'zeroTruncated':" + (this->zeroTruncated == "false" ? string("false") : "'" + this->zeroTruncated + "'") + ",";
	if (this->latexName != "") JSON += "'latexName':'" + this->latexName + "',";

	for(std::map<string, double>::iterator iter = this->distributionParameters.begin(); iter != this->distributionParameters.end(); ++iter){
		string k =  iter->first;
		string v = to_string(iter->second);
		if (iter->second != INFINITY && iter->second != -INFINITY) JSON += "'" + k + "':" + v + ",";
	}
	JSON = JSON.substr(0, JSON.length()-1); // Remove last ,
	JSON += "}";
	return JSON;
}



void Parameter::print(){

	// Meta parameter
	if (this->isMetaParameter){
		cout << id << " (meta); current instance: " << this->currentInstance << endl;
		for (int i = 0; i < this->instances.size(); i ++){
			cout << "\t";
			this->instances.at(i)->print();
		}


	}

	// Normal parameter
	else{

		cout << id << " = " << val << ", " << distributionName << " distribution; ";
		if (this->isHardcoded) cout << "hcval = " << this->hardcodedVal << "; ";
		for(std::map<string, double>::iterator iter = this->distributionParameters.begin(); iter != this->distributionParameters.end(); ++iter){
			string k =  iter->first;
			double v = iter->second;

			cout << k << " = " << v << "; ";

		}
		cout << endl;
	}

}



// Convert this parameter to a metaparameter where it points to other parameters when asked for a value etc.
void Parameter::convertToMetaParameter(int ninstances){
	this->isMetaParameter = true;
	this->instances.resize(ninstances);
	this->currentInstance = 0;

	for (int i = 0; i < this->instances.size(); i ++){
		Parameter* instance = new Parameter(this->id + "(instance" + to_string(i) + ")", this->integer, this->zeroTruncated);
		instances.at(i) = instance;
	}

}



Parameter* Parameter::getParameterFromMetaParameter(int instanceNum){
	if (!this->isMetaParameter){
		cout << "Cannot get a parameter unless it is a meta parameter!" << endl;
		exit(0);
	}
	return this->instances.at(instanceNum);
}


vector<Parameter*> Parameter::getParameterInstances(){
	if (!this->isMetaParameter){
		cout << "Cannot get a parameter unless it is a meta parameter!" << endl;
		exit(0);
	}
	return this->instances;
}


void Parameter::setParameterInstance(int instanceNum){
	if (!this->isMetaParameter){
		cout << "Cannot set a parameter's instance unless it is a meta parameter!" << endl;
		exit(0);
	}
	this->currentInstance = instanceNum;
}


int Parameter::getNumberInstances(){
	if (this->isMetaParameter) return this->instances.size();
	else return 1;
}

bool Parameter::get_isMetaParameter(){
	return this->isMetaParameter;
}