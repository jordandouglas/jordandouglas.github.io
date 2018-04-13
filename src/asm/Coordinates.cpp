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


#include "Coordinates.h"
#include "Settings.h"


#include <string>
#include <iostream>
#include <algorithm> 


using namespace std;


vector<HTMLobject*> Coordinates::TemplateSequenceHTMLObjects; // All nucleotides in the template sequence and their coordinates etc.
vector<HTMLobject*> Coordinates::NascentSequenceHTMLObjects; // All nucleotides in the nascent sequence and their coordinates etc.
vector<HTMLobject*> Coordinates::ComplementSequenceHTMLObjects; // All nucleotides in the complement sequence and their coordinates etc.
list<HTMLobject*> Coordinates::HTMLobjects; // All other objects and their coordinates etc.

list<HTMLobject*> Coordinates::unrenderedObjects; // A subset of the above 4 arrays. Only contains objects which have had a recent change



// Get duration (ms) of each reaction-animation from the animation speed string
int Coordinates::getAnimationTime(){

	// Slow, medium, fast only apply simulating and transcribing/stuttering. If user presses button then should animate slowly
	if (!_GUI_simulating && !_applyingReactionsGUI) return 200;

	if (_animationSpeed == "slow") return 200;
	if (_animationSpeed == "medium") return 60;
	if (_animationSpeed == "fast") return 4;
	return 0; // Hidden does not animate it just changes
}


// Return the nucleotide object at the specified position
HTMLobject* Coordinates::getNucleotide(int pos, string whichSeq){

	HTMLobject* nt;

	if (whichSeq == "g" && pos < Coordinates::TemplateSequenceHTMLObjects.size()) nt = Coordinates::TemplateSequenceHTMLObjects.at(pos);
	else if (whichSeq == "m" && pos < Coordinates::NascentSequenceHTMLObjects.size()) nt = Coordinates::NascentSequenceHTMLObjects.at(pos);
	else if (whichSeq == "o" && pos < Coordinates::ComplementSequenceHTMLObjects.size()) nt = Coordinates::ComplementSequenceHTMLObjects.at(pos);

	return nt;


}

// Set the coordinates of the polymerase to that of the initial state 
void Coordinates::resetToInitialState(){


	Coordinates::clearAllCoordinates();

	// Set length of each vector as the length of the template sequence. Nascent sequence may need to later be expanded to account for insertions
	// Add 1 for the 5 or 3 prime tag
	Coordinates::TemplateSequenceHTMLObjects.resize(templateSequence.length() + 1);
	Coordinates::NascentSequenceHTMLObjects.resize(templateSequence.length() + 1);
	Coordinates::ComplementSequenceHTMLObjects.resize(complementSequence.length() + 1);


	// Initial coordinates
	double startX = 225;
	double startY = 3 + 75;
	int index = 1;


	// Create the polymerase
	Coordinates::create_pol(165, 81, "pol");


	// Create the 3 and 5 prime tags
	if (TemplateType.substr(0,2) == "ds")  {
		if (TemplateType == "dsRNA") Coordinates::create_nucleotide(0, "o", startX-75, startY - 25 - 26, "5", "5RNA", false);
		else Coordinates::create_nucleotide(0, "o", startX-75, startY - 25 - 26, "5", "5DNA", false);
	}

	if (TemplateType.substr(2) == "RNA") Coordinates::create_nucleotide(0, "g", startX-75, startY + 52, "3", "3RNA", false);
	else Coordinates::create_nucleotide(0, "g", startX-75, startY + 52, "3", "3DNA", false);
	
	if (PrimerType.substr(2) == "RNA") Coordinates::create_nucleotide(0, "m", startX-75, startY + 77, "5", "5RNA", false);
	else Coordinates::create_nucleotide(0, "m", startX-75, startY + 77, "5", "5DNA", false);



	for (int i = 0; i < templateSequence.length(); i++) {


		string baseToAdd = templateSequence.substr(i, 1);
		if (baseToAdd != "A" && baseToAdd != "C" && baseToAdd != "G" && baseToAdd != "T" && baseToAdd != "U") baseToAdd = "X";


		if (index < hybridLen->getVal()){


			Coordinates::create_nucleotide(index, "g", startX, startY + 52, baseToAdd, baseToAdd + "g", false);
			string oppositeCol = baseToAdd == "G" ? "C" : baseToAdd == "C" ? "G" : baseToAdd == "A" ? "U" : baseToAdd == "U" ? "A" : baseToAdd == "T" ? "A" : "X";

			if (PrimerType.substr(2) == "RNA" && oppositeCol == "T") oppositeCol = "U";
			if (PrimerType.substr(2) == "DNA" && oppositeCol == "U") oppositeCol = "T";


			Coordinates::create_nucleotide(index, "m", startX, startY + 77, oppositeCol, oppositeCol + "m", false);


			// The strand complementary to the template (if ds)
			if (TemplateType == "dsRNA"){
				oppositeCol = baseToAdd == "G" ? "C" : baseToAdd == "C" ? "G" : baseToAdd == "A" ? "U" : baseToAdd == "U" ? "A" : "X";
				if (PrimerType.substr(0,2) != "ds") Coordinates::create_nucleotide(index, "o", startX, startY - 25 - 26, oppositeCol, oppositeCol + "g", false);
				else Coordinates::create_nucleotide(index, "o", startX, startY - 25 - 26, oppositeCol, oppositeCol + "m", false);
			}	

			if (TemplateType == "dsDNA"){
				oppositeCol = baseToAdd == "G" ? "C" : baseToAdd == "C" ? "G" : baseToAdd == "A" ? "T" : baseToAdd == "T" ? "A" : "X";
				if (PrimerType.substr(0,2) != "ds") Coordinates::create_nucleotide(index, "o", startX, startY - 25 - 26, oppositeCol, oppositeCol + "g", false);
				else Coordinates::create_nucleotide(index, "o", startX, startY - 25 - 26, oppositeCol, oppositeCol + "m", false);
			}


		}else{

			double dy = 52 - std::min(52.0, (index - (hybridLen->getVal()-1)) * 52/(bubbleRight->getVal()+1));
			if (TemplateType.substr(0,2) == "ds") {
				Coordinates::create_nucleotide(index, "g", startX, startY + dy, baseToAdd, baseToAdd + "m", false);
			}
			else {
				Coordinates::create_nucleotide(index, "g", startX, startY + dy, baseToAdd, baseToAdd + "g", false);
			}


			// The strand complementary to the template (if ds)
			if (TemplateType == "dsRNA"){
				string oppositeCol = baseToAdd == "G" ? "C" : baseToAdd == "C" ? "G" : baseToAdd == "A" ? "U" : baseToAdd == "U" ? "A" : "X";
				Coordinates::create_nucleotide(index, "o", startX, startY - 25 - dy/2, oppositeCol, oppositeCol + "g", false);
			}

			if (TemplateType == "dsDNA"){
				string oppositeCol = baseToAdd == "G" ? "C" : baseToAdd == "C" ? "G" : baseToAdd == "A" ? "T" : baseToAdd == "T" ? "A" : "X";
				Coordinates::create_nucleotide(index, "o", startX, startY - 25 - dy/2, oppositeCol, oppositeCol + "g", false);
			}

		}


		startX += 25;
		index ++;

	}
		


}




// Deletes all coordinate objects
void Coordinates::clearAllCoordinates(){


	// Clear the lists of HTML objects and instruct the controller to delete everything
	for (int i = 0; i < Coordinates::TemplateSequenceHTMLObjects.size(); i ++) delete Coordinates::TemplateSequenceHTMLObjects.at(i);
	for (int i = 0; i < Coordinates::NascentSequenceHTMLObjects.size(); i ++) delete Coordinates::NascentSequenceHTMLObjects.at(i);
	for (int i = 0; i < Coordinates::ComplementSequenceHTMLObjects.size(); i ++) delete Coordinates::ComplementSequenceHTMLObjects.at(i);
	for (list<HTMLobject*>::iterator it = Coordinates::HTMLobjects.begin(); it != Coordinates::HTMLobjects.end(); ++it) delete (*it);

	Coordinates::TemplateSequenceHTMLObjects.clear();
	Coordinates::NascentSequenceHTMLObjects.clear();
	Coordinates::ComplementSequenceHTMLObjects.clear();
	Coordinates::HTMLobjects.clear();
	Coordinates::unrenderedObjects.clear();

	unrenderedObjects.push_back(new HTMLobject("clear"));

}



// Generate all coordinates for this state, and adds the current cooordinates of all objects to the list of unrendered objects (eg. everything has been deleted from DOM and now must be added back)
void Coordinates::generateAllCoordinates(State* state){

	

	// Coordinates of pol
	double polX = 165 + 25*state->getLeftBaseNumber(); 
	double polY = 81;

	Coordinates::move_obj_absolute("pol", polX, polY);
	Coordinates::change_src_of_object_from_id("pol", string(state->get_activated() ? "pol" : "pol_U")); // Activated or deactivated?

	// Coordinates of nascent bases
	double dy = 0;
	for (int i = 0; i <= state->get_NascentSequence().length(); i ++){

		double ntX = 200 + 25*i;
		if (i == 0) ntX = 150;



		// Y value determined by whether it is part of hybrid, bubble or on the bottom
		double ntY = 207;
		if (PrimerType.substr(0,2) == "ss"){
			if (i <= state->getLeftNascentBaseNumber() && i > state->getLeftNascentBaseNumber()  - (bubbleLeft->getVal()+1) && i >= 0) dy += -52/(bubbleLeft->getVal()+1);
			if (i > state->getRightNascentBaseNumber() && i < state->getRightNascentBaseNumber() + (bubbleRight->getVal()+1) + 1) dy += 52/(bubbleRight->getVal()+1);
		} else ntY -= 52;



		// Bases may have been deleted due to termination -> create objects again
		if (!Coordinates::move_nt_absolute(i, "m", ntX, ntY + dy)){
			string baseStr = i == 0 ? "5" : state->get_NascentSequence().substr(i-1, 1);
			string src = baseStr == "5" ? "5" + PrimerType.substr(2) : baseStr + "m";
			Coordinates::create_nucleotide(i, "m", ntX, ntY + dy, baseStr, src, false);
		} 


		// Is NTP bound?
		if (i == state->get_NascentSequence().length()-1 && state->NTPbound()){
			ntX += 10;
			ntY += 10;
		}else Coordinates::set_TP_state(i, "m", false);





	}



	// Coordinates of template bases
	dy = 0;
	for (int i = 0; i <= templateSequence.length(); i ++){

		double ntX = 200 + 25*i;
		if (i == 0) ntX = 150;

		// Y value determined by whether it is part of hybrid, bubble or on the bottom
		double ntY = 78;
		if (PrimerType.substr(0,2) == "ss"){
			if (i <= state->getLeftTemplateBaseNumber() &&  i > state->getLeftTemplateBaseNumber()  - (bubbleLeft->getVal()+1) && i >= 0) dy += 52/(bubbleLeft->getVal()+1);
			if (i > state->getRightTemplateBaseNumber() && i < state->getRightTemplateBaseNumber() + (bubbleRight->getVal()+1) + 1) dy += -52/(bubbleRight->getVal()+1);
		} else ntY += 52;

		//if (SEQS_JS.all_sequences[sequenceID]["primer"] != "dsRNA") 
		//for (i = state["leftMBase"] - 1; UPDATE_COORDS &&  i > state["leftMBase"] - (PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1) - 1 && i >= 0; i--) WW_JS.move_nt_WW(i, "m", 0, -52/(PARAMS_JS.PHYSICAL_PARAMETERS["bubbleLeft"]["val"]+1));

		 Coordinates::move_nt_absolute(i, "g", ntX, ntY + dy); 


		 // Orientation
		 if (i > 0 && i <= state->getRightTemplateBaseNumber() + bubbleRight->getVal() && i >= state->getLeftTemplateBaseNumber()) Coordinates::flip_base(i, "g", "g"); 
		 else if (i > 0) Coordinates::flip_base(i, "g", "m"); 

		 // Complementary strand
		 if (TemplateType.substr(0,2) == "ds"){
		 	ntY = 53;
		 	Coordinates::move_nt_absolute(i, "o", ntX, ntY - dy/2); 

		 } 

	}



}


// Returns a JSON string which contains information on what changes must be made (eg. on the next animation frame)
// Clears the list of unrendered objects if requested
string Coordinates::getUnrenderedObjectsJSON(bool clearList){


	string JSON = "[";
	for (list<HTMLobject*>::iterator it = Coordinates::unrenderedObjects.begin(); it != Coordinates::unrenderedObjects.end(); ++it){
		JSON += (*it)->toJSON(clearList) + ",";
		if ((*it)->get_needsDeleting()) delete (*it);
	}

	if (JSON.substr(JSON.length()-1, 1) == ",") JSON = JSON.substr(0, JSON.length() - 1);
	if (clearList) Coordinates::unrenderedObjects.clear();

	JSON += "]";
	return JSON;

}



// Create the object and add it to the list of objects and unrendered objects
void Coordinates::create_HTMLobject(string id, double x, double y, double width, double height, string src, int zIndex){
	
	HTMLobject* obj = new HTMLobject(id, x, y, width, height, src, Coordinates::getAnimationTime(), zIndex);
	Coordinates::HTMLobjects.push_back(obj);
	Coordinates::unrenderedObjects.push_back(obj);

}


void Coordinates::create_pol(double x, double y, string src){

	double width = hybridLen->getVal() * 25 + 75;
	double height = 140;
	Coordinates::create_HTMLobject("pol", x, y, width, height, src, 1);

}


void Coordinates::create_nucleotide(int pos, string whichSeq, double x, double y, string baseStr, string src, bool hasTP){


	bool labelBase = baseStr == "3" || baseStr == "5";
	double width = (labelBase ? 76 : 20); // 3 and 5 prime tags are wider
	double height = 20;


	HTMLobject* nt = new HTMLobject(whichSeq + to_string(pos), x, y, width, height, src, Coordinates::getAnimationTime(), 3, baseStr, whichSeq, hasTP, pos);
	Coordinates::unrenderedObjects.push_back(nt);

	// Must add this object to the right sequence vector
	if (whichSeq == "g") Coordinates::TemplateSequenceHTMLObjects.at(pos) = nt;
	else if (whichSeq == "m") Coordinates::NascentSequenceHTMLObjects.at(pos) = nt;
	else if (whichSeq == "o") Coordinates::ComplementSequenceHTMLObjects.at(pos) = nt;

}


// Move the HTML object by updating its coordinates and adding to the list of unrendered objects
void Coordinates::move_obj(HTMLobject* obj, double dx, double dy){


	// Add this object to the unrendered list if it is not already
	if (!obj->get_needsGenerating() && !obj->get_needsAnimating() && !obj->get_needsSourceUpdate() && !obj->get_needsDeleting()) Coordinates::unrenderedObjects.push_back(obj);


	obj->displace(dx, dy);
	obj->setAnimationTime(Coordinates::getAnimationTime());

}


// Find the object with the corresponding ID and then move it
void Coordinates::move_obj_from_id(string id, double dx, double dy){


	HTMLobject* obj;
	for (list<HTMLobject*>::iterator it = Coordinates::HTMLobjects.begin(); it != Coordinates::HTMLobjects.end(); ++it){
		if ((*it)->getID() == id){
			obj = (*it);
			break;
		}
	}
	if (obj == nullptr) return;

	Coordinates::move_obj(obj, dx, dy);
}


void Coordinates::move_nt(int pos, string whichSeq, double dx, double dy){
	
	HTMLobject* nt;

	// Get the nucleotide out of the sequence
	if (whichSeq == "g" && pos < Coordinates::TemplateSequenceHTMLObjects.size()) nt = Coordinates::TemplateSequenceHTMLObjects.at(pos);
	else if (whichSeq == "m" && pos < Coordinates::NascentSequenceHTMLObjects.size()) nt = Coordinates::NascentSequenceHTMLObjects.at(pos);
	else if (whichSeq == "o" && pos < Coordinates::ComplementSequenceHTMLObjects.size()) nt = Coordinates::ComplementSequenceHTMLObjects.at(pos);
	if (nt == nullptr) return;

	Coordinates::move_obj(nt, dx, dy);


}



void Coordinates::move_obj_absolute(string id, double newX, double newY){



	HTMLobject* obj;
	for (list<HTMLobject*>::iterator it = Coordinates::HTMLobjects.begin(); it != Coordinates::HTMLobjects.end(); ++it){
		if ((*it)->getID() == id){
			obj = (*it);
			break;
		}
	}
	if (obj == nullptr) return;

	double dx = newX - obj->getX();
	double dy = newY - obj->getY();
	Coordinates::move_obj(obj, dx, dy);


}


bool Coordinates::move_nt_absolute(int pos, string whichSeq, double newX, double newY){


	HTMLobject* nt;

	// Get the nucleotide out of the sequence
	if (whichSeq == "g" && pos < Coordinates::TemplateSequenceHTMLObjects.size()) nt = Coordinates::TemplateSequenceHTMLObjects.at(pos);
	else if (whichSeq == "m" && pos < Coordinates::NascentSequenceHTMLObjects.size()) nt = Coordinates::NascentSequenceHTMLObjects.at(pos);
	else if (whichSeq == "o" && pos < Coordinates::ComplementSequenceHTMLObjects.size()) nt = Coordinates::ComplementSequenceHTMLObjects.at(pos);


	if (nt == nullptr) return false;


	double dx = newX - nt->getX();
	double dy = newY - nt->getY();

	Coordinates::move_obj(nt, dx, dy);

	return true;

}


/*
void Coordinates::setXYWHsrc(string id, double x, double y, double width, double height, string src){

	HTMLobject* obj;
	for (list<HTMLobject*>::iterator it = Coordinates::HTMLobjects.begin(); it != Coordinates::HTMLobjects.end(); ++it){
		if ((*it)->getID() == id){
			obj = (*it);
			break;
		}
	}
	if (obj == nullptr) return;


	if (!obj->get_needsGenerating() && !obj->get_needsAnimating() && !obj->get_needsSourceUpdate() && !obj->get_needsDeleting()) Coordinates::unrenderedObjects.push_back(obj);
	obj->setX();


}
*/

void Coordinates::change_src_of_object(HTMLobject* obj, string newSrc){

	if (!obj->get_needsGenerating() && !obj->get_needsAnimating() && !obj->get_needsSourceUpdate() && !obj->get_needsDeleting()) Coordinates::unrenderedObjects.push_back(obj);
	obj->updateSrc(newSrc);

}



void Coordinates::change_src_of_object_from_id(string id, string newSrc){

	HTMLobject* obj;
	for (list<HTMLobject*>::iterator it = Coordinates::HTMLobjects.begin(); it != Coordinates::HTMLobjects.end(); ++it){
		if ((*it)->getID() == id){
			obj = (*it);
			break;
		}
	}
	if (obj == nullptr) return;

	Coordinates::change_src_of_object(obj, newSrc);

}



void Coordinates::flip_base(int pos, string flipFrom, string flipTo){

	HTMLobject* nt;

	// Get the nucleotide out of the sequence
	if (flipFrom == "g" && pos < Coordinates::TemplateSequenceHTMLObjects.size()) nt = Coordinates::TemplateSequenceHTMLObjects.at(pos);
	else if (flipFrom == "m" && pos < Coordinates::NascentSequenceHTMLObjects.size()) nt = Coordinates::NascentSequenceHTMLObjects.at(pos);
	else if (flipFrom == "o" && pos < Coordinates::ComplementSequenceHTMLObjects.size()) nt = Coordinates::ComplementSequenceHTMLObjects.at(pos);
	if (nt == nullptr) return;

	string newSrc = nt->getBase() + flipTo;
	Coordinates::change_src_of_object(nt, newSrc);


}


// Add or remove a triphosphate (TP) to the nucleotide
void Coordinates::set_TP_state(int pos, string whichSeq, bool addTP){


	HTMLobject* nt;

	// Get the nucleotide out of the sequence
	if (whichSeq == "g" && pos < Coordinates::TemplateSequenceHTMLObjects.size()) nt = Coordinates::TemplateSequenceHTMLObjects.at(pos);
	else if (whichSeq == "m" && pos < Coordinates::NascentSequenceHTMLObjects.size()) nt = Coordinates::NascentSequenceHTMLObjects.at(pos);
	else if (whichSeq == "o" && pos < Coordinates::ComplementSequenceHTMLObjects.size()) nt = Coordinates::ComplementSequenceHTMLObjects.at(pos);
	if (nt == nullptr) return;


	if (nt->get_hasTP() != addTP && !nt->get_needsGenerating() && !nt->get_needsAnimating() && !nt->get_needsSourceUpdate() && !nt->get_needsDeleting()) {
		Coordinates::unrenderedObjects.push_back(nt);
		nt->set_needsAnimating();
	}

	nt->setTP(addTP);

}



void Coordinates::delete_HTMLobj(string id){

	
	HTMLobject* obj;
	for (list<HTMLobject*>::iterator it = Coordinates::HTMLobjects.begin(); it != Coordinates::HTMLobjects.end(); ++it){
		if ((*it)->getID() == id){
			obj = (*it);
			break;
		}
	}
	if (obj == nullptr) return;

	if (!obj->get_needsGenerating() && !obj->get_needsAnimating() && !obj->get_needsSourceUpdate() && !obj->get_needsDeleting()) Coordinates::unrenderedObjects.push_back(obj);
	obj->deleteObject();


}




void Coordinates::delete_nt(int pos, string whichSeq){


	HTMLobject* nt;

	// Get the nucleotide out of the sequence
	if (whichSeq == "g" && pos < Coordinates::TemplateSequenceHTMLObjects.size()) {
		nt = Coordinates::TemplateSequenceHTMLObjects.at(pos);
		Coordinates::TemplateSequenceHTMLObjects.at(pos) = nullptr;
	}
	else if (whichSeq == "m" && pos < Coordinates::NascentSequenceHTMLObjects.size()) {
		nt = Coordinates::NascentSequenceHTMLObjects.at(pos);
		Coordinates::NascentSequenceHTMLObjects.at(pos) = nullptr;
	}
	else if (whichSeq == "o" && pos < Coordinates::ComplementSequenceHTMLObjects.size()) {
		nt = Coordinates::ComplementSequenceHTMLObjects.at(pos);
		Coordinates::ComplementSequenceHTMLObjects.at(pos) = nullptr;

	}
	if (nt == nullptr) return;

	
	if (!nt->get_needsGenerating() && !nt->get_needsAnimating() && !nt->get_needsSourceUpdate() && !nt->get_needsDeleting()) Coordinates::unrenderedObjects.push_back(nt);
	nt->deleteObject();


}



bool Coordinates::objectExists(string id){

	for (list<HTMLobject*>::iterator it = Coordinates::HTMLobjects.begin(); it != Coordinates::HTMLobjects.end(); ++it){
		if ((*it)->getID() == id) return true;
	}
	return false;
}


HTMLobject* Coordinates::getObjectByID(string id){

	HTMLobject* obj;
	for (list<HTMLobject*>::iterator it = Coordinates::HTMLobjects.begin(); it != Coordinates::HTMLobjects.end(); ++it){
		if ((*it)->getID() == id) return (*it);
	}
	return nullptr;
}





// Updates the coordinates of the force equipment
void Coordinates::updateForceEquipment(double newForce){


	// If force is removed/added then delete/create the force equipment
	Coordinates::remove_force_equipment();
	Coordinates::add_force_equipment(newForce);

}


// Updates the coordinates of the force equipment
void Coordinates::updateForceEquipment(double newForce, double oldForce){


	// If force is removed/added then delete/create the force equipment
	if (oldForce != 0 && newForce == 0) Coordinates::remove_force_equipment();
	else if ((oldForce == 0 && newForce != 0) || !Coordinates::objectExists("forceArrow1")) Coordinates::add_force_equipment(newForce);



	// If force changes between negative and positive then change the arrows
	else if ( (oldForce > 0 && newForce < 0) || (oldForce < 0 && newForce > 0)){
		Coordinates::remove_force_equipment();
		Coordinates::add_force_equipment(newForce);
	}


}



// Get the arrow size from the force mangitude. Larger forces = larger arrows
double Coordinates::getForceArrowSize(double force){

	double minArrowSize = 25;
	double maxArrowSize = 50;
	double maxForceSize = 40;
	return std::min(std::abs(force) / maxForceSize, 1.0) * (maxArrowSize - minArrowSize) + minArrowSize;
}


// Deletes all HTML coordinate objects which show the optical tweezer setup
void Coordinates::remove_force_equipment(){

	Coordinates::delete_HTMLobj("leftBead");
	Coordinates::delete_HTMLobj("rightBead");
	Coordinates::delete_HTMLobj("tweezer");
	Coordinates::delete_HTMLobj("forceArrow1");
	Coordinates::delete_HTMLobj("forceArrow2");

}


// Create all HTML coordinate objects which show the optical tweezer setup
void Coordinates::add_force_equipment(double force){


	if (force == 0) return;

	// Add the beads
	HTMLobject* pol = Coordinates::getObjectByID("pol");
	double arrowSize = Coordinates::getForceArrowSize(force);
	double firstBaseXpos = Coordinates::TemplateSequenceHTMLObjects.at(1)->getX();
	double finalBaseXpos = Coordinates::TemplateSequenceHTMLObjects.at(Coordinates::TemplateSequenceHTMLObjects.size()-1)->getX();
		

	// Assisting load
	if (force > 0){

		Coordinates::create_HTMLobject("leftBead",  firstBaseXpos - 75, 3, 150, 150, "bead", 0);
		Coordinates::create_HTMLobject("rightBead", pol->getX() + pol->getWidth() - 10, pol->getY() + std::ceil((pol->getHeight() - 150) / 2), 150, 150, "bead", 0);

		// Add the string/tweezers
		Coordinates::create_HTMLobject("tweezer",  pol->getX() + pol->getWidth() + 140 - 10, pol->getY() + 75, finalBaseXpos - pol->getX() - pol->getWidth(), 15, "string", 0);
		
		// Add the arrows
		Coordinates::create_HTMLobject("forceArrow1", pol->getX() + pol->getWidth() + 140 - 10,               pol->getY() + 83 - 0.5*arrowSize, arrowSize, arrowSize, "rightForce", 0);
		Coordinates::create_HTMLobject("forceArrow2", pol->getX() + pol->getWidth() + 140 - 10 + 2*arrowSize, pol->getY() + 83 - 0.5*arrowSize, arrowSize, arrowSize, "rightForce", 0);

	}


	// Hindering load
	else if (force < 0){

		Coordinates::create_HTMLobject("leftBead",  pol->getX()+10 - 140, pol->getY() + std::ceil((pol->getHeight() - 150) / 2), 150, 150, "bead", 0);
		Coordinates::create_HTMLobject("rightBead", finalBaseXpos - 75, 3, 150, 150, "bead", 0);

		// Add the string/tweezers
		double tweezerLength = finalBaseXpos - pol->getWidth() - 130;
		Coordinates::create_HTMLobject("tweezer",  (pol->getX() - 140 + 20) - tweezerLength, pol->getY() + 75, tweezerLength, 15, "string", 0);

		// Add the arrows
		Coordinates::create_HTMLobject("forceArrow1", pol->getX()+10 - 140 + 10 - 1*arrowSize,               pol->getY() + 83 - 0.5*arrowSize, arrowSize, arrowSize, "leftForce", 0);
		Coordinates::create_HTMLobject("forceArrow2", pol->getX()+10 - 140 + 10 - 3*arrowSize, pol->getY() + 83 - 0.5*arrowSize, arrowSize, arrowSize, "leftForce", 0);

	}

}





