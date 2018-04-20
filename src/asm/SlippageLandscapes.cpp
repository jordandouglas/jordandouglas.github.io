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


#include "SlippageLandscapes.h"

#include <iostream>


using namespace std;


// A class which contains information on where / how many slippage landscapes must be created by the DOM
SlippageLandscapes::SlippageLandscapes(){

	this->where_to_create_new_slipping_landscape.clear();
	this->landscapes_to_reset.clear();
	this->landscapes_to_delete.clear();

}


void SlippageLandscapes::reset(){
	this->where_to_create_new_slipping_landscape.clear();
	this->landscapes_to_reset.clear();
	this->landscapes_to_delete.clear();
}

void SlippageLandscapes::add_where_to_create_new_slipping_landscape(int val){
	this->where_to_create_new_slipping_landscape.push_back(val);
}

void SlippageLandscapes::add_landscapes_to_reset(int val){
	this->landscapes_to_reset.push_back(val);
}


void SlippageLandscapes::add_landscapes_to_delete(int val){
	this->landscapes_to_delete.push_back(val);
}



// Get the JSON string of slippage landscapes to change
string SlippageLandscapes::toJSON(){

	string slippageLandscapeJSON = "{";


	// Add the locations to create slippage landscapes
	slippageLandscapeJSON += "'where_to_create_new_slipping_landscape':[";
	for (list<int>::iterator it = this->where_to_create_new_slipping_landscape.begin(); it != this->where_to_create_new_slipping_landscape.end(); ++it){
		slippageLandscapeJSON += to_string(*it) + ",";
	}
	if (slippageLandscapeJSON.substr(slippageLandscapeJSON.length()-1, 1) == ",") slippageLandscapeJSON = slippageLandscapeJSON.substr(0, slippageLandscapeJSON.length() - 1);
	slippageLandscapeJSON += "]";



	// Add which slippage landscapes to reset
	slippageLandscapeJSON += ",'landscapes_to_reset':[";
	for (list<int>::iterator it = this->landscapes_to_reset.begin(); it != this->landscapes_to_reset.end(); ++it){
		slippageLandscapeJSON += to_string(*it) + ",";
	}
	if (slippageLandscapeJSON.substr(slippageLandscapeJSON.length()-1, 1) == ",") slippageLandscapeJSON = slippageLandscapeJSON.substr(0, slippageLandscapeJSON.length() - 1);
	slippageLandscapeJSON += "]";



	// Add which slippage landscapes to delete
	slippageLandscapeJSON += ",'landscapes_to_delete':[";
	for (list<int>::iterator it = this->landscapes_to_delete.begin(); it != this->landscapes_to_delete.end(); ++it){
		slippageLandscapeJSON += to_string(*it) + ",";
	}
	if (slippageLandscapeJSON.substr(slippageLandscapeJSON.length()-1, 1) == ",") slippageLandscapeJSON = slippageLandscapeJSON.substr(0, slippageLandscapeJSON.length() - 1);
	slippageLandscapeJSON += "]";


	slippageLandscapeJSON += "}";


	return slippageLandscapeJSON;

}




int SlippageLandscapes::get_where_to_create_new_slipping_landscape_size(){
	return this->where_to_create_new_slipping_landscape.size();
}

int SlippageLandscapes::get_landscapes_to_reset_size(){
	return this->landscapes_to_reset.size();
}

int SlippageLandscapes::get_landscapes_to_delete_size(){
	return this->landscapes_to_delete.size();
}
