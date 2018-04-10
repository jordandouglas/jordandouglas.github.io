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


#ifndef POLYMERASE_H
#define POLYMERASE_H


#include "Parameter.h"
#include "Model.h"
#include <string>

using namespace std;


class Polymerase{

	string id;
	string name;
	string templateType;
	string nascentType;

	// Parameters and model
	Model* polymeraseModel;
	vector<Parameter*> polymeraseParameters;


	public:

		Polymerase(string id, string name, string templateType, string nascentType);
		void setModel(Model* model);
		string getID();
		void setParameters(vector<Parameter*> params); // Set the list of parameters
		void setParameter(Parameter* param); // Only specify one parameter
		string toJSON();
		void activatePolymerase(); // Use the parameters and model associated with this polymerase
	



};


#endif

