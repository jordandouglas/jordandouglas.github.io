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
}


