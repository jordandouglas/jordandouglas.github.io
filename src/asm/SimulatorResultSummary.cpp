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


#include "SimulatorResultSummary.h"

#include <iostream>
#include <list>
#include <math.h>
#include <algorithm>


using namespace std;


SimulatorResultSummary::SimulatorResultSummary(int ntrials){
	this->ntrials = ntrials;
}




int SimulatorResultSummary::get_ntrials(){
	return this->ntrials;
}




void SimulatorResultSummary::set_meanVelocity(double v){
	this->meanVelocity = v;
}

double SimulatorResultSummary::get_meanVelocity(){
	return this->meanVelocity;
}




void SimulatorResultSummary::set_meanTimeElapsed(double t){
	this->meanTimeElapsed = t;
}

double SimulatorResultSummary::get_meanTimeElapsed(){
	return this->meanTimeElapsed;
}





// Return the current list of times spent at each length, from across 0 or more simulations
list<vector<double>> SimulatorResultSummary::get_proportionOfTimePerLength(){
    return this->proportionOfTimePerLength;
}


// Append a new list of time spent at each length to the preexisting list, from across 0 or more simulations
void SimulatorResultSummary::add_proportionOfTimePerLength(list<vector<double>> newProportionsOfTimePerLength){
    this->proportionOfTimePerLength.merge(newProportionsOfTimePerLength);
}


// Return the mean time spent at each length
vector<double> SimulatorResultSummary::get_meanRelativeTimePerLength(){
    return this->meanRelativeTimePerLength;
}


// Once all the times spent at each site across simulations have been collated, call this function to take the average
void SimulatorResultSummary::compute_meanRelativeTimePerLength(){


    if (this->proportionOfTimePerLength.size() == 0) return;

    // Vector of mean relative time at each position
    this->meanRelativeTimePerLength.resize(this->proportionOfTimePerLength.front().size());
    for (int i = 0; i < this->meanRelativeTimePerLength.size(); i ++){
        this->meanRelativeTimePerLength.at(i) = 0;
    }
    
    
    bool useMean = false;
    
    
    if (useMean) {

    
        // Mean time at each position this simulation
        for (list<vector<double>>::iterator it = this->proportionOfTimePerLength.begin(); it != this->proportionOfTimePerLength.end(); ++it){

           
            for (int i = 0; i < this->meanRelativeTimePerLength.size(); i ++){
                this->meanRelativeTimePerLength.at(i) = this->meanRelativeTimePerLength.at(i) + it->at(i) / this->proportionOfTimePerLength.size() ; // / totalTimeThisSimulation;
            }
            
        }
        
    
    }
    
    else {
    
        // Median time at each position this simulation
        vector<double> timesThisLength(this->proportionOfTimePerLength.size());
        double median = 0;
        for (int i = 0; i < this->meanRelativeTimePerLength.size(); i ++){
            
            
            int n = 0;
            for (list<vector<double>>::iterator it = this->proportionOfTimePerLength.begin(); it != this->proportionOfTimePerLength.end(); ++it){
                timesThisLength.at(n) = it->at(i); // Time at site i in simulation n
                n++;
            }
            
            // Sort
            std::sort(timesThisLength.begin(), timesThisLength.end());
            
            
            // Take median time
            if (timesThisLength.size() % 2 == 1) median = timesThisLength.at(floor(timesThisLength.size() / 2.0));
            else median = (timesThisLength.at(timesThisLength.size() / 2) + timesThisLength.at(timesThisLength.size() / 2 - 1)) / 2;
            
            
            this->meanRelativeTimePerLength.at(i) = median;
            
            
        }
        
    
    }


}






void SimulatorResultSummary::add_transcriptLength(int l){
	this->transcriptLengths.push_back(l);
}

void SimulatorResultSummary::add_transcriptLengths(list<int> l){
	this->transcriptLengths.merge(l);
}

list<int> SimulatorResultSummary::get_transcriptLengths(){
	return this->transcriptLengths;
}


void SimulatorResultSummary::clear(){
	this->transcriptLengths.clear();
    this->proportionOfTimePerLength.clear();
    this->meanRelativeTimePerLength.clear();
}


