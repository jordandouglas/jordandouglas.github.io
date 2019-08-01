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
#include "PosteriorDistributionSample.h"
#include "WasmMessenger.h"
#include "GelLaneData.h"

#include <iostream>
#include <vector>
#include <string>
#include <fstream>
#include <sstream>
#include <regex>

using namespace std;


PosteriorDistributionSample::PosteriorDistributionSample(int sampleNum, int numExperimentalObservations, bool ABC){
	this->sampleNum = sampleNum;
	this->simulatedValues.resize(numExperimentalObservations);
	this->simulatedDensities.resize(numExperimentalObservations);
	this->currentObsNum = 0;
	this->logPriorProb = 1;
	this->modelIndicator = "";
    this->haveCalculatedAUC = false;
    this->ROC_curve_JSON = "";

	this->ABC = ABC;
	if (!this->ABC){
		this->logLikelihood = 0;
		this->logPosterior = 0;
	}else{
		this->chiSquared = 0;
	}
}	


// Clones the object (including the simulations if specified)
PosteriorDistributionSample* PosteriorDistributionSample::clone(bool copySimulations){
	
	PosteriorDistributionSample* copy = new PosteriorDistributionSample(this->sampleNum, this->simulatedValues.size(), this->ABC);
	copy->modelIndicator = this->modelIndicator;
	copy->logPriorProb = this->logPriorProb;
	copy->logPosterior = this->logPosterior;
	copy->logLikelihood = this->logLikelihood;
    copy->ROC_curve_JSON = this->ROC_curve_JSON; 

	// Copy parameters
	for(std::map<string, double>::iterator iter = this->parameterEstimates.begin(); iter != this->parameterEstimates.end(); ++ iter){
		string paramID = iter->first;
		double value = iter->second;
		copy->addParameterEstimate(paramID, value);
	}

	if (copySimulations) {

		// Copy simulated velocities
		copy->chiSquared = this->chiSquared;
		copy->currentObsNum = this->currentObsNum;
		for (int i = 0; i < this->simulatedValues.size(); i ++){
			copy->simulatedValues.at(i) = this->simulatedValues.at(i);
		}

		// Copy band densities
		for (int i = 0; i < this->simulatedDensities.size(); i ++){
			vector<double> the_copy(this->simulatedDensities.at(i));
			copy->simulatedDensities.at(i) = the_copy;
		}
	}


	return copy;

}

void PosteriorDistributionSample::setStateNumber(int sampleNum){
	this->sampleNum = sampleNum;
}

int PosteriorDistributionSample::getStateNumber(){
	return this->sampleNum;
}

double PosteriorDistributionSample::get_chiSquared(){
	return this->chiSquared;
}

void PosteriorDistributionSample::set_logPriorProb(double val){
	this->logPriorProb = val;
}

double PosteriorDistributionSample::get_logPriorProb(){
	return this->logPriorProb;
}

void PosteriorDistributionSample::set_logLikelihood(double val){
	this->logLikelihood = val;
}

double PosteriorDistributionSample::get_logLikelihood(){
	return this->logLikelihood;
}


void PosteriorDistributionSample::set_logPosterior(double val){
	this->logPosterior = val;
}

double PosteriorDistributionSample::get_logPosterior(){
	return this->logPosterior;
}


bool PosteriorDistributionSample::isABC(){
	return this->ABC;
}

void PosteriorDistributionSample::set_modelIndicator(string val){
	this->modelIndicator = val;
}

string PosteriorDistributionSample::get_modelIndicator(){
	return this->modelIndicator;
}

void PosteriorDistributionSample::addParameterEstimate(string paramID, double val){
	this->parameterEstimates[paramID] = val;
}


double PosteriorDistributionSample::getParameterEstimate(string paramID){
	return this->parameterEstimates[paramID];
}

// Gets a list of all parameters being estimated and returns as a list of strings
vector<string> PosteriorDistributionSample::getParameterNames(){

	// Get parameter names
	list<string> paramIDs; 
	for(std::map<string, double>::iterator iter = this->parameterEstimates.begin(); iter != this->parameterEstimates.end(); ++ iter){
		string paramID =  iter->first;
		paramIDs.push_back(paramID);
	}

	vector<string> paramIDs_vector{ std::begin(paramIDs), std::end(paramIDs) };
	return paramIDs_vector;

}


// Calculate the AUC of this state and add 1-AUC to the X2
// Only applicable if pause sites are being fit to, and if the AUC has not already been calculated
// Stores a string of values to plot if saveString is enabled
void PosteriorDistributionSample::calculateAUC(bool saveString, bool calculateAgain){

    //cout << "calculateAUC" << endl;

    if (this->meanDwellTimes_pauseSites.size() == 0 && this->meanDwellTimes_notpauseSites.size() == 0) return;
    if (!calculateAgain && this->haveCalculatedAUC) return;
    this->haveCalculatedAUC = true;



    // If there are no dwell times on pause sites and/or non-pause sites then the simulation probably terminated at the very beginning
    // When there are no instances of a class, the true/false positive rate is undefined (cannot divide by 0)
    // In this case set AUC to 0
    if (this->meanDwellTimes_pauseSites.size() == 0 || this->meanDwellTimes_notpauseSites.size() == 0) {
        double AUC = 0;
        //cout << "1-AUC " << 1-AUC << endl;
        this->chiSquared += 1-AUC;
        return;
    }
    
    
    // If any given gene has a zero ratio between pause-times and non-pause-times, set AUC to 0
    for (int i = 0; !_USING_PAUSER && i < this->simulatedValues.size(); i ++){
        if (stof(this->simulatedValues.at(i)) == 0){
            double AUC = 0;
            //cout << "gene_" << i << ": 1-AUC " << 1-AUC << endl;
            this->chiSquared += 1-AUC;
            return;
        }
    }


    // Sort the pause and non-pause dwell time lists
    this->meanDwellTimes_pauseSites.sort();
    this->meanDwellTimes_notpauseSites.sort();

    // Find the maximum and minimum relative dwell times in either list
    double maxDwellTime = max(this->meanDwellTimes_pauseSites.back(), this->meanDwellTimes_notpauseSites.back());
    double minDwellTime = min(this->meanDwellTimes_pauseSites.front(), this->meanDwellTimes_notpauseSites.front());


    if (isinf(maxDwellTime) || isinf(minDwellTime) || isnan(maxDwellTime) || isnan(minDwellTime)){
        double AUC = 0;
        //cout << "1-AUC " << 1-AUC << endl;
        this->chiSquared += 1-AUC;
        return;
    }

    //cout << "calculateAUC " << maxDwellTime << "," << minDwellTime << "," << isinf(maxDwellTime) << endl; 

    


    // Initialise ROC curve object
    vector<vector<double>> ROC_curve(_N_THRESHOLDS_ROC_CURVE + 1);
    for (int i = 0; i < ROC_curve.size(); i ++){
        ROC_curve.at(i).resize(2); // False positive rate, true positive rate
    }
    double threshold_grid_size = maxDwellTime / _N_THRESHOLDS_ROC_CURVE;
    
    
    
    // Precompute thresholds
    list<double> nonpausetimes_temp = this->meanDwellTimes_notpauseSites;
    list<double> allDwellTimes = this->meanDwellTimes_pauseSites;
    allDwellTimes.merge(nonpausetimes_temp);
    allDwellTimes.sort();
    vector<double> thresholds(_N_THRESHOLDS_ROC_CURVE + 1);
    double nPointsPerThreshold = (1.0 * allDwellTimes.size()) / _N_THRESHOLDS_ROC_CURVE;
    for (int thr_index = 0; thr_index < thresholds.size() - 1 ; thr_index++){
        
        
        list<double>::iterator it = allDwellTimes.begin();
        std::advance(it, floor(nPointsPerThreshold * thr_index));
        thresholds.at(thr_index) = (*it);
        //cout << thr_index << ":" << floor(nPointsPerThreshold * thr_index) << ":" << (*it) << endl;
    
    }
    thresholds.at(thresholds.size() - 1) = maxDwellTime;
    //cout << "nPointsPerThreshold " << nPointsPerThreshold << " maxDwellTime " << maxDwellTime << endl;
    

    // Initialise iterators of sorted lists
    list<double>::iterator pauseIterator = this->meanDwellTimes_pauseSites.begin();
    list<double>::iterator nonPauseIterator = this->meanDwellTimes_notpauseSites.begin();
    int nPausesBelowThreshold = 0;
    int nNonpausesBelowThreshold = 0;
    
    

    // Calculate the AUC of a ROC curve. Search a fixed number of thresholds from min to max dwell time
    for (int i = 0; i < thresholds.size(); i ++){
        double threshold = thresholds.at(i);

        // False positive rate = proportion of non-pauses which have a relative time >= threshold
        while( (*nonPauseIterator) < threshold && nonPauseIterator != this->meanDwellTimes_notpauseSites.end()) {
            nNonpausesBelowThreshold ++;
            if (nonPauseIterator == this->meanDwellTimes_notpauseSites.end()) break;
            ++ nonPauseIterator;
        }



        // True positive rate = proportion of pauses which have a relative time >= threshold
        while( (*pauseIterator) < threshold && pauseIterator != this->meanDwellTimes_pauseSites.end()) { 
            nPausesBelowThreshold ++;
            if (pauseIterator == this->meanDwellTimes_pauseSites.end()) break;
            ++ pauseIterator;
        }



        // Calculate true and false positive rates
        double FP_rate = 1 - 1.0*nNonpausesBelowThreshold / this->meanDwellTimes_notpauseSites.size();
        double TP_rate = 1 - 1.0*nPausesBelowThreshold / this->meanDwellTimes_pauseSites.size();
        ROC_curve.at(i).at(0) = FP_rate;
        ROC_curve.at(i).at(1) = TP_rate;
    }




    // Calculate the AUC by iterating across the x-axis values
    double AUC = 0;
    for (int i = 0; i < ROC_curve.size()-1; i ++){
    
        double x0 = ROC_curve.at(i).at(0);
        double y0 = ROC_curve.at(i).at(1);
        double x1 = ROC_curve.at(i+1).at(0);
        double y1 = ROC_curve.at(i+1).at(1);
        
        double trapezoid_area = std::abs(x1 - x0) * (y0 + y1) / 2;
        AUC += trapezoid_area;


    }


    //cout << "1-AUC " << 1-AUC << endl;
    
    
    // Save the TP and FP rates to a string
    if (saveString){
    
        
        this->ROC_curve_JSON = "{";
        
        // X-axis (false positive rates)
        this->ROC_curve_JSON += "'FP':[";
        for (int i = 0; i < ROC_curve.size(); i ++){
            this->ROC_curve_JSON += to_string(ROC_curve.at(i).at(0));
            if (i < ROC_curve.size() - 1) this->ROC_curve_JSON += ",";
        }
        this->ROC_curve_JSON += "],";
        
        
        
        // Y-axis (true positive rates)
        this->ROC_curve_JSON += "'TP':[";
        for (int i = 0; i < ROC_curve.size(); i ++){
            this->ROC_curve_JSON += to_string(ROC_curve.at(i).at(1));
            if (i < ROC_curve.size() - 1) this->ROC_curve_JSON += ",";
        }
        this->ROC_curve_JSON += "]";
        this->ROC_curve_JSON += "}";
            
    }
    
    

    /*
    cout << "FP = c(";
    for (int i = 0; i < ROC_curve.size(); i ++){
        cout << ROC_curve.at(i).at(0);
        if (i < ROC_curve.size() - 1) cout << ",";
    }
    cout << ")" << endl;


    cout << "TP = c(";
    for (int i = 0; i < ROC_curve.size(); i ++){
        cout << ROC_curve.at(i).at(1);
        if (i < ROC_curve.size() - 1) cout << ",";
    }
    cout << ")" << endl;
    */


    // Ensure AUC does not go over 1 due to numerical integration
    AUC = min(AUC, 1.0);

    
    //cout << "AUC " << AUC << endl;
    
    // Add 1-AUC to the X2
    if (calculateAgain) this->chiSquared = 1-AUC;
    else this->chiSquared += 1-AUC;


}


// Cache the simulated value, and use the simulated and observed values to update the chi squared test statistic
void PosteriorDistributionSample::addSimulatedAndObservedValue(SimulatorResultSummary* simulated, ExperimentalData* observed){

    //cout << "Adding data for " << observed->getDataType() << endl;

    if (this->currentObsNum >= this->simulatedValues.size() && observed->getDataType() != "pauseSites") return;
	
	// If time gel then compare distribution of lengths
	if (observed->getDataType() == "timeGel"){
		


		GelLaneData* currentLane = observed->getCurrentLane();


		// Sample a linear model
		list<PosteriorDistributionSample*> linearModelPosteriorDistribution = Settings::getPosteriorDistributionByID(observed->getID());
		if (linearModelPosteriorDistribution.size() == 0){
			cout << "Error: Gel " << observed->getID() << " has not been calibrated!" << endl;
			exit(0);
		}
		list<PosteriorDistributionSample*>::iterator posteriorIterator = linearModelPosteriorDistribution.begin();
		std::advance(posteriorIterator, int(Settings::runif() * linearModelPosteriorDistribution.size()));
		PosteriorDistributionSample* linearModel = (*posteriorIterator);



		//
		// Calculate the observed probability densities of length for this lane
		//

		// Create empty list of probability densities at each length
		vector<double> observedLengthProbabilityDensities(templateSequence.length());
		for (int i = 0; i < observedLengthProbabilityDensities.size(); i ++) observedLengthProbabilityDensities.at(i) = 0;
		for (int i = 0; i < currentLane->getNumDensities(); i ++){


			// Turn each migration position into a length using the linear model
			double migrationPosition = currentLane->get_laneInterceptY() + i;
			int len = (int)std::round(linearModel->getParameterEstimate("slope") / migrationPosition + getParameterEstimate("intercept"));


			// If length is zero it won't show up on the gel
			if (len <= 0 || len > templateSequence.length()) continue; 


			// Calculate the band intensity from this migration distances. Longer molecules have more stain
			// We are assuming a linear releationship between transcript length and its contribution to intensity at its position 
			double density = currentLane->get_densityAt(i) / len;

			observedLengthProbabilityDensities.at(len-1) += density;


		}


		//
		// Calculate the simulated probability densities of length for this lane
		//

		// Create empty list of probability densities at each length
		vector<double> simulatedLengthProbabilityDensities(templateSequence.length());
		list<int> simulatedLengths = simulated->get_transcriptLengths();
		for (list<int>::iterator it = simulatedLengths.begin(); it != simulatedLengths.end(); ++it){

			int len = *it;

			// If length is zero it won't show up on the gel
			if (len == 0 || len > templateSequence.length()) continue; 


			// Calculate the band intensity from this migration distances. Longer molecules have more stain
			// We are assuming a linear releationship between transcript length and its contribution to intensity at its position 
			simulatedLengthProbabilityDensities.at(len-1) += len;
			

		}


		//
		// Normalise probability densities into range [0,1] (so not technically a probability distribution but proportional to one)
		//


		// Observed
		double minObsDensity = INFINITY;
		double maxObsDensity = 0;
		for (int i = 0; i < observedLengthProbabilityDensities.size(); i ++){
			maxObsDensity = std::max(maxObsDensity, observedLengthProbabilityDensities.at(i)); 
			minObsDensity = std::min(minObsDensity, observedLengthProbabilityDensities.at(i));
		}

		if (maxObsDensity - minObsDensity > 0){
			for (int i = 0; i < observedLengthProbabilityDensities.size(); i ++) observedLengthProbabilityDensities.at(i) = (observedLengthProbabilityDensities.at(i) - minObsDensity) / (maxObsDensity - minObsDensity);
		}

		else{
			for (int i = 0; i < observedLengthProbabilityDensities.size(); i ++) observedLengthProbabilityDensities.at(i) = 0;
		}


		// Simulated
		double minSimDensity = INFINITY;
		double maxSimDensity = 0;
		for (int i = 0; i < simulatedLengthProbabilityDensities.size(); i ++){
			maxSimDensity = std::max(maxSimDensity, simulatedLengthProbabilityDensities.at(i)); 
			minSimDensity = std::min(minSimDensity, simulatedLengthProbabilityDensities.at(i));
		}

		if (maxSimDensity - minSimDensity > 0){
			for (int i = 0; i < simulatedLengthProbabilityDensities.size(); i ++) simulatedLengthProbabilityDensities.at(i) = (simulatedLengthProbabilityDensities.at(i) - minSimDensity) / (maxSimDensity - minSimDensity);
		}

		else{
			for (int i = 0; i < simulatedLengthProbabilityDensities.size(); i ++) simulatedLengthProbabilityDensities.at(i) = 0;
		}



	

		// Compute chi-squared in specified lag range. Lag refers to how far the observed is behind the simulated
		// Lag = 1:
		// Sim:		1	2	3	4	5
		// Obs:			1	2	3	4	5
		int minLag = -3;
		int maxLag = 3;
		//GelLaneData* currentLane = observed->getCurrentLane();
		double chiSqLane = 0;
		for (int lag = minLag; lag <= maxLag; lag++){

			// Compute X2 at current lag
			for (int i = max(lag, 0); i < min(observedLengthProbabilityDensities.size() + lag, observedLengthProbabilityDensities.size()); i ++){
				double simVal = simulatedLengthProbabilityDensities.at(i);
				double obsVal = observedLengthProbabilityDensities.at(i); //currentLane->get_densityAt(i-lag);


				// Calculate accumulative chi-squared. Want to ensure that 0/0 = 0 and not infinity
				double chiSqTop = pow(simVal - obsVal, 2);
				if (chiSqTop != 0) chiSqLane += chiSqTop; // / abs(simVal);

				//cout << "Comparing position s" << i << " with o" << (i-lag) << " | X2 = " << chiSqTop / simVal << endl; 
				

			}

		}



		this->simulatedDensities.at(this->currentObsNum) = simulatedLengthProbabilityDensities;
		this->simulatedValues.at(this->currentObsNum) = to_string(chiSqLane);
		this->chiSquared += chiSqLane;


	}

	else if (observed->getDataType() == "pauseEscape"){


		// Calculate observed probability of being at the current site at the current time (under the log-linear model fit to the original data)
		int pauseSiteMin =  observed->get_pauseSiteMin();
		int pauseSiteMax =  observed->get_pauseSiteMax();
		//double Emax = observed->get_Emax();
		//double rate = log(2) / observed->get_t12();
		//double time = observed->getCurrentSettingX();
		double obsVal = observed->getObservation(); // Emax * exp(-time * rate);



		// Calculate simulated probability of being at the current site at the current time (by calculating the proportion of trancripts of the right length)
		double simVal = 0;
		list<int> simulatedLengths = simulated->get_transcriptLengths();
		for (list<int>::iterator it = simulatedLengths.begin(); it != simulatedLengths.end(); ++it){
			int len = *it;
			if (len >= pauseSiteMin && len <= pauseSiteMax) simVal++;
		}
		simVal = simVal / simulatedLengths.size();

		//cout << "t = " << observed->getCurrentSettingX() << "; simVal = " << simVal << "; obsVal = " << obsVal << endl;

		this->simulatedValues.at(this->currentObsNum) = to_string(simVal);

		this->chiSquared += pow(simVal - obsVal, 2);
		/*
		if (simVal == 0) this->chiSquared = INF;
		else {
			double chiSqTop = pow(simVal - obsVal, 2);
			if (chiSqTop != 0) this->chiSquared += chiSqTop / abs(simVal);
		}

		this->chiSquared = min(this->chiSquared, 1.0 * INF);
		*/

	}



	// Compare the transcript lengths at this time with the known pause sites
	else if (observed->getDataType() == "pauseSites"){
    
    
        //cout << "Adding pauseSites" << endl;
    
        vector<double> relativeDwellTimes = simulated->get_meanRelativeTimePerLength();

        // Do not calculate X2 until the very end of all experiments. Cache the relative dwell times and come back to them later
        vector<int> pauseSiteIndices = observed->get_pauseSiteIndices();
        double meanPauseTime = 0;
        double meanNonPauseTime = 0;
        int nPauses = 0;
        int nNonpauses = 0;
        for (int i = 1; i < relativeDwellTimes.size(); i ++){

            // Ignore edge effects (ie. if mean time = 0)
            if (relativeDwellTimes.at(i) <= 0) continue;

            // Is this site an observed pause site?
            bool isPauseSite = false;
            for (int j = 0; j < pauseSiteIndices.size(); j ++){
                if (i == pauseSiteIndices.at(j)){
                    isPauseSite = true;
                    break;
                }
            }

            if (isPauseSite) {
                this->meanDwellTimes_pauseSites.push_back(relativeDwellTimes.at(i));
                meanPauseTime += relativeDwellTimes.at(i);
                nPauses++;
            }
            else {
                this->meanDwellTimes_notpauseSites.push_back(relativeDwellTimes.at(i));
                meanNonPauseTime += relativeDwellTimes.at(i);
                nNonpauses++;
            }


        }

        meanPauseTime = meanPauseTime / nPauses;
        meanNonPauseTime = meanNonPauseTime / nNonpauses;
        double ratio = meanPauseTime / meanNonPauseTime;
        if (isnan(ratio) || isinf(ratio)) ratio = 0;
        if (!_USING_PAUSER) this->simulatedValues.at(this->currentObsNum) = to_string(ratio);
	    this->chiSquared += 0;

	}





	// Otherwise compare simulated and observed velocities
	else {
		
		
		double simVal = simulated->get_meanVelocity();
		double obsVal = observed->getObservation();

		this->simulatedValues.at(this->currentObsNum) = to_string(simVal);

		// Calculate accumulative chi-squared. Want to ensure that 0/0 = 0 and not infinity
		if (simVal == 0) this->chiSquared = INF;
		else {
			double chiSqTop = pow(simVal - obsVal, 2);
			if (chiSqTop != 0) this->chiSquared += chiSqTop / abs(simVal);
		}

		this->chiSquared = min(this->chiSquared, 1.0 * INF);

		//Settings::print();
		//cout << "Simval " << simVal << "; obsVal " << obsVal << "; X2 " << this->chiSquared << endl;

	}

	this->currentObsNum ++;


}



// Prints the first row (ie. column names instead of values)
void PosteriorDistributionSample::printHeader(bool toFile){


	// Send to javascript if using WASM
	string WASM_string = "";

	// Using ampersand instead of tab and exclaimation mark instead of new line when sending to the DOMS
	string gapUnit = _USING_GUI && !toFile ? "&" : "\t";
	string endLine = _USING_GUI && !toFile ? "!" : "\n";


	// Attempt to open up file if applicable. Do not append
	ofstream* logFile;
	if (toFile && !_USING_GUI) {
		logFile = new ofstream(_outputFilename);
		if (!logFile->is_open()) {
			cout << "Cannot open file " << _outputFilename << endl;
			exit(0);
		}
	}

	if (isWASM) WASM_string += "State\t";
	else (_USING_GUI ? _ABCoutputToPrint : toFile ? (*logFile) : cout) << "State" << gapUnit;

	// Print model indicator
	if (this->modelIndicator != ""){
		if (isWASM) WASM_string += "Model" + gapUnit;
		else (_USING_GUI ? _ABCoutputToPrint : toFile ? (*logFile) :  cout) << "Model" << gapUnit;
	}

	// Print parameter names
	for(std::map<string, double>::iterator iter = this->parameterEstimates.begin(); iter != this->parameterEstimates.end(); ++ iter){
		string paramID =  iter->first;
		if (paramID.substr(0,3) == "len") continue; // HACK: Don't print the transcript length variables since we want to integrate over them
		if (isWASM) WASM_string += paramID + gapUnit;
		else (_USING_GUI ? _ABCoutputToPrint : toFile ? (*logFile) : cout) << paramID << gapUnit;
	}

	// Print 'V'N for each observation 
	for (int i = 0; i < this->simulatedValues.size(); i ++){
		if (isWASM) WASM_string += "V" + to_string(i+1) + gapUnit;
		else (_USING_GUI ? _ABCoutputToPrint : toFile ? (*logFile) :  cout) << "V" << (i+1) << gapUnit;
	}

	// Print prior and either (likelihood and posterior) OR (chi-squared)
	string priorStr = "";
	priorStr += "logPrior" + gapUnit;
	if (!this->ABC){
		priorStr += "logLikelih" + gapUnit + "logPosteri" + endLine;
	}
	else priorStr += "rho" + endLine;

	(_USING_GUI ? _ABCoutputToPrint : toFile ? (*logFile) : cout) << priorStr;
	
	
	if (toFile && !_USING_GUI) logFile->close();
	
	if (isWASM) {
		WasmMessenger::printLogFileLine(WASM_string, false);
	}


}



void PosteriorDistributionSample::print(bool toFile){

	// Print to 10 sf
	std::cout.precision(10);

	// Send to javascript if using WASM
	string WASM_string = "";

	// Using ampersand instead of tab and exclaimation mark instead of new line when sending to the DOMS
	string gapUnit = _USING_GUI && !toFile ? "&" : "\t";
	string endLine = _USING_GUI && !toFile ? "!" : "\n";

	
	// Attempt to open up file if applicable. Append to end of file
	ofstream logFile;
	if (toFile && !_USING_GUI) {
		//logFile = new ofstream(_outputFilename);
		logFile.open(_outputFilename, ios_base::app);
		if (!logFile.is_open()) {
			cout << "Cannot open file " << _outputFilename << endl;
			exit(0);
		}
		logFile.precision(10);
		logFile.setf(ios::fixed);
		logFile.setf(ios::showpoint); 
	}
	
	if (isWASM) WASM_string += to_string(this->sampleNum) + gapUnit;
	else (_USING_GUI ? _ABCoutputToPrint : toFile ? logFile  : cout) << this->sampleNum << gapUnit;

	// Print model indicator
	if (this->modelIndicator != "") {
		if (isWASM) WASM_string += this->modelIndicator + gapUnit;
		else ( _USING_GUI ? _ABCoutputToPrint :toFile ? logFile  : cout) << this->modelIndicator << gapUnit;
		
	}

	// Print parameter values
	for(std::map<string, double>::iterator iter = this->parameterEstimates.begin(); iter != this->parameterEstimates.end(); ++ iter){
		string paramID = iter->first;
		if (paramID.substr(0,3) == "len") continue; // HACK: Don't print the transcript length variables since we want to integrate over them
		double value = iter->second;
		if (isWASM) WASM_string += to_string(value) + gapUnit;
		else (_USING_GUI ? _ABCoutputToPrint : toFile ? logFile  :  cout) << value << gapUnit;
	}
	
	// Print simulated values
	for (int i = 0; i < this->simulatedValues.size(); i ++){
		if (isWASM) WASM_string += "'" + simulatedValues.at(i) + "'" + gapUnit;
		else (_USING_GUI ? _ABCoutputToPrint :toFile ? logFile  : cout) << simulatedValues.at(i) << gapUnit;
	}


	// Print prior and either (likelihood and posterior) OR (chi-squared)
	string priorStr = "";
	priorStr += to_string(this->logPriorProb) + gapUnit;
	if (!this->ABC){
		priorStr += to_string(this->logLikelihood)  + gapUnit + to_string(this->logPosterior)  + endLine;
	}
	else priorStr += to_string(this->chiSquared)  + endLine;

	(_USING_GUI ? _ABCoutputToPrint : toFile ? logFile : cout) << priorStr;
	
	
	if (toFile && !_USING_GUI) logFile.close();
	
	
	if (isWASM) {
		WasmMessenger::printLogFileLine(WASM_string, true);
	}

}



string PosteriorDistributionSample::toJSON(){

	string JSON = "{";

	if (this->ABC){


		// Simulated values
		JSON += "'simulatedValues':[";
		for (int i = 0; i < this->simulatedValues.size(); i ++){
			JSON += "'" + this->simulatedValues.at(i) + "',";
		}
		if (JSON.substr(JSON.length()-1, 1) == ",") JSON = JSON.substr(0, JSON.length() - 1);

		JSON += "],";


		//if (this->simulatedDensities.size() > 0) cout << "this->simulatedDensities.size() " << this->simulatedDensities.size() << " this->simulatedDensities.at(0).size() " << this->simulatedDensities.at(0).size() << endl;

		// Simulated bands
		JSON += "'simulatedDensities':[";
		for (int i = 0; i < this->simulatedDensities.size(); i ++){
			JSON += "[";
			for (int j = 0; j < this->simulatedDensities.at(i).size(); j ++){
				JSON += to_string(this->simulatedDensities.at(i).at(j)) + ",";
			}
			if (JSON.substr(JSON.length()-1, 1) == ",") JSON = JSON.substr(0, JSON.length() - 1);
			JSON += "],";

		}
		if (JSON.substr(JSON.length()-1, 1) == ",") JSON = JSON.substr(0, JSON.length() - 1);
		JSON += "]";



	}else{


		// Print parameter values
		for(std::map<string, double>::iterator iter = this->parameterEstimates.begin(); iter != this->parameterEstimates.end(); ++ iter){
			string paramID = iter->first;
			double value = iter->second;
			JSON += "'" + paramID + "':" + to_string(value) + ",";
		}

		if (JSON.substr(JSON.length()-1, 1) == ",") JSON = JSON.substr(0, JSON.length() - 1);


	}


	JSON += "}";
	return JSON;

}


// Sets this state to the last state in the specified log file
void PosteriorDistributionSample::loadFromLogFile(string filename){




	// Get the last line in the logfile
	ifstream logfile;
	string line;
    logfile.open(filename);
    if(logfile.is_open()) {

    	// Get number of lines
    	int numLines = 0;
    	vector<string> headerLineSplit;
    	bool headerParsed = false;
        while(getline(logfile, line)) {
        
        

        	if (line == "" || line == "\n") break;
        	numLines++;

        	// Parse first line
        	if (!headerParsed){
        		headerParsed = true;
        		headerLineSplit = Settings::split(line, '\t');
        	}


        }


        // Get last line and parse it
        logfile.clear();
		logfile.seekg(0, ios::beg);
        int currentLine = 0;

        vector<string> splitLine;
        while(getline(logfile, line)) {
        	currentLine++;
        	

        	// Parse this line
        	if (currentLine == numLines) {
        		splitLine = Settings::split(line, '\t');
        		parseFromLogFileLine(splitLine, headerLineSplit);
        		splitLine.clear();
        	}
        }

        logfile.close();
        headerLineSplit.clear();

    } else {
    
    	cout << "Could not open " << filename << endl;
    }

}



void PosteriorDistributionSample::parseFromLogFileLine(vector<string> splitLine, vector<string> headerLineSplit){

	cout << "parseFromLogFileLine" << endl;

	regex velocityMatch("(V)([0-9]+)$");

	int simulatedVal = 0;

	for (int i = 0; i < headerLineSplit.size(); i ++){

		string header = headerLineSplit.at(i);
		string value = splitLine.at(i);

		//cout << "i = " << i << endl;
		//cout << header << " = " << value << endl;
		
		

		if (header == "Model") this->set_modelIndicator(value);
		else if (header == "State") this->setStateNumber(stoi(value));
		else if (header == "logPrior") this->logPriorProb = stof(value);
		else if (header == "rho" || header == "chiSquared") this->chiSquared = stof(value);
		else if (std::regex_match (header, velocityMatch)) {
			simulatedValues.at(simulatedVal) = value; // Parse value
			simulatedVal++;
		}
		else {
			this->addParameterEstimate(header, stof(value)); // Parse parameter
		}
	}


}



// Update global settings to the parameters etc. specified by this state
void PosteriorDistributionSample::setParametersFromState(){
	
	


	// Set the parameters
	regex instanceMatch("(.+)(instance[0-9]+)(.+)");
	for(map<string, double>::iterator iter = this->parameterEstimates.begin(); iter != this->parameterEstimates.end(); ++iter){
		string paramID =  iter->first;
		double value = iter->second;
		


		// If parameter has multiple instances then need to do one at a time
		if (regex_match (paramID, instanceMatch)){

			// Convert PARAMID(instancex) into string paramID = PARAMID and int instanceNum = x
			vector<string> splitLine = Settings::split(paramID, '(');
			paramID = splitLine.at(0);
			string instanceNum_str = splitLine.at(1).substr(8); // Remove "instance"
			int instanceNum = stoi(instanceNum_str.substr(0, instanceNum_str.size()-1)); // Remove ")"
			splitLine.clear();

			Parameter* param = Settings::getParameterByName(paramID);
			if (param != nullptr){
				param->getParameterFromMetaParameter(instanceNum)->setVal(value);
			}

			else {
				cout << "ERROR: Cannot find parameter " << paramID << endl;
				exit(0);
			}

		}


		// Single instance
		else{

			Parameter* param = Settings::getParameterByName(paramID);
			if (param != nullptr){
				param->setVal(value);
			}

		

			else {
				cout << "ERROR: Cannot find parameter " << paramID << endl;
				exit(0);
			}

		}


	}

	// Set model number
	Settings::setModel(this->get_modelIndicator());


	// Update the global settings to apply the parameters in this model
	Settings::clearParameterHardcodings();
	currentModel->activateModel();



}


string PosteriorDistributionSample::get_ROC_curve_JSON(){
    return this->ROC_curve_JSON;
}