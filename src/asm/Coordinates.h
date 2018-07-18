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


#ifndef COORDINATES_H
#define COORDINATES_H


#include "State.h"
#include "HTMLobject.h"
#include "Settings.h"


#include <string>
#include <list>
#include <deque>


// This static class contains functions for generating and managing coordinates for rendering states onto the GUI 
class Coordinates{


	static vector<HTMLobject*> TemplateSequenceHTMLObjects; // All nucleotides in the template sequence and their coordinates etc.
	static deque<HTMLobject*> NascentSequenceHTMLObjects; // All nucleotides in the nascent sequence and their coordinates etc.
	static vector<HTMLobject*> ComplementSequenceHTMLObjects; // All nucleotides in the complement sequence and their coordinates etc.
	static list<HTMLobject*> HTMLobjects; // Other objects and their coordinates etc.

	static list<HTMLobject*> unrenderedObjects; // A subset of the above 4 arrays. Only contains objects which have had a recent change


	// Control the positioning of the optical tweezer animations
	static double getForceArrowSize(double force);
	static void add_force_equipment(double force);
	static void remove_force_equipment();

	public:

		static int getAnimationTime();
		static HTMLobject* getNucleotide(int pos, string whichSeq);

		static void resetToInitialState(); // Sets coordinates to the initial state
		static void clearAllCoordinates(); // Deletes all coordinate objects
		static void generateAllCoordinates(State* state); // Generate all coordinates for this state, and adds the current cooordinates of all objects to the list of unrendered objects (eg. everything has been deleted from DOM and now must be added back)
		static bool objectExists(string id); // See if object exists
		static HTMLobject* getObjectByID(string id);

		// Returns a JSON string which contains information on what changes must be made (eg. on the next animation frame)
		static string getUnrenderedObjectsJSON(bool clearList);


		// Creating objects
		static void create_HTMLobject(string id, double x, double y, double width, double height, string src, int zIndex);
		static void create_pol(double x, double y, string src);
		static void create_nucleotide(int pos, string whichSeq, double x, double y, string baseStr, string src, bool hasTP);
		
		// Move objects (relative to current position)
		static void move_obj(HTMLobject* obj, double dx, double dy);
		static void move_obj_from_id(string id, double dx, double dy);
		static void move_nt(int pos, string whichSeq, double dx, double dy); 

		// Move objects (absolute coordinates specified)
		static void move_obj_absolute(string id, double newX, double newY);
		static bool move_nt_absolute(int pos, string whichSeq, double newX, double newY);  

		// Changing objects
		static void flip_base(int pos, string flipFrom, string flipTo);  
		static void position_bulge(int startBaseNum, int startBaseXVal, int bulgeSize, bool inPrimer, int skip); // Set the coordinates of a bulge of arbitrary size and position
		static void change_src_of_object(HTMLobject* obj, string newSrc);
		static void change_src_of_object_from_id(string id, string newSrc);
		static void set_TP_state(int pos, string whichSeq, bool addTP);
		static void setNucleotideFoldedness(int pos, bool folded);
		static void setFoldAnchorPoint(int pos);
		static void setFoldInitialPositions(int pos, double x, double y);
		static void addBondBetweenNucleotides(int nt1, int nt2, bool basepair);
		static void removeBondBetweenNucleotides(int nt1, int nt2);
		//static void setXYWHsrc(string id, double x, double y, double width, double height, string src);

		// Deleting objects
		static void delete_HTMLobj(string id);
		static void delete_nt(int pos, string whichSeq);


		// Manipulating force equipment coordinates
		static void updateForceEquipment(double newForce);
		static void updateForceEquipment(double newForce, double oldForce);

		static HTMLobject* getHTMLobject(string id);


};

#endif